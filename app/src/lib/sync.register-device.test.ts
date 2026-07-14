import { describe, expect, it } from 'vitest';
import { registerDevice } from './sync';
import { createMockD1 } from '../test/mock-d1';

const subscription = JSON.stringify({
	endpoint: 'https://push.example/device-1',
	keys: { p256dh: 'abc', auth: 'def' },
});

describe('registerDevice', () => {
	it('inserts a web device with push subscription', async () => {
		const inserts: unknown[][] = [];
		const db = createMockD1([
			{
				match: /push_subscription = \?/,
				handle: () => null,
			},
			{
				match: /DELETE FROM f2w_user_devices/,
				handle: () => ({ success: true }),
			},
			{
				match: /INSERT INTO f2w_user_devices/,
				handle: (binds) => {
					inserts.push(binds);
					return { success: true };
				},
			},
		]);

		await registerDevice({ DB: db }, 'user-1', {
			platform: 'web',
			push_subscription: subscription,
		});

		expect(inserts).toHaveLength(1);
		expect(inserts[0]?.[1]).toBe('user-1');
		expect(inserts[0]?.[2]).toBe('https://push.example/device-1');
		expect(inserts[0]?.[3]).toBe(subscription);
	});

	it('skips insert when the same subscription already exists', async () => {
		let insertCount = 0;
		const db = createMockD1([
			{
				match: /push_subscription = \?/,
				handle: () => ({ id: 'existing' }),
			},
			{
				match: /INSERT INTO f2w_user_devices/,
				handle: () => {
					insertCount++;
					return { success: true };
				},
			},
		]);

		await registerDevice({ DB: db }, 'user-1', {
			platform: 'web',
			push_subscription: subscription,
		});

		expect(insertCount).toBe(0);
	});

	it('throws when push subscription JSON is invalid', async () => {
		const db = createMockD1([
			{
				match: /push_subscription = \?/,
				handle: () => null,
			},
		]);

		await expect(
			registerDevice({ DB: db }, 'user-1', {
				platform: 'web',
				push_subscription: 'not-json',
			}),
		).rejects.toThrow('Invalid push subscription JSON');
	});
});
