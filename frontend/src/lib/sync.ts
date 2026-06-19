import type { DraftGoal, Env, Goal, GoalPeriod } from './types';
import {
	calculateInstallmentPlan,
	generateId,
	generatePeriodDueDates,
} from './calculations';
import { invalidateAllForGoal } from './kv';

export interface CreateGoalInput extends DraftGoal {
	user_id: string;
}

export async function createGoalWithPeriods(
	env: Pick<Env, 'DB' | 'CACHE'>,
	input: CreateGoalInput,
): Promise<{ goal: Goal; periods: GoalPeriod[] }> {
	const plan = calculateInstallmentPlan(
		input.target_amount_cents,
		input.savings_mode,
		input.use_custom_deadline ? input.deadline_date : null,
	);

	const goalId = generateId();
	const now = new Date().toISOString();
	const startDate = new Date();
	const dueDates = generatePeriodDueDates(startDate, plan.period_count, plan.period_type);

	await env.DB.prepare(
		`INSERT INTO f2w_goals (
      id, user_id, title, target_amount_cents, currency_code, savings_mode,
      deadline_date, period_count, installment_cents, saved_amount_cents, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?)`,
	)
		.bind(
			goalId,
			input.user_id,
			input.title,
			input.target_amount_cents,
			input.currency_code,
			input.savings_mode,
			input.use_custom_deadline ? input.deadline_date : null,
			plan.period_count,
			plan.installment_cents,
			now,
			now,
		)
		.run();

	const periods: GoalPeriod[] = [];
	const stmts = dueDates.map((dueDate, index) => {
		const periodId = generateId();
		periods.push({
			id: periodId,
			goal_id: goalId,
			period_index: index + 1,
			period_type: plan.period_type,
			due_date: dueDate,
			amount_cents: plan.installment_cents,
			status: 'pending',
			completed_at: null,
		});

		return env.DB.prepare(
			`INSERT INTO f2w_goal_periods (id, goal_id, period_index, period_type, due_date, amount_cents, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
		).bind(periodId, goalId, index + 1, plan.period_type, dueDate, plan.installment_cents);
	});

	await env.DB.batch(stmts);

	const goal = await env.DB.prepare(`SELECT * FROM f2w_goals WHERE id = ?`)
		.bind(goalId)
		.first<Goal>();

	if (!goal) throw new Error('Goal creation failed');

	await invalidateAllForGoal(env, goalId, input.user_id);

	return { goal, periods };
}

export async function recordDeposit(
	env: Pick<Env, 'DB' | 'CACHE'>,
	params: {
		userId: string;
		goalId: string;
		periodId: string;
		amountCents: number;
		note?: string;
	},
): Promise<{ isFirstDeposit: boolean }> {
	const period = await env.DB.prepare(
		`SELECT p.*, g.user_id, g.saved_amount_cents
     FROM f2w_goal_periods p
     JOIN f2w_goals g ON g.id = p.goal_id
     WHERE p.id = ? AND g.id = ? AND g.user_id = ?`,
	)
		.bind(params.periodId, params.goalId, params.userId)
		.first<GoalPeriod & { user_id: string; saved_amount_cents: number }>();

	if (!period) throw new Error('Period not found');
	if (period.status === 'completed') throw new Error('Already deposited');

	const depositCount = await env.DB.prepare(
		`SELECT COUNT(*) as count FROM f2w_deposits d
     JOIN f2w_goals g ON g.id = d.goal_id WHERE g.user_id = ?`,
	)
		.bind(params.userId)
		.first<{ count: number }>();

	const isFirstDeposit = (depositCount?.count ?? 0) === 0;
	const depositId = generateId();
	const now = new Date().toISOString();

	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO f2w_deposits (id, goal_id, period_id, amount_cents, note, deposited_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
		).bind(
			depositId,
			params.goalId,
			params.periodId,
			params.amountCents,
			params.note ?? null,
			now,
		),
		env.DB.prepare(
			`UPDATE f2w_goal_periods SET status = 'completed', completed_at = ? WHERE id = ?`,
		).bind(now, params.periodId),
		env.DB.prepare(
			`UPDATE f2w_goals SET saved_amount_cents = saved_amount_cents + ?, updated_at = ? WHERE id = ?`,
		).bind(params.amountCents, now, params.goalId),
	]);

	const goal = await env.DB.prepare(`SELECT * FROM f2w_goals WHERE id = ?`)
		.bind(params.goalId)
		.first<Goal>();

	if (goal && goal.saved_amount_cents >= goal.target_amount_cents) {
		await env.DB.prepare(`UPDATE f2w_goals SET status = 'completed' WHERE id = ?`)
			.bind(params.goalId)
			.run();
	}

	await invalidateAllForGoal(env, params.goalId, params.userId);
	return { isFirstDeposit };
}

export async function removeDeposit(
	env: Pick<Env, 'DB' | 'CACHE'>,
	params: { userId: string; goalId: string; periodId: string },
): Promise<void> {
	const deposit = await env.DB.prepare(
		`SELECT d.*, g.user_id FROM f2w_deposits d
     JOIN f2w_goals g ON g.id = d.goal_id
     WHERE d.period_id = ? AND g.id = ? AND g.user_id = ?`,
	)
		.bind(params.periodId, params.goalId, params.userId)
		.first<{ id: string; amount_cents: number; user_id: string }>();

	if (!deposit) throw new Error('Deposit not found');

	const now = new Date().toISOString();

	await env.DB.batch([
		env.DB.prepare(`DELETE FROM f2w_deposits WHERE id = ?`).bind(deposit.id),
		env.DB.prepare(
			`UPDATE f2w_goal_periods SET status = 'pending', completed_at = NULL WHERE id = ?`,
		).bind(params.periodId),
		env.DB.prepare(
			`UPDATE f2w_goals SET saved_amount_cents = MAX(0, saved_amount_cents - ?), status = 'active', updated_at = ? WHERE id = ?`,
		).bind(deposit.amount_cents, now, params.goalId),
	]);

	await invalidateAllForGoal(env, params.goalId, params.userId);
}

export async function deleteGoal(
	env: Pick<Env, 'DB' | 'CACHE'>,
	params: { userId: string; goalId: string },
): Promise<boolean> {
	const goal = await env.DB.prepare(
		`SELECT id FROM f2w_goals WHERE id = ? AND user_id = ?`,
	)
		.bind(params.goalId, params.userId)
		.first<{ id: string }>();

	if (!goal) return false;

	await env.DB.prepare(`DELETE FROM f2w_goals WHERE id = ? AND user_id = ?`)
		.bind(params.goalId, params.userId)
		.run();

	await invalidateAllForGoal(env, params.goalId, params.userId);
	return true;
}

export async function deleteNotification(
	env: Pick<Env, 'DB' | 'CACHE'>,
	userId: string,
	notificationId: string,
): Promise<void> {
	await env.DB.prepare(`DELETE FROM f2w_notifications WHERE id = ? AND user_id = ?`)
		.bind(notificationId, userId)
		.run();
	const { invalidateUserNotifications } = await import('./kv');
	await invalidateUserNotifications(env.CACHE, userId);
}

export async function clearAllNotifications(
	env: Pick<Env, 'DB' | 'CACHE'>,
	userId: string,
): Promise<void> {
	await env.DB.prepare(`DELETE FROM f2w_notifications WHERE user_id = ?`).bind(userId).run();
	const { invalidateUserNotifications } = await import('./kv');
	await invalidateUserNotifications(env.CACHE, userId);
}

export async function registerDevice(
	env: Pick<Env, 'DB'>,
	userId: string,
	data: {
		platform: 'web' | 'ios' | 'android';
		push_subscription?: string;
		sns_endpoint_arn?: string;
	},
): Promise<void> {
	if (data.platform === 'web' && data.push_subscription) {
		const existing = await env.DB.prepare(
			`SELECT id FROM f2w_user_devices WHERE user_id = ? AND push_subscription = ?`,
		)
			.bind(userId, data.push_subscription)
			.first();

		if (existing) return;

		let endpoint = '';
		try {
			endpoint = JSON.parse(data.push_subscription).endpoint ?? '';
		} catch {
			return;
		}

		if (endpoint) {
			await env.DB.prepare(
				`DELETE FROM f2w_user_devices WHERE user_id = ? AND platform = 'web' AND sns_endpoint_arn = ?`,
			)
				.bind(userId, endpoint)
				.run();
		}

		const id = generateId();
		await env.DB.prepare(
			`INSERT INTO f2w_user_devices (id, user_id, sns_endpoint_arn, push_subscription, platform) VALUES (?, ?, ?, ?, 'web')`,
		)
			.bind(id, userId, endpoint, data.push_subscription)
			.run();
		return;
	}

	if (!data.sns_endpoint_arn) return;

	const id = generateId();
	await env.DB.prepare(
		`INSERT INTO f2w_user_devices (id, user_id, sns_endpoint_arn, platform) VALUES (?, ?, ?, ?)`,
	)
		.bind(id, userId, data.sns_endpoint_arn, data.platform)
		.run();
}
