import { playConfettiCelebration } from './lottie';
import type { DepositResponsePayload } from '@/lib/deposit-response';

type GoalSummary = DepositResponsePayload['goal'];
type PeriodSummary = DepositResponsePayload['period'];

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

export function applyCompletedState(item: HTMLElement, period: PeriodSummary, depositUrl: string): void {
	resetSwipeTransform(item);
	item.classList.add('is-completed');
	delete item.dataset.depositUrl;
	item.dataset.undoUrl = depositUrl;

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

	const dateEl = getCompletedDateEl(item);
	if (dateEl) {
		dateEl.textContent = '';
		dateEl.hidden = true;
	}
}

export function updateGoalSummary(goal: GoalSummary): void {
	const summary = document.getElementById('goal-summary');
	if (!summary) return;

	summary.querySelector<HTMLElement>('[data-goal-target]')!.textContent = goal.target_amount_label;
	summary.querySelector<HTMLElement>('[data-goal-saved]')!.textContent = goal.saved_amount_label;
	summary.querySelector<HTMLElement>('[data-goal-progress-text]')!.textContent = goal.progress_label;
	const bar = summary.querySelector<HTMLElement>('[data-goal-progress-bar]');
	if (bar) bar.style.width = `${goal.progress_percent}%`;
}

export function showDepositError(message: string): void {
	document.dispatchEvent(
		new CustomEvent('deposit-error', { detail: { message } }),
	);
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
	try {
		const data = (await res.json()) as { error?: string };
		return data.error ?? fallback;
	} catch {
		return fallback;
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

export async function confirmDeposit(item: HTMLElement, url: string): Promise<void> {
	const fallback = getDefaultErrorMessage();

	try {
		const res = await fetch(url, { method: 'POST', credentials: 'same-origin' });

		if (!res.ok) {
			revertSwipeItem(item);
			showDepositError(await parseErrorMessage(res, fallback));
			return;
		}

		const data = (await res.json()) as DepositResponsePayload;
		applyCompletedState(item, data.period, url);
		updateGoalSummary(data.goal);
		playConfettiCelebration();
	} catch {
		revertSwipeItem(item);
		showDepositError(fallback);
	}
}

export async function undoDeposit(item: HTMLElement, url: string): Promise<void> {
	const fallback = getDefaultErrorMessage();

	try {
		const res = await fetch(url, { method: 'DELETE', credentials: 'same-origin' });

		if (!res.ok) {
			revertSwipeItem(item);
			showDepositError(await parseErrorMessage(res, fallback));
			return;
		}

		const data = (await res.json()) as DepositResponsePayload;
		applyPendingState(item, url);
		updateGoalSummary(data.goal);
	} catch {
		revertSwipeItem(item);
		showDepositError(fallback);
	}
}
