import type { APIRoute } from 'astro';
import { getAppUserFromRequest } from '@/lib/session';
import { getWorkerEnv } from '@/lib/worker-env';
import { deleteGoal } from '@/lib/sync';
import { isHtmxRequest } from '@/lib/render-htmx';

export const DELETE: APIRoute = async ({ params, request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const goalId = params.id;
	if (!goalId) {
		return new Response(JSON.stringify({ error: 'Missing goal id' }), { status: 400 });
	}

	const deleted = await deleteGoal(env, { userId: user.id, goalId });
	if (!deleted) {
		return new Response(JSON.stringify({ error: 'Goal not found' }), { status: 404 });
	}

	if (isHtmxRequest(request)) {
		return new Response(null, {
			status: 200,
			headers: { 'HX-Redirect': '/goals' },
		});
	}

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
