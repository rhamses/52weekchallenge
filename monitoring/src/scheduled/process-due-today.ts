import { sendEmail } from '../dispatch/email';
import { sendPush } from '../dispatch/push';
import type { Env } from '../env';
import { buildReminderContent } from '../lib/reminder-content';
import {
	buildDedupKey,
	fetchDueTodayPeriods,
	fetchOverduePeriodsForGoal,
	insertInAppNotification,
	notificationExists,
	todayUtcIso,
} from '../lib/queries';

export interface ProcessDueTodayDeps {
	sendEmail: typeof sendEmail;
	sendPush: typeof sendPush;
	randomUUID: () => string;
}

const defaultDeps: ProcessDueTodayDeps = {
	sendEmail,
	sendPush,
	randomUUID: () => crypto.randomUUID(),
};

export interface ProcessDueTodayResult {
	processed: number;
	skipped: number;
}

export async function processDueToday(
	env: Env,
	deps: ProcessDueTodayDeps = defaultDeps,
): Promise<ProcessDueTodayResult> {
	const today = todayUtcIso();
	const dueToday = await fetchDueTodayPeriods(env.DB, today);
	console.log(`Monitoring: found ${dueToday.length} periods due today`);

	let processed = 0;
	let skipped = 0;

	for (const row of dueToday) {
		const dedupKey = buildDedupKey(row.user_id, row.period_id, today);

		if (await notificationExists(env.DB, dedupKey)) {
			skipped++;
			continue;
		}

		const overdue = await fetchOverduePeriodsForGoal(
			env.DB,
			row.goal_id,
			today,
			row.period_id,
		);
		const content = buildReminderContent(row, overdue);

		await insertInAppNotification(env.DB, {
			id: deps.randomUUID(),
			userId: row.user_id,
			goalId: row.goal_id,
			title: content.inAppTitle,
			body: content.inAppBody,
			dedupKey,
		});

		await deps.sendEmail(env, row.user_email, content.emailSubject, content.emailHtml);
		await deps.sendPush(env, row.user_id, {
			title: content.pushTitle,
			body: content.pushBody,
			goalId: content.goalId,
		});

		processed++;
	}

	return { processed, skipped };
}
