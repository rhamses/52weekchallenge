import { buildOverdueTableHtml, formatOverdueSummary } from './overdue-table';
import { renderTemplate } from './render-template';
import type { DueTodayRow, OverduePeriodRow } from './queries';
import reminderEmailSubjectTemplate from '../templates/reminder-email-subject';
import reminderEmailTemplate from '../templates/reminder-email';
import reminderInAppTemplate from '../templates/reminder-in-app';

export interface ReminderContent {
	emailSubject: string;
	emailHtml: string;
	inAppTitle: string;
	inAppBody: string;
	pushTitle: string;
	pushBody: string;
	goalId: string;
}

export function buildReminderContent(
	row: DueTodayRow,
	overdue: OverduePeriodRow[],
): ReminderContent {
	const userName = row.user_name ?? row.user_email;
	const overdueTable = buildOverdueTableHtml(overdue);
	const overdueSummary = formatOverdueSummary(overdue);

	const vars: Record<string, string> = {
		userName,
		goalTitle: row.goal_title,
		periodIndex: String(row.period_index),
		dueDate: row.due_date,
		overdueTable,
		overdueSummary,
		goalId: row.goal_id,
	};

	const inAppTitle = renderTemplate(reminderInAppTemplate.title, vars);
	const inAppBody = renderTemplate(reminderInAppTemplate.body, vars);

	return {
		emailSubject: renderTemplate(reminderEmailSubjectTemplate, vars),
		emailHtml: renderTemplate(reminderEmailTemplate, vars),
		inAppTitle,
		inAppBody,
		pushTitle: inAppTitle,
		pushBody: inAppBody,
		goalId: row.goal_id,
	};
}
