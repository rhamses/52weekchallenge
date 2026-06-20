import { formatMoney, formatGoalCreatedAtLabel, progressPercent } from './calculations';
import { getDictionary, getLocaleFromCookie } from '@/i18n';
import { getGoalById, getGoalPeriods } from './db';
import type { Env } from './types';

export interface DepositResponsePayload {
	ok: true;
	isFirstDeposit?: boolean;
	period: {
		id: string;
		status: string;
		completed_at: string | null;
		completed_at_label: string | null;
	};
	goal: {
		saved_amount_cents: number;
		target_amount_cents: number;
		progress_percent: number;
		saved_amount_label: string;
		target_amount_label: string;
		progress_label: string;
	};
}

export async function buildDepositResponse(
	env: Pick<Env, 'DB' | 'CACHE'>,
	request: Request,
	goalId: string,
	userId: string,
	periodId: string,
	options: { isFirstDeposit?: boolean } = {},
): Promise<DepositResponsePayload | null> {
	const goal = await getGoalById(env.DB, env.CACHE, goalId, userId);
	if (!goal) return null;

	const periods = await getGoalPeriods(env.DB, env.CACHE, goalId);
	const period = periods.find((p) => p.id === periodId);
	if (!period) return null;

	const locale = getLocaleFromCookie(request.headers.get('cookie') ?? '');
	const dict = getDictionary(locale);
	const percent = progressPercent(goal.saved_amount_cents, goal.target_amount_cents);

	return {
		ok: true,
		...(options.isFirstDeposit !== undefined ? { isFirstDeposit: options.isFirstDeposit } : {}),
		period: {
			id: period.id,
			status: period.status,
			completed_at: period.completed_at,
			completed_at_label:
				period.status === 'completed' && period.completed_at
					? formatGoalCreatedAtLabel(period.completed_at, locale, dict.history_deposited_at)
					: null,
		},
		goal: {
			saved_amount_cents: goal.saved_amount_cents,
			target_amount_cents: goal.target_amount_cents,
			progress_percent: percent,
			saved_amount_label: formatMoney(goal.saved_amount_cents, goal.currency_code, locale),
			target_amount_label: formatMoney(goal.target_amount_cents, goal.currency_code, locale),
			progress_label: dict.goal_progress.replace('{percent}', String(percent)),
		},
	};
}

export function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
