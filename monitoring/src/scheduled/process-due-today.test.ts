import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../env';
import { processDueToday } from '../scheduled/process-due-today';
import { createMockD1 } from '../test/mock-d1';

const dueTodayRow = {
	period_id: 'period-today',
	period_index: 3,
	due_date: '2026-06-20',
	amount_cents: 1000,
	goal_id: 'goal-1',
	goal_title: 'Trip',
	user_id: 'user-1',
	user_email: 'user@example.com',
	user_name: 'Alex',
};

function createEnv(options: {
	dueToday?: typeof dueTodayRow[];
	overdue?: Array<{ period_index: number; due_date: string; amount_cents: number }>;
	existingDedup?: boolean;
	devices?: Array<{
		platform: string;
		push_subscription: string | null;
	}>;
}): Env {
	const db = createMockD1([
		{
			match: /due_date = \?/,
			handle: () => ({ results: options.dueToday ?? [] }),
		},
		{
			match: /due_date < \?/,
			handle: () => ({ results: options.overdue ?? [] }),
		},
		{
			match: /f2w_notifications WHERE dedup_key/,
			handle: () => (options.existingDedup ? { id: 'existing' } : null),
		},
		{
			match: /INSERT INTO f2w_notifications/,
			handle: () => ({ success: true }),
		},
		{
			match: /f2w_user_devices WHERE user_id/,
			handle: () => ({ results: options.devices ?? [] }),
		},
	]);

	return {
		DB: db,
		AWS_REGION: 'us-east-1',
		AWS_ACCESS_KEY_ID: 'key',
		AWS_SECRET_ACCESS_KEY: 'secret',
		SES_FROM_EMAIL: 'noreply@example.com',
		VAPID_PUBLIC_KEY: 'public',
		VAPID_PRIVATE_KEY: 'private',
		VAPID_SUBJECT: 'mailto:test@example.com',
	};
}

describe('processDueToday', () => {
	const sendEmail = vi.fn(async () => {});
	const sendPush = vi.fn(async () => {});
	const randomUUID = vi.fn(() => 'notif-uuid');

	beforeEach(() => {
		sendEmail.mockClear();
		sendPush.mockClear();
		randomUUID.mockClear();
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-06-20T00:30:00.000Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('sends email and push for a period due today', async () => {
		const env = createEnv({
			dueToday: [dueTodayRow],
			devices: [
				{
					platform: 'web',
					push_subscription: JSON.stringify({ endpoint: 'https://push.test', keys: {} }),
				},
			],
		});

		const result = await processDueToday(env, { sendEmail, sendPush, randomUUID });

		expect(result).toEqual({ processed: 1, skipped: 0 });
		expect(sendEmail).toHaveBeenCalledTimes(1);
		expect(sendEmail).toHaveBeenCalledWith(
			env,
			'user@example.com',
			'Savings reminder: Trip',
			expect.stringContaining('is due today'),
		);
		expect(sendPush).toHaveBeenCalledTimes(1);
		expect(sendPush).toHaveBeenCalledWith(
			env,
			'user-1',
			expect.objectContaining({
				title: 'Reminder: Trip',
				goalId: 'goal-1',
			}),
		);
		expect(randomUUID).toHaveBeenCalledTimes(1);
	});

	it('skips when dedup key already exists', async () => {
		const env = createEnv({
			dueToday: [dueTodayRow],
			existingDedup: true,
		});

		const result = await processDueToday(env, { sendEmail, sendPush, randomUUID });

		expect(result).toEqual({ processed: 0, skipped: 1 });
		expect(sendEmail).not.toHaveBeenCalled();
		expect(sendPush).not.toHaveBeenCalled();
	});

	it('does nothing when no periods are due today', async () => {
		const env = createEnv({ dueToday: [] });

		const result = await processDueToday(env, { sendEmail, sendPush, randomUUID });

		expect(result).toEqual({ processed: 0, skipped: 0 });
		expect(sendEmail).not.toHaveBeenCalled();
		expect(sendPush).not.toHaveBeenCalled();
	});
});
