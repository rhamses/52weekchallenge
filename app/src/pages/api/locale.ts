import type { APIRoute } from 'astro';
import { localeCookie, resolveLocale } from '@/i18n';

export const POST: APIRoute = async ({ request }) => {
	const form = await request.formData();
	const locale = resolveLocale(form.get('locale')?.toString());
	const redirect = form.get('redirect')?.toString() || '/';

	return new Response(null, {
		status: 302,
		headers: {
			Location: redirect,
			'Set-Cookie': localeCookie(locale),
		},
	});
};
