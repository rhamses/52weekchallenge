import type { APIRoute } from 'astro';
import { createAuth, COGNITO_OAUTH_PROVIDER_IDS, type CognitoLoginProvider } from '@/lib/better-auth';

const IDP_KEYS: Record<string, CognitoLoginProvider> = {
	google: 'google',
	facebook: 'facebook',
};

export const GET: APIRoute = async ({ params, request }) => {
	const key = params.provider ?? '';
	const providerKey = IDP_KEYS[key];

	if (!providerKey) {
		return new Response('Unknown provider', { status: 400 });
	}

	const providerId = COGNITO_OAUTH_PROVIDER_IDS[providerKey];
	const auth = createAuth();

	try {
		const result = await auth.api.signInWithOAuth2({
			body: {
				providerId,
				callbackURL: '/goals?mergeDraft=1',
				disableRedirect: true,
			},
			headers: request.headers,
			returnHeaders: true,
		});

		const payload = 'response' in result ? result.response : result;
		const authHeaders = 'headers' in result ? result.headers : null;

		if (!payload?.url) {
			return new Response('Failed to start OAuth flow', { status: 500 });
		}

		const headers = new Headers();
		authHeaders?.forEach((value, key) => headers.append(key, value));
		headers.set('Location', payload.url);

		return new Response(null, { status: 302, headers });
	} catch (err) {
		console.error('OAuth sign-in error:', err);
		return Response.redirect('/login?error=oauth_start_failed', 302);
	}
};
