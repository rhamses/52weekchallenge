import type { PushSubscriptionJSON } from './push-subscription';

export const VAPID_STORAGE_KEY = 'f2w_vapid_public_key';

export interface PushRegisterResult {
	ok: boolean;
	error?: string;
}

export async function registerPushSubscriptionOnServer(
	subscription: PushSubscriptionJSON,
	fetchImpl: typeof fetch = fetch,
): Promise<PushRegisterResult> {
	const res = await fetchImpl('/api/devices/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify({
			platform: 'web',
			push_subscription: subscription,
		}),
	});

	if (res.ok) return { ok: true };

	let error = 'register_failed';
	try {
		const body = (await res.json()) as { error?: string };
		if (body.error) error = body.error;
	} catch {
		/* ignore */
	}

	return { ok: false, error };
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(base64);
	const arr = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
	return arr;
}

export async function ensurePushSubscription(
	registration: ServiceWorkerRegistration,
	vapidKey: string,
	storedVapidKey: string | null,
): Promise<PushSubscription> {
	let subscription = await registration.pushManager.getSubscription();
	const vapidChanged = storedVapidKey !== null && storedVapidKey !== vapidKey;

	if (subscription && vapidChanged) {
		await subscription.unsubscribe();
		subscription = null;
	}

	if (!subscription) {
		subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(vapidKey),
		});
	}

	return subscription;
}
