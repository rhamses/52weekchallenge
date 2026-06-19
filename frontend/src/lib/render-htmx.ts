import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import NotificationList from '@/components/notifications/NotificationList.astro';
import { getDictionary, getLocaleFromCookie } from '@/i18n';
import { listNotifications } from '@/lib/db';
import { getWorkerEnv } from '@/lib/worker-env';

let containerPromise: ReturnType<typeof AstroContainer.create> | null = null;

function getContainer() {
	if (!containerPromise) {
		containerPromise = AstroContainer.create();
	}
	return containerPromise;
}

export function isHtmxRequest(request: Request): boolean {
	return request.headers.get('HX-Request') === 'true';
}

export async function renderNotificationListFragment(
	request: Request,
	userId: string,
): Promise<string> {
	const env = getWorkerEnv();
	const notifications = await listNotifications(env.DB, env.CACHE, userId);
	const locale = getLocaleFromCookie(request.headers.get('cookie') ?? '');
	const dict = getDictionary(locale);
	const container = await getContainer();

	return container.renderToString(NotificationList, {
		props: {
			notifications,
			emptyLabel: dict.notifications_empty,
		},
	});
}

export function htmxHtmlResponse(
	body: string,
	headers: Record<string, string> = {},
): Response {
	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			...headers,
		},
	});
}
