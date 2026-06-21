import { getCache, setCache, removeCache, queueOperation } from './sync-client';

const SNAPSHOT_SUFFIX = ':rollback';

export function saveSnapshot(storageKey: string, data: unknown): void {
	setCache(`${storageKey}${SNAPSHOT_SUFFIX}`, data);
}

export function loadSnapshot<T>(storageKey: string): T | null {
	return getCache<T>(`${storageKey}${SNAPSHOT_SUFFIX}`);
}

export function clearSnapshot(storageKey: string): void {
	removeCache(`${storageKey}${SNAPSHOT_SUFFIX}`);
}

export function showAppError(message: string): void {
	document.dispatchEvent(new CustomEvent('app-error', { detail: { message } }));
}

export interface OptimisticRequest {
	url: string;
	method: string;
	body?: string;
	headers?: Record<string, string>;
}

export interface OptimisticMutationOptions<T = unknown> {
	storageKey: string;
	rollback: () => void;
	request: OptimisticRequest;
	onSuccess?: (data: T) => void;
	errorMessage?: string;
}

export async function runOptimisticMutation<T = unknown>(
	opts: OptimisticMutationOptions<T>,
): Promise<boolean> {
	const { storageKey, rollback, request, onSuccess, errorMessage } = opts;

	try {
		const res = await fetch(request.url, {
			method: request.method,
			headers: request.headers ?? (request.body ? { 'Content-Type': 'application/json' } : {}),
			body: request.body,
			credentials: 'same-origin',
		});

		if (res.ok) {
			clearSnapshot(storageKey);
			if (onSuccess) {
				const data = (await res.json().catch(() => null)) as T | null;
				if (data) onSuccess(data);
			}
			return true;
		}

		rollback();
		clearSnapshot(storageKey);
		const body = await res.json().catch(() => null);
		const msg =
			errorMessage ??
			(typeof body === 'object' && body && 'error' in body ? String((body as { error: string }).error) : null) ??
			'Request failed';
		showAppError(msg);
		return false;
	} catch {
		queueOperation({
			url: request.url,
			method: request.method,
			body: request.body,
		});
		return true;
	}
}

/** Fire-and-forget mutation with keepalive for page navigation (goal create/delete). */
export function runOptimisticMutationKeepalive<T = unknown>(
	opts: OptimisticMutationOptions<T>,
): void {
	const { storageKey, rollback, request, onSuccess, errorMessage } = opts;

	fetch(request.url, {
		method: request.method,
		headers: request.headers ?? (request.body ? { 'Content-Type': 'application/json' } : {}),
		body: request.body,
		credentials: 'same-origin',
		keepalive: true,
	})
		.then(async (res) => {
			if (res.ok) {
				clearSnapshot(storageKey);
				if (onSuccess) {
					const data = (await res.json().catch(() => null)) as T | null;
					if (data) onSuccess(data);
				}
				return;
			}
			rollback();
			clearSnapshot(storageKey);
			showAppError(errorMessage ?? 'Request failed');
		})
		.catch(() => {
			queueOperation({
				url: request.url,
				method: request.method,
				body: request.body,
			});
		});
}
