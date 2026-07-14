import type { APIRoute } from 'astro';
import { getAppUserFromRequest } from '@/lib/session';
import { getWorkerEnv } from '@/lib/worker-env';
import { getGoalById } from '@/lib/db';
import { recordDeposit, removeDeposit } from '@/lib/sync';
import { buildDepositResponse, jsonResponse } from '@/lib/deposit-response';

export const POST: APIRoute = async ({ params, request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return jsonResponse({ error: 'Unauthorized' }, 401);
	}

	const goalId = params.id!;
	const periodId = params.periodId!;

	const goal = await getGoalById(env.DB, env.CACHE, goalId, user.id);
	if (!goal) {
		return jsonResponse({ error: 'Goal not found' }, 404);
	}

	try {
		const { isFirstDeposit } = await recordDeposit(env, {
			userId: user.id,
			goalId,
			periodId,
			amountCents: goal.installment_cents,
		});

		if (isFirstDeposit) {
			const { sendFirstDepositEmail } = await import('@/lib/email');
			await sendFirstDepositEmail(env, user.email, user.name ?? user.email, goal.title);
		}

		const payload = await buildDepositResponse(env, request, goalId, user.id, periodId, {
			isFirstDeposit,
		});
		if (!payload) {
			return jsonResponse({ error: 'Goal not found' }, 404);
		}

		return jsonResponse(payload);
	} catch (err) {
		return jsonResponse({ error: String(err) }, 400);
	}
};

export const DELETE: APIRoute = async ({ params, request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return jsonResponse({ error: 'Unauthorized' }, 401);
	}

	const goalId = params.id!;
	const periodId = params.periodId!;

	try {
		await removeDeposit(env, { userId: user.id, goalId, periodId });

		const payload = await buildDepositResponse(env, request, goalId, user.id, periodId);
		if (!payload) {
			return jsonResponse({ error: 'Goal not found' }, 404);
		}

		return jsonResponse(payload);
	} catch (err) {
		return jsonResponse({ error: String(err) }, 400);
	}
};
