interface InstallLabels {
	title: string;
	action: string;
	iosHint: string;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getLabels(): InstallLabels | null {
	const raw = document.body.dataset.pwaLabels;
	if (!raw) return null;
	try {
		return JSON.parse(raw) as InstallLabels;
	} catch {
		return null;
	}
}

function isInstalled(): boolean {
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		// @ts-expect-error iOS Safari
		window.navigator.standalone === true
	);
}

function isIos(): boolean {
	return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function closeInstallBanner(): void {
	document.getElementById('pwa-install-banner')?.remove();
}

function showInstallBanner(labels: InstallLabels, onInstall: () => void): void {
	if (document.getElementById('pwa-install-banner')) return;

	const banner = document.createElement('div');
	banner.id = 'pwa-install-banner';
	banner.className =
		'fixed bottom-32 left-4 right-4 z-40 mx-auto max-w-lg rounded-2xl border border-[var(--border)] bg-white p-4 shadow-card';
	banner.innerHTML = `
		<p class="font-display text-sm font-semibold">${escapeHtml(labels.title)}</p>
		${isIos() ? `<p class="mt-1 text-xs text-[var(--text-muted)]">${escapeHtml(labels.iosHint)}</p>` : ''}
		<button type="button" class="btn-primary mt-3 w-full !py-2.5 !text-sm" data-pwa-install>${escapeHtml(labels.action)}</button>
	`;

	document.body.appendChild(banner);
	banner.querySelector('[data-pwa-install]')?.addEventListener('click', () => {
		closeInstallBanner();
		onInstall();
	});
}

export function initPwaInstall(): void {
	if (isInstalled()) return;

	const labels = getLabels();
	if (!labels) return;

	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferredPrompt = e as BeforeInstallPromptEvent;

		showInstallBanner(labels, async () => {
			if (!deferredPrompt) return;
			await deferredPrompt.prompt();
			await deferredPrompt.userChoice;
			deferredPrompt = null;
		});
	});

	if (isIos() && !isInstalled()) {
		const dismissed = localStorage.getItem('f2w_install_dismissed');
		if (!dismissed) {
			showInstallBanner(labels, () => {
				localStorage.setItem('f2w_install_dismissed', '1');
			});
		}
	}
}

declare global {
	interface WindowEventMap {
		beforeinstallprompt: BeforeInstallPromptEvent;
	}
}
