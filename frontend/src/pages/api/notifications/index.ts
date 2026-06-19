import type { APIRoute } from 'astro';
import { getAppUserFromRequest } from '@/lib/session';
import { getWorkerEnv } from '@/lib/worker-env';
import { clearAllNotifications } from '@/lib/sync';
import {
	isHtmxRequest,
	renderNotificationListFragment,
	htmxHtmlResponse,
} from '@/lib/render-htmx';
import { listNotifications } from '@/lib/db';

export const GET: APIRoute = async ({ request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const notifications = await listNotifications(env.DB, env.CACHE, user.id);
	return new Response(JSON.stringify({ notifications }), {
		headers: { 'Content-Type': 'application/json' },
	});
};

export const DELETE: APIRoute = async ({ request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	await clearAllNotifications(env, user.id);

	if (isHtmxRequest(request)) {
		const html = await renderNotificationListFragment(request, user.id);
		return htmxHtmlResponse(html);
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
