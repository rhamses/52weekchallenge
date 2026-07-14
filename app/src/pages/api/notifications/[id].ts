import type { APIRoute } from 'astro';
import { getAppUserFromRequest } from '@/lib/session';
import { getWorkerEnv } from '@/lib/worker-env';
import { deleteNotification } from '@/lib/sync';
import { invalidateUserNotifications } from '@/lib/kv';
import { isHtmxRequest } from '@/lib/render-htmx';

export const DELETE: APIRoute = async ({ params, request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const id = params.id!;
	await deleteNotification(env, user.id, id);
	await invalidateUserNotifications(env.CACHE, user.id);

	if (isHtmxRequest(request)) {
		return new Response(null, { status: 200 });
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
