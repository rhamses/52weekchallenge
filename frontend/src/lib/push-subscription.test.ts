import { describe, expect, it } from 'vitest';
import { isValidPushSubscription } from './push-subscription';

describe('isValidPushSubscription', () => {
	it('accepts a valid subscription payload', () => {
		expect(
			isValidPushSubscription({
				endpoint: 'https://push.example/abc',
				keys: { p256dh: 'key', auth: 'auth' },
			}),
		).toBe(true);
	});

	it('rejects missing endpoint', () => {
		expect(isValidPushSubscription({ endpoint: '', keys: { p256dh: 'k', auth: 'a' } })).toBe(
			false,
		);
	});

	it('rejects missing keys', () => {
		expect(isValidPushSubscription({ endpoint: 'https://push.example' })).toBe(false);
	});
});
