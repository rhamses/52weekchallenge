import { describe, expect, it, vi } from 'vitest';
import { registerPushSubscriptionOnServer } from './push-client-core';

const subscription = {
	endpoint: 'https://push.example/sub',
	keys: { p256dh: 'abc', auth: 'def' },
};

describe('registerPushSubscriptionOnServer', () => {
	it('returns ok when API responds with 200', async () => {
		const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));

		const result = await registerPushSubscriptionOnServer(subscription, fetchImpl);

		expect(result).toEqual({ ok: true });
		expect(fetchImpl).toHaveBeenCalledWith(
			'/api/devices/register',
			expect.objectContaining({ method: 'POST' }),
		);
	});

	it('returns API error message when registration fails', async () => {
		const fetchImpl = vi.fn(
			async () =>
				new Response(JSON.stringify({ error: 'Device registration failed' }), { status: 500 }),
		);

		const result = await registerPushSubscriptionOnServer(subscription, fetchImpl);

		expect(result).toEqual({ ok: false, error: 'Device registration failed' });
	});
});
