const CACHE_NAME = 'f2w-v2';
const OFFLINE_URL = '/welcome';
const PRECACHE = [
	OFFLINE_URL,
	'/favicon.ico',
	'/icons/icon-192x192.png',
	'/icons/icon-512x512.png',
	'/icons/apple-touch-icon.png',
	'/site.webmanifest',
];

function isApiRequest(url) {
	return url.pathname.startsWith('/api/');
}

function isStaticAsset(url) {
	return (
		url.pathname.startsWith('/_astro/') ||
		url.pathname.startsWith('/icons/') ||
		url.pathname.startsWith('/assets/')
	);
}

function isNavigationRequest(request) {
	return request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
}

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)),
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
		),
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (isApiRequest(url)) return;

	if (isStaticAsset(url)) {
		event.respondWith(
			caches.match(request).then(
				(cached) =>
					cached ||
					fetch(request).then((response) => {
						if (response.ok) {
							const clone = response.clone();
							caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
						}
						return response;
					}),
			),
		);
		return;
	}

	if (isNavigationRequest(request)) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					if (response.ok) {
						const clone = response.clone();
						caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
					}
					return response;
				})
				.catch(() => caches.match(request).then((r) => r || caches.match(OFFLINE_URL))),
		);
		return;
	}

	event.respondWith(
		fetch(request).catch(() => caches.match(request)),
	);
});

self.addEventListener('push', (event) => {
	let data = { title: '52 Week Challenge', body: '', goalId: null, url: '/notifications' };

	try {
		if (event.data) {
			const parsed = event.data.json();
			data = {
				title: parsed.title ?? data.title,
				body: parsed.body ?? '',
				goalId: parsed.goalId ?? null,
				url: parsed.url ?? (parsed.goalId ? `/goals/${parsed.goalId}` : '/notifications'),
			};
		}
	} catch {
		if (event.data) {
			data.body = event.data.text();
		}
	}

	event.waitUntil(
		self.registration.showNotification(data.title, {
			body: data.body,
			icon: '/icons/icon-192x192.png',
			badge: '/icons/icon-72x72.png',
			data: { url: data.url, goalId: data.goalId },
			tag: data.goalId ? `goal-${data.goalId}` : 'f2w-notification',
		}),
	);
});

self.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const url = event.notification.data?.url ?? '/notifications';

	event.waitUntil(
		self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
			const targetUrl = new URL(url, self.location.origin).href;
			for (const client of clientList) {
				if (client.url.startsWith(self.location.origin) && 'focus' in client) {
					return client.focus().then(() => client);
				}
			}
			if (self.clients.openWindow) {
				return self.clients.openWindow(targetUrl);
			}
		}),
	);
});

self.addEventListener('message', (event) => {
	if (event.data?.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

self.addEventListener('sync', (event) => {
	if (event.tag === 'f2w-sync') {
		event.waitUntil(
			self.clients.matchAll().then((clients) => {
				clients.forEach((client) => client.postMessage({ type: 'FLUSH_PENDING_OPS' }));
			}),
		);
	}
});
