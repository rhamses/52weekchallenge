import { playConfettiCelebration } from './lottie';
import {
	saveSnapshot,
	runOptimisticMutation,
} from './optimistic-client';
import {
	formatMoneyCents,
	formatProgressLabel,
	formatGoalCreatedAtLabel,
	progressPercent,
} from './client-format';
import { getCache, setCache } from './sync-client';
import type { DepositResponsePayload } from '@/lib/deposit-response';

type GoalSummary = DepositResponsePayload['goal'];
type PeriodSummary = DepositResponsePayload['period'];

interface SummaryMeta {
	goalId: string;
	savedCents: number;
	targetCents: number;
	currency: string;
	locale: string;
	progressTemplate: string;
	completedAtTemplate: string;
}

interface PeriodSnapshot {
	id: string;
	isCompleted: boolean;
	depositUrl?: string;
	undoUrl?: string;
	dateText: string;
	dateHidden: boolean;
	labelText: string;
	dueDateHidden: boolean;
}

interface GoalDetailSnapshot {
	summary: SummaryMeta;
	periods: PeriodSnapshot[];
}

interface GoalOptimisticCache {
	saved_amount_cents: number;
	periods: Record<string, { status: string; completed_at_label?: string }>;
}

function resetSwipeTransform(item: HTMLElement): void {
	item.style.transition = 'transform 0.25s ease';
	item.style.transform = '';
}

export function revertSwipeItem(item: HTMLElement): void {
	resetSwipeTransform(item);
}

function getCompletedDateEl(item: HTMLElement): HTMLElement | null {
	return item.querySelector('[data-completed-date]');
}

function getPeriodLabelEl(item: HTMLElement): HTMLElement | null {
	return item.querySelector('[data-period-label]');
}

function getDueDateEl(item: HTMLElement): HTMLElement | null {
	return item.querySelector('[data-due-date]');
}

function getSummaryEl(): HTMLElement | null {
	return document.getElementById('goal-summary');
}

function readSummaryMeta(): SummaryMeta | null {
	const el = getSummaryEl();
	if (!el?.dataset.goalId) return null;
	return {
		goalId: el.dataset.goalId,
		savedCents: Number(el.dataset.savedCents ?? 0),
		targetCents: Number(el.dataset.targetCents ?? 0),
		currency: el.dataset.currency ?? 'BRL',
		locale: el.dataset.locale ?? 'pt-BR',
		progressTemplate: el.dataset.progressTemplate ?? '{percent}%',
		completedAtTemplate: el.dataset.completedAtTemplate ?? '{day} de {month} de {year}',
	};
}

function writeSummaryMeta(meta: SummaryMeta): void {
	const el = getSummaryEl();
	if (!el) return;
	el.dataset.savedCents = String(meta.savedCents);
	el.dataset.targetCents = String(meta.targetCents);
}

export function applyCompletedState(item: HTMLElement, period: PeriodSummary, depositUrl: string): void {
	resetSwipeTransform(item);
	item.classList.add('is-completed');
	delete item.dataset.depositUrl;
	item.dataset.undoUrl = depositUrl;

	const labelEl = getPeriodLabelEl(item);
	if (labelEl && item.dataset.depositedLabel) {
		labelEl.textContent = item.dataset.depositedLabel;
	}

	const dueEl = getDueDateEl(item);
	if (dueEl) dueEl.hidden = true;

	const dateEl = getCompletedDateEl(item);
	if (dateEl && period.completed_at_label) {
		dateEl.textContent = period.completed_at_label;
		dateEl.hidden = false;
	}
}

export function applyPendingState(item: HTMLElement, depositUrl: string): void {
	resetSwipeTransform(item);
	item.classList.remove('is-completed');
	item.dataset.depositUrl = depositUrl;
	delete item.dataset.undoUrl;

	const labelEl = getPeriodLabelEl(item);
	if (labelEl && item.dataset.pendingLabel) {
		labelEl.textContent = item.dataset.pendingLabel;
	}

	const dueEl = getDueDateEl(item);
	if (dueEl) {
		if (item.dataset.dueDateLabel) dueEl.textContent = item.dataset.dueDateLabel;
		dueEl.hidden = false;
	}

	const dateEl = getCompletedDateEl(item);
	if (dateEl) {
		dateEl.textContent = '';
		dateEl.hidden = true;
	}
}

export function updateGoalSummary(goal: GoalSummary): void {
	const summary = getSummaryEl();
	const meta = readSummaryMeta();
	if (!summary || !meta) return;

	summary.querySelector<HTMLElement>('[data-goal-target]')!.textContent = goal.target_amount_label;
	summary.querySelector<HTMLElement>('[data-goal-saved]')!.textContent = goal.saved_amount_label;
	summary.querySelector<HTMLElement>('[data-goal-progress-text]')!.textContent = goal.progress_label;
	const bar = summary.querySelector<HTMLElement>('[data-goal-progress-bar]');
	if (bar) bar.style.width = `${goal.progress_percent}%`;

	writeSummaryMeta({
		...meta,
		savedCents: goal.saved_amount_cents,
		targetCents: goal.target_amount_cents,
	});
}

function updateSummaryOptimistic(savedCents: number, meta: SummaryMeta): void {
	const summary = getSummaryEl();
	if (!summary) return;

	const percent = progressPercent(savedCents, meta.targetCents);
	summary.querySelector<HTMLElement>('[data-goal-saved]')!.textContent = formatMoneyCents(
		savedCents,
		meta.currency,
		meta.locale,
	);
	summary.querySelector<HTMLElement>('[data-goal-progress-text]')!.textContent = formatProgressLabel(
		savedCents,
		meta.targetCents,
		meta.progressTemplate,
	);
	const bar = summary.querySelector<HTMLElement>('[data-goal-progress-bar]');
	if (bar) bar.style.width = `${percent}%`;

	writeSummaryMeta({ ...meta, savedCents });
}

function goalCacheKey(goalId: string): string {
	return `goal:${goalId}`;
}

function persistGoalCache(goalId: string, meta: SummaryMeta): void {
	const periods: GoalOptimisticCache['periods'] = {};
	document.querySelectorAll<HTMLElement>('[data-swipe-item]').forEach((item) => {
		const periodId = item.dataset.periodId;
		if (!periodId) return;
		const dateEl = getCompletedDateEl(item);
		if (item.classList.contains('is-completed')) {
			periods[periodId] = {
				status: 'completed',
				completed_at_label: dateEl?.textContent ?? undefined,
			};
		}
	});

	setCache(goalCacheKey(goalId), {
		saved_amount_cents: meta.savedCents,
		periods,
	} satisfies GoalOptimisticCache);
}

export function captureGoalDetailState(): GoalDetailSnapshot | null {
	const meta = readSummaryMeta();
	if (!meta) return null;

	const periods: PeriodSnapshot[] = [];
	document.querySelectorAll<HTMLElement>('[data-swipe-item]').forEach((item) => {
		const id = item.dataset.periodId;
		if (!id) return;
		const dateEl = getCompletedDateEl(item);
		const labelEl = getPeriodLabelEl(item);
		const dueEl = getDueDateEl(item);
		periods.push({
			id,
			isCompleted: item.classList.contains('is-completed'),
			depositUrl: item.dataset.depositUrl,
			undoUrl: item.dataset.undoUrl,
			dateText: dateEl?.textContent ?? '',
			dateHidden: dateEl?.hidden ?? true,
			labelText: labelEl?.textContent ?? '',
			dueDateHidden: dueEl?.hidden ?? true,
		});
	});

	return { summary: { ...meta }, periods };
}

export function restoreGoalDetailState(snapshot: GoalDetailSnapshot): void {
	writeSummaryMeta(snapshot.summary);
	updateSummaryOptimistic(snapshot.summary.savedCents, snapshot.summary);

	for (const p of snapshot.periods) {
		const item = document.querySelector<HTMLElement>(`[data-period-id="${p.id}"]`);
		if (!item) continue;

		if (p.isCompleted) {
			item.classList.add('is-completed');
			delete item.dataset.depositUrl;
			if (p.undoUrl) item.dataset.undoUrl = p.undoUrl;
		} else {
			item.classList.remove('is-completed');
			delete item.dataset.undoUrl;
			if (p.depositUrl) item.dataset.depositUrl = p.depositUrl;
		}

		const dateEl = getCompletedDateEl(item);
		if (dateEl) {
			dateEl.textContent = p.dateText;
			dateEl.hidden = p.dateHidden;
		}

		const labelEl = getPeriodLabelEl(item);
		if (labelEl) labelEl.textContent = p.labelText;

		const dueEl = getDueDateEl(item);
		if (dueEl) dueEl.hidden = p.dueDateHidden;
	}

	persistGoalCache(snapshot.summary.goalId, snapshot.summary);
}

export function hydrateGoalDetailFromCache(): void {
	const meta = readSummaryMeta();
	if (!meta) return;

	const cache = getCache<GoalOptimisticCache>(goalCacheKey(meta.goalId));
	if (!cache) return;

	updateSummaryOptimistic(cache.saved_amount_cents, meta);

	for (const [periodId, period] of Object.entries(cache.periods)) {
		const item = document.querySelector<HTMLElement>(`[data-period-id="${periodId}"]`);
		if (!item) continue;

		if (period.status === 'completed') {
			const depositUrl = item.dataset.depositUrl ?? item.dataset.undoUrl ?? '';
			applyCompletedState(
				item,
				{
					id: periodId,
					status: 'completed',
					completed_at: null,
					completed_at_label: period.completed_at_label ?? null,
				},
				depositUrl,
			);
		}
	}
}

function getDefaultErrorMessage(): string {
	const timeline = document.getElementById('goal-timeline');
	const raw = timeline?.dataset.depositLabels;
	if (!raw) return 'Something went wrong';
	try {
		const labels = JSON.parse(raw) as { defaultMsg?: string };
		return labels.defaultMsg ?? 'Something went wrong';
	} catch {
		return 'Something went wrong';
	}
}

function buildOptimisticPeriod(item: HTMLElement, meta: SummaryMeta, completed: boolean): PeriodSummary {
	const now = new Date().toISOString();
	const label = completed
		? formatGoalCreatedAtLabel(now, meta.locale, meta.completedAtTemplate)
		: null;
	return {
		id: item.dataset.periodId ?? '',
		status: completed ? 'completed' : 'pending',
		completed_at: completed ? now : null,
		completed_at_label: label,
	};
}

export function confirmDeposit(item: HTMLElement, url: string): void {
	const meta = readSummaryMeta();
	if (!meta) return;

	const amountCents = Number(item.dataset.amountCents ?? 0);
	const snapshot = captureGoalDetailState();
	if (!snapshot) return;

	const storageKey = goalCacheKey(meta.goalId);
	saveSnapshot(storageKey, snapshot);

	const period = buildOptimisticPeriod(item, meta, true);
	applyCompletedState(item, period, url);
	const newSaved = meta.savedCents + amountCents;
	const updatedMeta = { ...meta, savedCents: newSaved };
	updateSummaryOptimistic(newSaved, updatedMeta);
	persistGoalCache(meta.goalId, updatedMeta);

	playConfettiCelebration();

	void runOptimisticMutation<DepositResponsePayload>({
		storageKey,
		rollback: () => restoreGoalDetailState(snapshot),
		request: { url, method: 'POST' },
		onSuccess: (data) => {
			applyCompletedState(item, data.period, url);
			updateGoalSummary(data.goal);
			const reconciled = readSummaryMeta();
			if (reconciled) persistGoalCache(meta.goalId, reconciled);
		},
		errorMessage: getDefaultErrorMessage(),
	});
}

export function undoDeposit(item: HTMLElement, url: string): void {
	const meta = readSummaryMeta();
	if (!meta) return;

	const amountCents = Number(item.dataset.amountCents ?? 0);
	const snapshot = captureGoalDetailState();
	if (!snapshot) return;

	const storageKey = goalCacheKey(meta.goalId);
	saveSnapshot(storageKey, snapshot);

	const newSaved = Math.max(0, meta.savedCents - amountCents);
	const updatedMeta = { ...meta, savedCents: newSaved };
	applyPendingState(item, url);
	updateSummaryOptimistic(newSaved, updatedMeta);
	persistGoalCache(meta.goalId, updatedMeta);

	void runOptimisticMutation<DepositResponsePayload>({
		storageKey,
		rollback: () => restoreGoalDetailState(snapshot),
		request: { url, method: 'DELETE' },
		onSuccess: (data) => {
			applyPendingState(item, url);
			updateGoalSummary(data.goal);
			const reconciled = readSummaryMeta();
			if (reconciled) persistGoalCache(meta.goalId, reconciled);
		},
		errorMessage: getDefaultErrorMessage(),
	});
}
