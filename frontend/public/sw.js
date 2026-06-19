const CACHE_NAME = 'f2w-v1';
const OFFLINE_URL = '/welcome';

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) =>
			cache.addAll([
				OFFLINE_URL,
				'/favicon.ico',
				'/icons/icon-192x192.png',
				'/icons/icon-512x512.png',
				'/site.webmanifest',
			]),
		),
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
	if (event.request.method !== 'GET') return;

	event.respondWith(
		fetch(event.request)
			.then((response) => {
				const clone = response.clone();
				caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
				return response;
			})
			.catch(() => caches.match(event.request).then((r) => r || caches.match(OFFLINE_URL))),
	);
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
