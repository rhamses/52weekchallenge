import type { Env } from './types';

const TTL_GOALS = 300;
const TTL_GOAL = 300;
const TTL_PERIODS = 300;
const TTL_NOTIFICATIONS = 120;

export function kvGoalsKey(userId: string): string {
	return `f2w:user:${userId}:goals`;
}

export function kvGoalKey(goalId: string): string {
	return `f2w:goal:${goalId}`;
}

export function kvGoalPeriodsKey(goalId: string): string {
	return `f2w:goal:${goalId}:periods`;
}

export function kvNotificationsKey(userId: string): string {
	return `f2w:user:${userId}:notifications`;
}

export async function cacheGet<T>(cache: KVNamespace, key: string): Promise<T | null> {
	const raw = await cache.get(key, 'json');
	return raw as T | null;
}

export async function cacheSet(
	cache: KVNamespace,
	key: string,
	value: unknown,
	ttlSeconds: number,
): Promise<void> {
	await cache.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
}

export async function cacheDelete(cache: KVNamespace, key: string): Promise<void> {
	await cache.delete(key);
}

export async function invalidateUserGoals(cache: KVNamespace, userId: string): Promise<void> {
	await cacheDelete(cache, kvGoalsKey(userId));
}

export async function invalidateGoal(cache: KVNamespace, goalId: string): Promise<void> {
	await Promise.all([
		cacheDelete(cache, kvGoalKey(goalId)),
		cacheDelete(cache, kvGoalPeriodsKey(goalId)),
	]);
}

export async function invalidateUserNotifications(
	cache: KVNamespace,
	userId: string,
): Promise<void> {
	await cacheDelete(cache, kvNotificationsKey(userId));
}

export async function invalidateAllForGoal(
	env: Pick<Env, 'CACHE'>,
	goalId: string,
	userId: string,
): Promise<void> {
	await Promise.all([
		invalidateGoal(env.CACHE, goalId),
		invalidateUserGoals(env.CACHE, userId),
		invalidateUserNotifications(env.CACHE, userId),
	]);
}

export { TTL_GOALS, TTL_GOAL, TTL_PERIODS, TTL_NOTIFICATIONS };
