import type { APIRoute } from 'astro';
import { getAppUserFromRequest } from '@/lib/session';
import { getWorkerEnv } from '@/lib/worker-env';
import { registerDevice } from '@/lib/sync';
import { isValidPushSubscription } from '@/lib/push-subscription';

export const POST: APIRoute = async ({ request }) => {
	const env = getWorkerEnv();
	const user = await getAppUserFromRequest(env.DB, request);

	if (!user) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	let body: {
		sns_endpoint_arn?: string;
		push_subscription?: PushSubscriptionJSON;
		platform?: 'web' | 'ios' | 'android';
	};

	try {
		body = (await request.json()) as typeof body;
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
	}

	const platform = body.platform ?? 'web';

	try {
		if (platform === 'web') {
			if (!body.push_subscription || !isValidPushSubscription(body.push_subscription)) {
				return new Response(JSON.stringify({ error: 'Invalid push subscription' }), { status: 400 });
			}

			await registerDevice(env, user.id, {
				platform: 'web',
				push_subscription: JSON.stringify(body.push_subscription),
			});
		} else {
			if (!body.sns_endpoint_arn) {
				return new Response(JSON.stringify({ error: 'Missing endpoint ARN' }), { status: 400 });
			}

			await registerDevice(env, user.id, {
				platform,
				sns_endpoint_arn: body.sns_endpoint_arn,
			});
		}
	} catch (err) {
		console.error('[devices/register] failed', err);
		const message = err instanceof Error ? err.message : 'Device registration failed';
		return new Response(JSON.stringify({ error: message }), { status: 500 });
	}

	return new Response(JSON.stringify({ ok: true }), {
		headers: { 'Content-Type': 'application/json' },
	});
};

interface PushSubscriptionJSON {
	endpoint: string;
	expirationTime?: number | null;
	keys: { p256dh: string; auth: string };
}
