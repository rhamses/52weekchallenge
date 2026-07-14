interface UpdateLabels {
	message: string;
	reload: string;
}

function getLabels(): UpdateLabels | null {
	const raw = document.body.dataset.pwaUpdateLabels;
	if (!raw) return null;
	try {
		return JSON.parse(raw) as UpdateLabels;
	} catch {
		return null;
	}
}

function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function showUpdateBanner(registration: ServiceWorkerRegistration, labels: UpdateLabels): void {
	if (document.getElementById('pwa-update-banner')) return;

	const banner = document.createElement('div');
	banner.id = 'pwa-update-banner';
	banner.className =
		'fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-brand-primary/30 bg-white p-4 shadow-card';
	banner.innerHTML = `
		<p class="text-sm font-medium">${escapeHtml(labels.message)}</p>
		<button type="button" class="btn-primary mt-3 w-full !py-2.5 !text-sm" data-pwa-reload>${escapeHtml(labels.reload)}</button>
	`;

	document.body.appendChild(banner);
	banner.querySelector('[data-pwa-reload]')?.addEventListener('click', () => {
		registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
		window.location.reload();
	});
}

export function initPwaUpdate(): void {
	if (!('serviceWorker' in navigator)) return;

	const labels = getLabels();
	if (!labels) return;

	void navigator.serviceWorker.ready.then((registration) => {
		if (registration.waiting) {
			showUpdateBanner(registration, labels);
		}

		registration.addEventListener('updatefound', () => {
			const newWorker = registration.installing;
			if (!newWorker) return;

			newWorker.addEventListener('statechange', () => {
				if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
					showUpdateBanner(registration, labels);
				}
			});
		});
	});
}
