export interface PushSubscriptionJSON {
	endpoint: string;
	expirationTime?: number | null;
	keys: {
		p256dh: string;
		auth: string;
	};
}

export function isValidPushSubscription(sub: unknown): sub is PushSubscriptionJSON {
	if (!sub || typeof sub !== 'object') return false;
	const s = sub as PushSubscriptionJSON;
	return (
		typeof s.endpoint === 'string' &&
		s.endpoint.length > 0 &&
		typeof s.keys?.p256dh === 'string' &&
		typeof s.keys?.auth === 'string'
	);
}
