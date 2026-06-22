import type { Env } from '../env';
import { sendWebPush, type PushSubscriptionJSON } from '../web-push';

export interface PushPayload {
	title: string;
	body: string;
	goalId: string;
}

export async function sendPush(env: Env, userId: string, payload: PushPayload): Promise<void> {
	const { results } = await env.DB.prepare(
		`SELECT platform, push_subscription FROM f2w_user_devices WHERE user_id = ?`,
	)
		.bind(userId)
		.all<{
			platform: string;
			push_subscription: string | null;
		}>();

	if (!results?.length) return;

	for (const device of results) {
		if (device.platform !== 'web' || !device.push_subscription) continue;

		try {
			const subscription = JSON.parse(device.push_subscription) as PushSubscriptionJSON;
			await sendWebPush(env, subscription, payload);
		} catch (err) {
			console.error('Web push failed', err);
		}
	}
}
