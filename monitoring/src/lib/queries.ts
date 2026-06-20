export interface DueTodayRow {
	period_id: string;
	period_index: number;
	due_date: string;
	amount_cents: number;
	goal_id: string;
	goal_title: string;
	user_id: string;
	user_email: string;
	user_name: string | null;
}

export interface OverduePeriodRow {
	period_index: number;
	due_date: string;
	amount_cents: number;
}

export function todayUtcIso(): string {
	return new Date().toISOString().slice(0, 10);
}

export function buildDedupKey(userId: string, periodId: string, today: string): string {
	return `reminder:${userId}:${periodId}:${today}`;
}

export async function fetchDueTodayPeriods(db: D1Database, today: string): Promise<DueTodayRow[]> {
	const { results } = await db
		.prepare(
			`SELECT p.id as period_id, p.period_index, p.due_date, p.amount_cents,
              g.id as goal_id, g.title as goal_title,
              u.id as user_id, u.email as user_email, u.name as user_name
       FROM f2w_goal_periods p
       JOIN f2w_goals g ON g.id = p.goal_id
       JOIN f2w_users u ON u.id = g.user_id
       WHERE p.status = 'pending'
         AND p.due_date = ?
         AND g.status = 'active'
         AND g.saved_amount_cents < g.target_amount_cents`,
		)
		.bind(today)
		.all<DueTodayRow>();

	return results ?? [];
}

export async function fetchOverduePeriodsForGoal(
	db: D1Database,
	goalId: string,
	today: string,
	excludePeriodId: string,
): Promise<OverduePeriodRow[]> {
	const { results } = await db
		.prepare(
			`SELECT period_index, due_date, amount_cents
       FROM f2w_goal_periods
       WHERE goal_id = ?
         AND status = 'pending'
         AND due_date < ?
         AND id != ?`,
		)
		.bind(goalId, today, excludePeriodId)
		.all<OverduePeriodRow>();

	return results ?? [];
}

export async function notificationExists(db: D1Database, dedupKey: string): Promise<boolean> {
	const existing = await db
		.prepare(`SELECT id FROM f2w_notifications WHERE dedup_key = ?`)
		.bind(dedupKey)
		.first();

	return !!existing;
}

export async function insertInAppNotification(
	db: D1Database,
	params: {
		id: string;
		userId: string;
		goalId: string;
		title: string;
		body: string;
		dedupKey: string;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO f2w_notifications (id, user_id, goal_id, type, title, body, dedup_key)
       VALUES (?, ?, ?, 'reminder', ?, ?, ?)`,
		)
		.bind(
			params.id,
			params.userId,
			params.goalId,
			params.title,
			params.body,
			params.dedupKey,
		)
		.run();
}
