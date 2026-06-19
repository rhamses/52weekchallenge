import webpush from 'web-push';

export interface PushSubscriptionJSON {
	endpoint: string;
	expirationTime?: number | null;
	keys: {
		p256dh: string;
		auth: string;
	};
}

export interface WebPushPayload {
	title: string;
	body: string;
	goalId?: string;
	url?: string;
}

export interface VapidEnv {
	VAPID_PUBLIC_KEY: string;
	VAPID_PRIVATE_KEY: string;
	VAPID_SUBJECT: string;
}

export async function sendWebPush(
	env: VapidEnv,
	subscription: PushSubscriptionJSON,
	payload: WebPushPayload,
): Promise<void> {
	if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY) return;

	webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

	const body = JSON.stringify({
		title: payload.title,
		body: payload.body,
		goalId: payload.goalId ?? null,
		url: payload.url ?? (payload.goalId ? `/goals/${payload.goalId}` : '/notifications'),
	});

	await webpush.sendNotification(subscription, body);
}
