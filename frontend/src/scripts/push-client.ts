const PUSH_DISMISSED_KEY = 'f2w_push_dismissed';

interface PushLabels {
	title: string;
	body: string;
	allow: string;
	dismiss: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const raw = atob(base64);
	const arr = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
	return arr;
}

function getVapidKey(): string | null {
	return document.body.dataset.vapidPublicKey ?? null;
}

function getLabels(): PushLabels | null {
	const el = document.querySelector('[data-push-labels]');
	const raw = el?.getAttribute('data-push-labels');
	if (!raw) return null;
	try {
		return JSON.parse(raw) as PushLabels;
	} catch {
		return null;
	}
}

function isPushSupported(): boolean {
	return 'Notification' in window && 'PushManager' in window && 'serviceWorker' in navigator;
}

async function subscribeAndRegister(): Promise<boolean> {
	const vapidKey = getVapidKey();
	if (!vapidKey) return false;

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') return false;

	const registration = await navigator.serviceWorker.ready;
	let subscription = await registration.pushManager.getSubscription();

	if (!subscription) {
		subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(vapidKey),
		});
	}

	const res = await fetch('/api/devices/register', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		credentials: 'same-origin',
		body: JSON.stringify({
			platform: 'web',
			push_subscription: subscription.toJSON(),
		}),
	});

	return res.ok;
}

function hideBanner(root: HTMLElement): void {
	root.classList.add('hidden');
	localStorage.setItem(PUSH_DISMISSED_KEY, '1');
}

function showBanner(root: HTMLElement, labels: PushLabels): void {
	root.classList.remove('hidden');
	root.innerHTML = `
		<div class="flex items-start gap-3">
			<div class="min-w-0 flex-1">
				<p class="font-display text-sm font-semibold">${escapeHtml(labels.title)}</p>
				<p class="mt-1 text-xs text-[var(--text-muted)]">${escapeHtml(labels.body)}</p>
			</div>
			<button type="button" class="shrink-0 text-xs text-[var(--text-muted)]" data-push-dismiss aria-label="Dismiss">${escapeHtml(labels.dismiss)}</button>
		</div>
		<button type="button" class="btn-primary mt-3 w-full !py-2.5 !text-sm" data-push-allow>${escapeHtml(labels.allow)}</button>
	`;

	root.querySelector('[data-push-dismiss]')?.addEventListener('click', () => hideBanner(root));
	root.querySelector('[data-push-allow]')?.addEventListener('click', async () => {
		const ok = await subscribeAndRegister();
		if (ok) hideBanner(root);
	});
}

function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

export async function initPushClient(): Promise<void> {
	if (!isPushSupported()) return;
	if (localStorage.getItem(PUSH_DISMISSED_KEY)) return;
	if (Notification.permission === 'granted') {
		void subscribeAndRegister();
		return;
	}
	if (Notification.permission === 'denied') return;

	const root = document.getElementById('push-banner');
	const labels = getLabels();
	if (!root || !labels) return;

	showBanner(root, labels);
}
