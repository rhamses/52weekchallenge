import {
	ensurePushSubscription,
	registerPushSubscriptionOnServer,
	VAPID_STORAGE_KEY,
} from '../lib/push-client-core';
import { showAppError } from './optimistic-client';

const PUSH_DISMISSED_KEY = 'f2w_push_dismissed';

export interface PushLabels {
	title: string;
	body: string;
	allow: string;
	dismiss: string;
	errorGeneric: string;
	errorPermissionDenied: string;
	errorRegisterFailed: string;
}

function getVapidKey(): string | null {
	const key = document.body.dataset.vapidPublicKey?.trim();
	return key || null;
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

function resolveRegisterError(labels: PushLabels): string {
	return labels.errorRegisterFailed;
}

async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
	await navigator.serviceWorker.register('/sw.js');
	return navigator.serviceWorker.ready;
}

export async function subscribeAndRegister(labels: PushLabels): Promise<boolean> {
	const vapidKey = getVapidKey();
	if (!vapidKey) {
		showAppError(labels.errorGeneric);
		return false;
	}

	try {
		const permission = await Notification.requestPermission();
		if (permission !== 'granted') {
			showAppError(labels.errorPermissionDenied);
			return false;
		}

		const registration = await ensureServiceWorkerRegistration();
		const storedVapidKey = localStorage.getItem(VAPID_STORAGE_KEY);
		const subscription = await ensurePushSubscription(registration, vapidKey, storedVapidKey);
		const subscriptionJson = subscription.toJSON();

		if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
			showAppError(labels.errorGeneric);
			return false;
		}

		const result = await registerPushSubscriptionOnServer({
			endpoint: subscriptionJson.endpoint,
			expirationTime: subscriptionJson.expirationTime ?? null,
			keys: {
				p256dh: subscriptionJson.keys.p256dh,
				auth: subscriptionJson.keys.auth,
			},
		});

		if (!result.ok) {
			showAppError(resolveRegisterError(labels));
			return false;
		}

		localStorage.setItem(VAPID_STORAGE_KEY, vapidKey);
		return true;
	} catch (err) {
		console.error('[push] subscribeAndRegister failed', err);
		showAppError(labels.errorGeneric);
		return false;
	}
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

	const allowButton = root.querySelector<HTMLButtonElement>('[data-push-allow]');
	allowButton?.addEventListener('click', async () => {
		if (!allowButton || allowButton.disabled) return;

		allowButton.disabled = true;
		const originalText = allowButton.textContent;
		allowButton.textContent = '…';

		try {
			const ok = await subscribeAndRegister(labels);
			if (ok) hideBanner(root);
		} finally {
			if (!root.classList.contains('hidden')) {
				allowButton.disabled = false;
				allowButton.textContent = originalText;
			}
		}
	});
}

function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

export async function initPushClient(): Promise<void> {
	if (!isPushSupported()) return;

	const labels = getLabels();
	if (!labels) return;

	if (Notification.permission === 'granted') {
		void subscribeAndRegister(labels);
		return;
	}

	if (localStorage.getItem(PUSH_DISMISSED_KEY)) return;
	if (Notification.permission === 'denied') return;

	const root = document.getElementById('push-banner');
	if (!root) return;

	showBanner(root, labels);
}
