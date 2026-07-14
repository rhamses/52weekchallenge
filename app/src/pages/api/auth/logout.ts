import type { APIRoute } from 'astro';
import { createAuth } from '@/lib/better-auth';

async function signOutAndRedirect(request: Request): Promise<Response> {
	const auth = createAuth();

	try {
		const result = await auth.api.signOut({
			headers: request.headers,
			returnHeaders: true,
		});

		const authHeaders = 'headers' in result ? result.headers : null;
		const headers = new Headers();
		authHeaders?.forEach((value, key) => headers.append(key, value));
		headers.set('Location', '/welcome');

		return new Response(null, { status: 302, headers });
	} catch (err) {
		console.error('Sign-out error:', err);
		return Response.redirect('/welcome', 302);
	}
}

export const POST: APIRoute = ({ request }) => signOutAndRedirect(request);

export const GET: APIRoute = ({ request }) => signOutAndRedirect(request);
