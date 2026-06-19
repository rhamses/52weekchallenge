import { getCache, setCache, removeCache } from './sync-client';
import {
	saveSnapshot,
	runOptimisticMutationKeepalive,
	clearSnapshot,
} from './optimistic-client';
import {
	formatMoneyCents,
	formatProgressLabel,
	formatGoalCreatedAtLabel,
	progressPercent,
} from './client-format';
import type { Goal } from '@/lib/types';

const PENDING_CREATE_KEY = 'goals:pending_create';
const DELETED_IDS_KEY = 'goals:deleted_ids';

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

function renderGoalCard(
	goal: PendingGoal | Goal,
	locale: string,
	progressLabel: string,
	createdAtTemplate: string,
): HTMLElement {
	const percent = progressPercent(goal.saved_amount_cents, goal.target_amount_cents);
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

	return a;
}

function escapeHtml(text: string): string {
	const div = document.createElement('div');
	div.textContent = text;
	return div.innerHTML;
}

export function hydrateGoalsList(): void {
	const list = document.querySelector<HTMLElement>('[data-goals-list]');
	if (!list) return;

	const locale = list.dataset.locale ?? 'pt-BR';
	const progressLabel = list.dataset.progressTemplate ?? '{percent}%';
	const createdAtTemplate = list.dataset.createdTemplate ?? '';

	const deletedIds = new Set(getDeletedIds());
	list.querySelectorAll<HTMLElement>('[data-goal-card]').forEach((card) => {
		const goalId = card.dataset.goalCard;
		if (goalId && deletedIds.has(goalId)) {
			card.classList.add('hidden');
		} else {
			card.classList.remove('hidden');
		}
	});

	const pending = getPendingGoals();
	for (const goal of pending) {
		if (document.querySelector(`[data-goal-card="${goal.id}"]`)) continue;
		const card = renderGoalCard(goal, locale, progressLabel, createdAtTemplate);
		list.prepend(card);
	}

	const emptyEl = list.querySelector('[data-goals-empty]');
	if (emptyEl) {
		const visibleCards = list.querySelectorAll('a.goal-card, .goal-card');
		emptyEl.hidden = visibleCards.length > 0;
	}
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
