import type { APIRoute } from 'astro';
import { getAppUserFromRequest } from '@/lib/session';
import { getWorkerEnv } from '@/lib/worker-env';
import { registerDevice } from '@/lib/sync';

export const POST: APIRoute = async ({ request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const body = (await request.json()) as {
		sns_endpoint_arn: string;
		platform?: 'web' | 'ios' | 'android';
	};

	if (!body.sns_endpoint_arn) {
		return new Response(JSON.stringify({ error: 'Missing endpoint ARN' }), { status: 400 });
	}

	await registerDevice(env, user.id, body.sns_endpoint_arn, body.platform ?? 'web');

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' },
	});
};
