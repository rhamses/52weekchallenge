const CACHE_PREFIX = 'f2w_cache:';
const PENDING_KEY = 'f2w_pending_ops';
const DRAFT_KEY = 'f2w_draft_goal';

interface DraftGoalPayload {
	title: string;
	target_amount_cents: number;
	currency_code: string;
	savings_mode: string;
	use_custom_deadline: boolean;
	deadline_date: string | null;
}

export function initSyncClient(): void {
	window.f2wSync = {
		getCache,
		setCache,
		removeCache,
		saveDraftGoal,
		getDraftGoal,
		clearDraftGoal,
		queueOperation,
		flushPendingOperations,
	};
	flushPendingOperations();
	void mergeDraftGoalIfNeeded();
	window.addEventListener('online', flushPendingOperations);
}

function cleanMergeParam(): void {
	const url = new URL(window.location.href);
	url.searchParams.delete('mergeDraft');
	window.history.replaceState({}, '', url.pathname + url.search);
}

async function mergeDraftGoalIfNeeded(): Promise<void> {
	const params = new URLSearchParams(window.location.search);
	if (params.get('mergeDraft') !== '1') return;

	const draft = getDraftGoal<DraftGoalPayload>();
	if (!draft) {
		cleanMergeParam();
		return;
	}

	try {
		const res = await fetch('/api/goals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(draft),
		});

		if (res.ok) {
			clearDraftGoal();
			cleanMergeParam();
			window.location.reload();
		} else {
			console.error('Draft merge failed', res.status);
			cleanMergeParam();
		}
	} catch (err) {
		console.error('Draft merge error', err);
		cleanMergeParam();
	}
}

function getCache<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(CACHE_PREFIX + key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

function setCache(key: string, value: unknown): void {
	try {
		localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
	} catch {
		/* quota exceeded */
	}
}

function removeCache(key: string): void {
	localStorage.removeItem(CACHE_PREFIX + key);
}

function saveDraftGoal(draft: unknown): void {
	localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function getDraftGoal<T>(): T | null {
	try {
		const raw = localStorage.getItem(DRAFT_KEY);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

function clearDraftGoal(): void {
	localStorage.removeItem(DRAFT_KEY);
}

interface PendingOp {
	url: string;
	method: string;
	body?: string;
}

function queueOperation(op: PendingOp): void {
	const pending = getCache<PendingOp[]>(PENDING_KEY) ?? [];
	pending.push(op);
	setCache(PENDING_KEY, pending);
	void registerBackgroundSync();
}

async function registerBackgroundSync(): Promise<void> {
	if (!('serviceWorker' in navigator)) return;
	try {
		const reg = await navigator.serviceWorker.ready;
		// @ts-expect-error Background Sync API
		if ('sync' in reg) await reg.sync.register('f2w-sync');
	} catch {
		/* unsupported */
	}
}

async function flushPendingOperations(): Promise<void> {
	const pending = getCache<PendingOp[]>(PENDING_KEY) ?? [];
	if (!pending.length || !navigator.onLine) return;

	const remaining: PendingOp[] = [];
	for (const op of pending) {
		try {
			const res = await fetch(op.url, {
				method: op.method,
				headers: op.body ? { 'Content-Type': 'application/json' } : {},
				body: op.body,
			});
			if (!res.ok) remaining.push(op);
		} catch {
			remaining.push(op);
		}
	}
	setCache(PENDING_KEY, remaining);
}

function registerServiceWorker(): void {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/sw.js').catch(() => {});
		navigator.serviceWorker.addEventListener('message', (event) => {
			if (event.data?.type === 'FLUSH_PENDING_OPS') flushPendingOperations();
		});
	}
}

registerServiceWorker();

export {
	getCache,
	setCache,
	removeCache,
	saveDraftGoal,
	getDraftGoal,
	clearDraftGoal,
	queueOperation,
	flushPendingOperations,
};
