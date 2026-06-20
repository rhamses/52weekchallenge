import webpush from 'web-push';
import { renderTemplate } from './lib/render-template';
import reminderWebPushTemplate from './templates/reminder-web-push';

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

	const templateVars: Record<string, string> = {
		title: payload.title,
		body: payload.body,
		goalId: payload.goalId ?? '',
	};

	const rendered = {
		title: renderTemplate(reminderWebPushTemplate.title, templateVars),
		body: renderTemplate(reminderWebPushTemplate.body, templateVars),
		goalId: renderTemplate(reminderWebPushTemplate.goalId, templateVars),
		url: payload.url ?? renderTemplate(reminderWebPushTemplate.url, templateVars),
	};

	await webpush.sendNotification(subscription, JSON.stringify(rendered));
}
