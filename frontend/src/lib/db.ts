import type { Goal, GoalPeriod, GoalWithProgress, Notification, User } from './types';
import { progressPercent } from './calculations';
import {
	cacheGet,
	cacheSet,
	kvGoalKey,
	kvGoalsKey,
	kvNotificationsKey,
	TTL_GOAL,
	TTL_GOALS,
	TTL_NOTIFICATIONS,
} from './kv';

export async function getUserById(db: D1Database, userId: string): Promise<User | null> {
	const row = await db
		.prepare(
			`SELECT id, cognito_sub, email, name, avatar_url, locale, default_currency
       FROM f2w_users WHERE id = ?`,
		)
		.bind(userId)
		.first<User>();
	return row ?? null;
}

export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
	const row = await db
		.prepare(
			`SELECT id, cognito_sub, email, name, avatar_url, locale, default_currency
       FROM f2w_users WHERE email = ?`,
		)
		.bind(email)
		.first<User>();
	return row ?? null;
}

export async function upsertUser(
	db: D1Database,
	data: {
		id: string;
		cognito_sub: string | null;
		email: string;
		name: string | null;
		avatar_url: string | null;
		locale?: string;
	},
): Promise<User> {
	await db
		.prepare(
			`INSERT INTO f2w_users (id, cognito_sub, email, name, avatar_url, locale, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(email) DO UPDATE SET
         cognito_sub = excluded.cognito_sub,
         name = excluded.name,
         avatar_url = excluded.avatar_url,
         updated_at = datetime('now')`,
		)
		.bind(
			data.id,
			data.cognito_sub,
			data.email,
			data.name,
			data.avatar_url,
			data.locale ?? 'en-US',
		)
		.run();

	const user = await getUserByEmail(db, data.email);
	if (!user) throw new Error('Failed to upsert user');
	return user;
}

function mapGoalWithProgress(goal: Goal): GoalWithProgress {
	return {
		...goal,
		progress_percent: progressPercent(goal.saved_amount_cents, goal.target_amount_cents),
	};
}

export async function listGoalsForUser(
	db: D1Database,
	cache: KVNamespace,
	userId: string,
): Promise<GoalWithProgress[]> {
	const cached = await cacheGet<GoalWithProgress[]>(cache, kvGoalsKey(userId));
	if (cached) return cached;

	const { results } = await db
		.prepare(
			`SELECT * FROM f2w_goals WHERE user_id = ? AND status != 'archived' ORDER BY created_at DESC`,
		)
		.bind(userId)
		.all<Goal>();

	const goals = (results ?? []).map(mapGoalWithProgress);
	await cacheSet(cache, kvGoalsKey(userId), goals, TTL_GOALS);
	return goals;
}

export async function getGoalById(
	db: D1Database,
	cache: KVNamespace,
	goalId: string,
	userId: string,
): Promise<Goal | null> {
	const cached = await cacheGet<Goal>(cache, kvGoalKey(goalId));
	if (cached && cached.user_id === userId) return cached;

	const row = await db
		.prepare(`SELECT * FROM f2w_goals WHERE id = ? AND user_id = ?`)
		.bind(goalId, userId)
		.first<Goal>();

	if (row) await cacheSet(cache, kvGoalKey(goalId), row, TTL_GOAL);
	return row ?? null;
}

export async function getGoalPeriods(db: D1Database, goalId: string): Promise<GoalPeriod[]> {
	const { results } = await db
		.prepare(
			`SELECT p.*, d.note, d.id as deposit_id
       FROM f2w_goal_periods p
       LEFT JOIN f2w_deposits d ON d.period_id = p.id
       WHERE p.goal_id = ?
       ORDER BY p.period_index ASC`,
		)
		.bind(goalId)
		.all<GoalPeriod>();

	return results ?? [];
}

export async function listNotifications(
	db: D1Database,
	cache: KVNamespace,
	userId: string,
): Promise<Notification[]> {
	const cached = await cacheGet<Notification[]>(cache, kvNotificationsKey(userId));
	if (cached) return cached;

	const { results } = await db
		.prepare(
			`SELECT * FROM f2w_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
		)
		.bind(userId)
		.all<Notification>();

	const items = results ?? [];
	await cacheSet(cache, kvNotificationsKey(userId), items, TTL_NOTIFICATIONS);
	return items;
}

export async function countUnreadNotifications(
	db: D1Database,
	userId: string,
): Promise<number> {
	const row = await db
		.prepare(
			`SELECT COUNT(*) as count FROM f2w_notifications WHERE user_id = ? AND read_at IS NULL`,
		)
		.bind(userId)
		.first<{ count: number }>();
	return row?.count ?? 0;
}
