import { getCache, setCache, removeCache } from './sync-client';
import { saveSnapshot, runOptimisticMutation, clearSnapshot } from './optimistic-client';
import { initNotificationSwipe } from './swipes';

const HIDDEN_IDS_KEY = 'notifications:hidden_ids';
const CLEARED_ALL_KEY = 'notifications:cleared_all';

interface DeleteSnapshot {
	html: string;
	nextId: string | null;
}

function getHiddenIds(): string[] {
	return getCache<string[]>(HIDDEN_IDS_KEY) ?? [];
}

function addHiddenId(id: string): void {
	const ids = getHiddenIds();
	if (!ids.includes(id)) setCache(HIDDEN_IDS_KEY, [...ids, id]);
}

function removeHiddenId(id: string): void {
	const ids = getHiddenIds().filter((i) => i !== id);
	if (ids.length) setCache(HIDDEN_IDS_KEY, ids);
	else removeCache(HIDDEN_IDS_KEY);
}

function isClearedAll(): boolean {
	return getCache<boolean>(CLEARED_ALL_KEY) === true;
}

function restoreNotificationItem(parent: HTMLElement, snapshot: DeleteSnapshot): void {
	const temp = document.createElement('div');
	temp.innerHTML = snapshot.html;
	const restored = temp.firstElementChild as HTMLElement | null;
	if (!restored) return;

	if (snapshot.nextId) {
		const next = parent.querySelector(`[data-notification-id="${snapshot.nextId}"]`);
		parent.insertBefore(restored, next);
	} else {
		parent.appendChild(restored);
	}
	initNotificationSwipe();
}

export function deleteNotificationOptimistically(
	el: HTMLElement,
	notificationId: string,
	deleteUrl: string,
	errorMessage: string,
): void {
	const parent = el.parentElement;
	if (!parent) return;

	const snapshot: DeleteSnapshot = {
		html: el.outerHTML,
		nextId: el.nextElementSibling?.getAttribute('data-notification-id') ?? null,
	};
	const storageKey = `notifications:delete:${notificationId}`;

	saveSnapshot(storageKey, snapshot);
	addHiddenId(notificationId);
	el.remove();

	void runOptimisticMutation({
		storageKey,
		rollback: () => {
			removeHiddenId(notificationId);
			restoreNotificationItem(parent, snapshot);
		},
		request: { url: deleteUrl, method: 'DELETE' },
		onSuccess: () => {
			removeHiddenId(notificationId);
			clearSnapshot(storageKey);
		},
		errorMessage,
	});
}

export function clearAllNotificationsOptimistically(
	listEl: HTMLElement,
	clearUrl: string,
	emptyHtml: string,
	errorMessage: string,
): void {
	const snapshot = listEl.innerHTML;
	const storageKey = 'notifications:clear_all';

	saveSnapshot(storageKey, snapshot);
	setCache(CLEARED_ALL_KEY, true);
	listEl.innerHTML = emptyHtml;

	void runOptimisticMutation({
		storageKey,
		rollback: () => {
			listEl.innerHTML = snapshot;
			removeCache(CLEARED_ALL_KEY);
			initNotificationSwipe();
		},
		request: { url: clearUrl, method: 'DELETE' },
		onSuccess: () => {
			removeCache(CLEARED_ALL_KEY);
			clearSnapshot(storageKey);
		},
		errorMessage,
	});
}

export function hydrateNotificationsList(): void {
	const list = document.getElementById('notification-list');
	if (!list) return;

	if (isClearedAll()) {
		const emptyHtml = list.dataset.emptyHtml;
		if (emptyHtml) list.innerHTML = emptyHtml;
		return;
	}

	const hidden = new Set(getHiddenIds());
	list.querySelectorAll<HTMLElement>('[data-notification-id]').forEach((item) => {
		const id = item.dataset.notificationId;
		if (id && hidden.has(id)) item.remove();
	});
}

export function initNotificationsOptimistic(): void {
	window.f2wNotifications = {
		deleteNotificationOptimistically,
		clearAllNotificationsOptimistically,
		hydrateNotificationsList,
	};
}

declare global {
	interface Window {
		f2wNotifications?: {
			deleteNotificationOptimistically: typeof deleteNotificationOptimistically;
			clearAllNotificationsOptimistically: typeof clearAllNotificationsOptimistic;
			hydrateNotificationsList: typeof hydrateNotificationsList;
		};
	}
}
