export interface Env {
	DB: D1Database;
	AWS_REGION: string;
	AWS_ACCESS_KEY_ID: string;
	AWS_SECRET_ACCESS_KEY: string;
	SES_FROM_EMAIL: string;
	SNS_PLATFORM_ARN: string;
}

interface OverdueRow {
	period_id: string;
	period_index: number;
	due_date: string;
	goal_id: string;
	goal_title: string;
	user_id: string;
	user_email: string;
	user_name: string | null;
}

import reminderEmailTemplate from './templates/reminder-email';
import pushTemplate from './templates/reminder-push';

function renderTemplate(template: string, vars: Record<string, string>): string {
	let out = template;
	for (const [key, value] of Object.entries(vars)) {
		out = out.replaceAll(`{{${key}}}`, value);
	}
	return out;
}

export default {
	async scheduled(_controller: ScheduledController, env: Env, _ctx: ExecutionContext) {
		const today = new Date().toISOString().slice(0, 10);

		const { results } = await env.DB.prepare(
			`SELECT p.id as period_id, p.period_index, p.due_date,
              g.id as goal_id, g.title as goal_title,
              u.id as user_id, u.email as user_email, u.name as user_name
       FROM f2w_goal_periods p
       JOIN f2w_goals g ON g.id = p.goal_id
       JOIN f2w_users u ON u.id = g.user_id
       WHERE p.status = 'pending'
         AND p.due_date < ?
         AND g.status = 'active'
         AND g.saved_amount_cents < g.target_amount_cents`,
		)
			.bind(today)
			.all<OverdueRow>();

		const overdue = results ?? [];
		console.log(`Monitoring: found ${overdue.length} overdue periods`);

		for (const row of overdue) {
			const dedupKey = `reminder:${row.user_id}:${row.period_id}:${today}`;

			const existing = await env.DB.prepare(
				`SELECT id FROM f2w_notifications WHERE dedup_key = ?`,
			)
				.bind(dedupKey)
				.first();

			if (existing) continue;

			const title = `Reminder: ${row.goal_title}`;
			const body = `Period ${row.period_index} was due on ${row.due_date}. Don't forget your deposit!`;
			const notifId = crypto.randomUUID();

			await env.DB.prepare(
				`INSERT INTO f2w_notifications (id, user_id, goal_id, type, title, body, dedup_key)
         VALUES (?, ?, ?, 'reminder', ?, ?, ?)`,
			)
				.bind(notifId, row.user_id, row.goal_id, title, body, dedupKey)
				.run();

			const emailHtml = renderTemplate(reminderEmailTemplate, {
				userName: row.user_name ?? row.user_email,
				goalTitle: row.goal_title,
				periodIndex: String(row.period_index),
				dueDate: row.due_date,
			});

			await sendEmail(env, row.user_email, `Savings reminder: ${row.goal_title}`, emailHtml);
			await sendPush(env, row.user_id, {
				title,
				body,
				goalId: row.goal_id,
			});
		}
	},
};

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
	if (!env.AWS_ACCESS_KEY_ID || !env.SES_FROM_EMAIL) {
		console.warn('SES not configured');
		return;
	}

	const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');
	const client = new SESClient({
		region: env.AWS_REGION,
		credentials: {
			accessKeyId: env.AWS_ACCESS_KEY_ID,
			secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		},
	});

	await client.send(
		new SendEmailCommand({
			Source: env.SES_FROM_EMAIL,
			Destination: { ToAddresses: [to] },
			Message: {
				Subject: { Data: subject },
				Body: { Html: { Data: html } },
			},
		}),
	);
}

async function sendPush(
	env: Env,
	userId: string,
	payload: { title: string; body: string; goalId: string },
): Promise<void> {
	if (!env.AWS_ACCESS_KEY_ID || !env.SNS_PLATFORM_ARN) return;

	const { results } = await env.DB.prepare(
		`SELECT sns_endpoint_arn FROM f2w_user_devices WHERE user_id = ?`,
	)
		.bind(userId)
		.all<{ sns_endpoint_arn: string }>();

	if (!results?.length) return;

	const { SNSClient, PublishCommand } = await import('@aws-sdk/client-sns');
	const client = new SNSClient({
		region: env.AWS_REGION,
		credentials: {
			accessKeyId: env.AWS_ACCESS_KEY_ID,
			secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
		},
	});

	const message = renderTemplate(JSON.stringify(pushTemplate), {
		title: payload.title,
		body: payload.body,
		goalId: payload.goalId,
	});

	for (const device of results) {
		await client.send(
			new PublishCommand({
				TargetArn: device.sns_endpoint_arn,
				Message: message,
				MessageStructure: 'json',
			}),
		);
	}
}
