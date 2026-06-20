import { describe, expect, it } from 'vitest';
import { buildReminderContent } from './reminder-content';
import type { DueTodayRow } from './queries';

const dueTodayRow: DueTodayRow = {
	period_id: 'period-1',
	period_index: 5,
	due_date: '2026-06-20',
	amount_cents: 2500,
	goal_id: 'goal-1',
	goal_title: 'Emergency Fund',
	user_id: 'user-1',
	user_email: 'user@example.com',
	user_name: 'Jane',
};

describe('buildReminderContent', () => {
	it('builds due-today email without overdue section when none exist', () => {
		const content = buildReminderContent(dueTodayRow, []);

		expect(content.emailSubject).toBe('Savings reminder: Emergency Fund');
		expect(content.emailHtml).toContain('Hi Jane,');
		expect(content.emailHtml).toContain('is due today');
		expect(content.emailHtml).toContain('2026-06-20');
		expect(content.emailHtml).not.toContain('Overdue periods');
		expect(content.inAppTitle).toBe('Reminder: Emergency Fund');
		expect(content.inAppBody).toContain('Period 5 is due today (2026-06-20).');
		expect(content.inAppBody).not.toContain('overdue period');
		expect(content.pushTitle).toBe(content.inAppTitle);
		expect(content.pushBody).toBe(content.inAppBody);
		expect(content.goalId).toBe('goal-1');
	});

	it('includes overdue table in email and summary in in-app body', () => {
		const content = buildReminderContent(dueTodayRow, [
			{ period_index: 3, due_date: '2026-06-06', amount_cents: 1500 },
			{ period_index: 4, due_date: '2026-06-13', amount_cents: 2000 },
		]);

		expect(content.emailHtml).toContain('Overdue periods');
		expect(content.emailHtml).toContain('2026-06-06');
		expect(content.emailHtml).toContain('2026-06-13');
		expect(content.inAppBody).toContain('You also have 2 overdue periods.');
	});

	it('falls back to email when user name is missing', () => {
		const content = buildReminderContent({ ...dueTodayRow, user_name: null }, []);
		expect(content.emailHtml).toContain('Hi user@example.com,');
	});
});
