import { getCache, setCache, removeCache } from './sync-client';
import {
	saveSnapshot,
	runOptimisticMutationKeepalive,
	clearSnapshot,
} from './optimistic-client';
import {
	formatMoneyCents,
	formatGoalCreatedAtLabel,
	progressPercent,
} from './client-format';
import type { Goal, GoalWithProgress } from '@/lib/types';

const PENDING_CREATE_KEY = 'goals:pending_create';
const DELETED_IDS_KEY = 'goals:deleted_ids';
const GOALS_LIST_TTL_MS = 300_000;

interface PendingGoal {
	id: string;
	temp: true;
	title: string;
	target_amount_cents: number;
	currency_code: string;
	savings_mode: string;
	saved_amount_cents: number;
	created_at: string;
}

interface DraftPayload {
	title: string;
	target_amount_cents: number;
	currency_code: string;
	savings_mode: string;
	use_custom_deadline: boolean;
	deadline_date: string | null;
}

interface GoalsListCache {
	goals: GoalWithProgress[];
	fetchedAt: number;
}

const prefetchedGoals = new Set<string>();

function goalsListCacheKey(userId: string): string {
	return `goals:list:${userId}`;
}

export function invalidateGoalsListCache(userId?: string): void {
	const resolved =
		userId ??
		document.querySelector<HTMLElement>('[data-goals-list]')?.dataset.userId ??
		document.querySelector<HTMLElement>('[data-user-id]')?.dataset.userId;
	if (resolved) removeCache(goalsListCacheKey(resolved));
}

function getGoalsListCache(userId: string): GoalsListCache | null {
	const cached = getCache<GoalsListCache>(goalsListCacheKey(userId));
	if (!cached) return null;
	if (Date.now() - cached.fetchedAt > GOALS_LIST_TTL_MS) return null;
	return cached;
}

function setGoalsListCache(userId: string, goals: GoalWithProgress[]): void {
	setCache(goalsListCacheKey(userId), {
		goals,
		fetchedAt: Date.now(),
	} satisfies GoalsListCache);
}

function getPendingGoals(): PendingGoal[] {
	return getCache<PendingGoal[]>(PENDING_CREATE_KEY) ?? [];
}

function setPendingGoals(goals: PendingGoal[]): void {
	if (goals.length) setCache(PENDING_CREATE_KEY, goals);
	else removeCache(PENDING_CREATE_KEY);
}

function addPendingGoal(goal: PendingGoal): void {
	setPendingGoals([...getPendingGoals(), goal]);
}

function removePendingGoal(tempId: string): void {
	setPendingGoals(getPendingGoals().filter((g) => g.id !== tempId));
}

function getDeletedIds(): string[] {
	return getCache<string[]>(DELETED_IDS_KEY) ?? [];
}

function markGoalDeleted(goalId: string): void {
	const ids = getDeletedIds();
	if (!ids.includes(goalId)) {
		setCache(DELETED_IDS_KEY, [...ids, goalId]);
	}
}

function unmarkGoalDeleted(goalId: string): void {
	const ids = getDeletedIds().filter((id) => id !== goalId);
	if (ids.length) setCache(DELETED_IDS_KEY, ids);
	else removeCache(DELETED_IDS_KEY);
}

function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

function renderGoalCard(
	goal: PendingGoal | Goal | GoalWithProgress,
	locale: string,
	progressLabel: string,
	createdAtTemplate: string,
): HTMLElement {
	const percent =
		'progress_percent' in goal && goal.progress_percent != null
			? goal.progress_percent
			: progressPercent(goal.saved_amount_cents, goal.target_amount_cents);
	const formattedTarget = formatMoneyCents(goal.target_amount_cents, goal.currency_code, locale);
	const formattedSaved = formatMoneyCents(goal.saved_amount_cents, goal.currency_code, locale);
	const createdLabel = formatGoalCreatedAtLabel(goal.created_at, locale, createdAtTemplate);
	const progressText = progressLabel.replace('{percent}', String(percent));

	const a = document.createElement('a');
	a.href = `/goals/${goal.id}`;
	a.className = 'goal-card block';
	a.dataset.goalCard = goal.id;
	if ('temp' in goal && goal.temp) a.dataset.pendingGoal = 'true';

	a.innerHTML = `
		<h3 class="font-display text-xl font-semibold">${escapeHtml(goal.title)}</h3>
		<p class="mt-1 text-xs font-light text-[var(--text-muted)]">${escapeHtml(createdLabel)}</p>
		<div class="mt-3 flex items-end justify-between">
			<div>
				<p class="text-sm text-[var(--text-muted)]">${escapeHtml(formattedTarget)}</p>
				<p class="font-display text-2xl font-bold text-brand-primary">${escapeHtml(formattedSaved)}</p>
			</div>
			<div class="text-right">
				<p class="text-sm font-medium text-brand-primary">${escapeHtml(progressText)}</p>
				<div class="mt-2 h-2 w-24 overflow-hidden rounded-full bg-[var(--border)]">
					<div class="h-full rounded-full bg-brand-primary transition-all" style="width: ${percent}%"></div>
				</div>
			</div>
		</div>
	`;

	bindGoalCardPrefetch(a);
	return a;
}

function goalsFingerprint(goals: GoalWithProgress[]): string {
	return JSON.stringify(
		goals.map((g) => ({
			id: g.id,
			title: g.title,
			saved_amount_cents: g.saved_amount_cents,
			target_amount_cents: g.target_amount_cents,
			status: g.status,
		})),
	);
}

function rebuildGoalsListDom(
	list: HTMLElement,
	goals: (PendingGoal | Goal | GoalWithProgress)[],
	locale: string,
	progressLabel: string,
	createdAtTemplate: string,
): void {
	const deletedIds = new Set(getDeletedIds());
	const emptyEl = list.querySelector<HTMLElement>('[data-goals-empty]');
	const fragment = document.createDocumentFragment();

	for (const goal of goals) {
		if (deletedIds.has(goal.id)) continue;
		fragment.appendChild(renderGoalCard(goal, locale, progressLabel, createdAtTemplate));
	}

	list.querySelectorAll('[data-goal-card]').forEach((card) => card.remove());
	list.appendChild(fragment);

	if (emptyEl) {
		emptyEl.hidden = list.querySelectorAll('[data-goal-card]').length > 0;
	}
}

function applyDeletedOverlay(list: HTMLElement): void {
	const deletedIds = new Set(getDeletedIds());
	list.querySelectorAll<HTMLElement>('[data-goal-card]').forEach((card) => {
		const goalId = card.dataset.goalCard;
		if (goalId && deletedIds.has(goalId)) {
			card.classList.add('hidden');
		} else {
			card.classList.remove('hidden');
		}
	});
}

function applyPendingOverlay(
	list: HTMLElement,
	locale: string,
	progressLabel: string,
	createdAtTemplate: string,
): void {
	for (const goal of getPendingGoals()) {
		if (document.querySelector(`[data-goal-card="${goal.id}"]`)) continue;
		list.prepend(renderGoalCard(goal, locale, progressLabel, createdAtTemplate));
	}
}

function updateEmptyState(list: HTMLElement): void {
	const emptyEl = list.querySelector<HTMLElement>('[data-goals-empty]');
	if (!emptyEl) return;
	const visibleCards = list.querySelectorAll<HTMLElement>('[data-goal-card]:not(.hidden)');
	emptyEl.hidden = visibleCards.length > 0;
}

export function prefetchGoalDetail(goalId: string): void {
	if (prefetchedGoals.has(goalId)) return;
	prefetchedGoals.add(goalId);

	const link = document.createElement('link');
	link.rel = 'prefetch';
	link.as = 'document';
	link.href = `/goals/${goalId}`;
	document.head.appendChild(link);

	void fetch(`/api/goals/${goalId}`, { credentials: 'same-origin' }).catch(() => {
		prefetchedGoals.delete(goalId);
	});
}

function bindGoalCardPrefetch(card: HTMLElement): void {
	const goalId = card.dataset.goalCard;
	if (!goalId || card.dataset.pendingGoal) return;

	const prefetchOnce = () => prefetchGoalDetail(goalId);
	card.addEventListener('pointerenter', prefetchOnce, { once: true, passive: true });
	card.addEventListener('touchstart', prefetchOnce, { once: true, passive: true });
}

function bindGoalCardPrefetchAll(root: ParentNode = document): void {
	root.querySelectorAll<HTMLElement>('[data-goal-card]').forEach(bindGoalCardPrefetch);
}

async function revalidateGoalsList(
	list: HTMLElement,
	userId: string,
	locale: string,
	progressLabel: string,
	createdAtTemplate: string,
): Promise<void> {
	try {
		const res = await fetch('/api/goals', { credentials: 'same-origin' });
		if (!res.ok) return;

		const data = (await res.json()) as { goals: GoalWithProgress[] };
		const cached = getGoalsListCache(userId);
		const previousFingerprint = cached ? goalsFingerprint(cached.goals) : null;
		const nextFingerprint = goalsFingerprint(data.goals);

		setGoalsListCache(userId, data.goals);

		if (previousFingerprint !== nextFingerprint) {
			rebuildGoalsListDom(list, data.goals, locale, progressLabel, createdAtTemplate);
			applyPendingOverlay(list, locale, progressLabel, createdAtTemplate);
			updateEmptyState(list);
		}
	} catch {
		/* offline or transient error */
	}
}

export function hydrateGoalsList(): void {
	const list = document.querySelector<HTMLElement>('[data-goals-list]');
	if (!list) return;

	const userId = list.dataset.userId;
	const locale = list.dataset.locale ?? 'pt-BR';
	const progressLabel = list.dataset.progressTemplate ?? '{percent}%';
	const createdAtTemplate = list.dataset.createdTemplate ?? '';

	if (userId) {
		const cached = getGoalsListCache(userId);
		if (cached?.goals.length) {
			rebuildGoalsListDom(list, cached.goals, locale, progressLabel, createdAtTemplate);
		}
		void revalidateGoalsList(list, userId, locale, progressLabel, createdAtTemplate);
	}

	applyPendingOverlay(list, locale, progressLabel, createdAtTemplate);
	applyDeletedOverlay(list);
	updateEmptyState(list);
	bindGoalCardPrefetchAll(list);
}

export function createGoalOptimistically(
	draft: DraftPayload,
	locale: string,
	errorMessage: string,
	progressLabel: string,
	createdAtTemplate: string,
): void {
	const tempId = crypto.randomUUID();
	const pending: PendingGoal = {
		id: tempId,
		temp: true,
		title: draft.title,
		target_amount_cents: draft.target_amount_cents,
		currency_code: draft.currency_code,
		savings_mode: draft.savings_mode,
		saved_amount_cents: 0,
		created_at: new Date().toISOString(),
	};

	addPendingGoal(pending);
	invalidateGoalsListCache();
	const storageKey = `goals:create:${tempId}`;
	saveSnapshot(storageKey, pending);

	runOptimisticMutationKeepalive<{ goal: Goal }>({
		storageKey,
		rollback: () => {
			removePendingGoal(tempId);
			hydrateGoalsList();
		},
		request: {
			url: '/api/goals',
			method: 'POST',
			body: JSON.stringify(draft),
		},
		onSuccess: (data) => {
			const existing = document.querySelector<HTMLElement>(`[data-goal-card="${tempId}"]`);
			removePendingGoal(tempId);
			clearSnapshot(storageKey);
			invalidateGoalsListCache();
			if (existing) {
				existing.replaceWith(
					renderGoalCard(data.goal, locale, progressLabel, createdAtTemplate),
				);
			}
		},
		errorMessage,
	});

	window.f2wSync?.clearDraftGoal();
	document.documentElement.dataset.transition = 'forward';
	window.location.href = '/goals';
}

export function deleteGoalOptimistically(goalId: string, deleteUrl: string, errorMessage: string): void {
	markGoalDeleted(goalId);
	invalidateGoalsListCache();
	const storageKey = `goals:delete:${goalId}`;
	saveSnapshot(storageKey, { goalId });

	runOptimisticMutationKeepalive({
		storageKey,
		rollback: () => {
			unmarkGoalDeleted(goalId);
			hydrateGoalsList();
		},
		request: { url: deleteUrl, method: 'DELETE' },
		onSuccess: () => {
			unmarkGoalDeleted(goalId);
			clearSnapshot(storageKey);
			invalidateGoalsListCache();
			document.querySelector(`[data-goal-card="${goalId}"]`)?.remove();
		},
		errorMessage,
	});

	document.documentElement.dataset.transition = 'forward';
	window.location.href = '/goals';
}

export function initGoalsOptimistic(): void {
	window.f2wGoals = {
		createGoalOptimistically,
		deleteGoalOptimistically,
		hydrateGoalsList,
	};
}

declare global {
	interface Window {
		f2wGoals?: {
			createGoalOptimistically: typeof createGoalOptimistically;
			deleteGoalOptimistically: typeof deleteGoalOptimistically;
			hydrateGoalsList: typeof hydrateGoalsList;
		};
	}
}
