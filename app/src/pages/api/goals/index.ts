import type { APIRoute } from 'astro';
import { getAppUserFromRequest } from '@/lib/session';
import { getWorkerEnv } from '@/lib/worker-env';
import { listGoalsForUser } from '@/lib/db';
import { createGoalWithPeriods } from '@/lib/sync';
import type { DraftGoal } from '@/lib/types';

export const GET: APIRoute = async ({ request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const goals = await listGoalsForUser(env.DB, env.CACHE, user.id);
	return new Response(JSON.stringify({ goals, userId: user.id }), {
		headers: { 'Content-Type': 'application/json' },
	});
};

export const POST: APIRoute = async ({ request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const body = (await request.json()) as DraftGoal;

	if (!body.title || body.title.length < 3 || !body.target_amount_cents) {
		return new Response(JSON.stringify({ error: 'Invalid goal data' }), { status: 400 });
	}

	const { goal } = await createGoalWithPeriods(env, {
		title: body.title,
		target_amount_cents: body.target_amount_cents,
		currency_code: body.currency_code || user.default_currency,
		savings_mode: body.savings_mode || 'weekly',
		use_custom_deadline: body.use_custom_deadline ?? false,
		deadline_date: body.deadline_date ?? null,
		user_id: user.id,
	});

	return new Response(JSON.stringify({ goal }), {
		status: 201,
		headers: { 'Content-Type': 'application/json' },
	});
};
