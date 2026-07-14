import { defineMiddleware } from 'astro:middleware';
import { env } from 'cloudflare:workers';
import { AuthConfigError } from './lib/auth-config';
import { createAuth } from './lib/better-auth';
import { getF2wUserByEmail } from './lib/user-sync';
import { getLocaleFromCookie } from './i18n';

export const onRequest = defineMiddleware(async (context, next) => {
	context.locals.locale = getLocaleFromCookie(context.request.headers.get('cookie') ?? '');

	try {
		const session = await createAuth().api.getSession({ headers: context.request.headers });
		context.locals.user = session?.user?.email
			? await getF2wUserByEmail(env.DB, session.user.email)
			: null;
	} catch (err) {
		if (err instanceof AuthConfigError) {
			console.error('[auth]', err.message);
			context.locals.user = null;
		} else {
			throw err;
		}
	}

	return next();
});
