import { describe, expect, it } from 'vitest';
import { buildDedupKey } from './queries';

describe('buildDedupKey', () => {
	it('builds a stable dedup key per user, period, and day', () => {
		expect(buildDedupKey('user-1', 'period-1', '2026-06-20')).toBe(
			'reminder:user-1:period-1:2026-06-20',
		);
	});
});
