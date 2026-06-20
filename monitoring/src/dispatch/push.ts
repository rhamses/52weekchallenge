import type { Env } from '../env';
import { renderTemplate } from '../lib/render-template';
import pushTemplate from '../templates/reminder-push';
import { sendWebPush, type PushSubscriptionJSON } from '../web-push';

export interface PushPayload {
	title: string;
	body: string;
	goalId: string;
}

export async function sendPush(env: Env, userId: string, payload: PushPayload): Promise<void> {
	const { results } = await env.DB.prepare(
		`SELECT platform, sns_endpoint_arn, push_subscription FROM f2w_user_devices WHERE user_id = ?`,
	)
		.bind(userId)
		.all<{
			platform: string;
			sns_endpoint_arn: string;
			push_subscription: string | null;
		}>();

	if (!results?.length) return;

	for (const device of results) {
		if (device.platform === 'web' && device.push_subscription) {
			try {
				const subscription = JSON.parse(device.push_subscription) as PushSubscriptionJSON;
				await sendWebPush(env, subscription, payload);
			} catch (err) {
				console.error('Web push failed', err);
			}
			continue;
		}

		if (device.platform !== 'web' && device.sns_endpoint_arn && env.SNS_PLATFORM_ARN) {
			await sendViaSns(env, device.sns_endpoint_arn, payload);
		}
	}
}

async function sendViaSns(env: Env, endpointArn: string, payload: PushPayload): Promise<void> {
	if (!env.AWS_ACCESS_KEY_ID) return;

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

	await client.send(
		new PublishCommand({
			TargetArn: endpointArn,
			Message: message,
			MessageStructure: 'json',
		}),
	);
}
