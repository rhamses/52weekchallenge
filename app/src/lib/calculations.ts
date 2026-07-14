import type { SavingsMode } from './types';

export interface InstallmentPlan {
	period_count: number;
	installment_cents: number;
	period_type: 'week' | 'month';
}

function daysBetween(start: Date, end: Date): number {
	const ms = end.getTime() - start.getTime();
	return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function weeksBetween(start: Date, end: Date): number {
	return Math.max(1, Math.ceil(daysBetween(start, end) / 7));
}

function monthsBetween(start: Date, end: Date): number {
	const months =
		(end.getFullYear() - start.getFullYear()) * 12 +
		(end.getMonth() - start.getMonth());
	const adjusted = end.getDate() < start.getDate() ? months : months + 1;
	return Math.max(1, adjusted);
}

export function calculateInstallmentPlan(
	targetAmountCents: number,
	savingsMode: SavingsMode,
	customDeadline: string | null,
): InstallmentPlan {
	if (customDeadline) {
		const start = new Date();
		start.setHours(0, 0, 0, 0);
		const end = new Date(customDeadline);
		end.setHours(0, 0, 0, 0);

		if (savingsMode === 'monthly') {
			const period_count = monthsBetween(start, end);
			return {
				period_count,
				installment_cents: Math.ceil(targetAmountCents / period_count),
				period_type: 'month',
			};
		}

		const period_count = weeksBetween(start, end);
		return {
			period_count,
			installment_cents: Math.ceil(targetAmountCents / period_count),
			period_type: 'week',
		};
	}

	if (savingsMode === 'monthly') {
		return {
			period_count: 12,
			installment_cents: Math.ceil(targetAmountCents / 12),
			period_type: 'month',
		};
	}

	return {
		period_count: 52,
		installment_cents: Math.ceil(targetAmountCents / 52),
		period_type: 'week',
	};
}

export function generatePeriodDueDates(
	startDate: Date,
	periodCount: number,
	periodType: 'week' | 'month',
): string[] {
	const dates: string[] = [];
	const cursor = new Date(startDate);
	cursor.setHours(0, 0, 0, 0);

	for (let i = 0; i < periodCount; i++) {
		if (periodType === 'week') {
			const d = new Date(cursor);
			d.setDate(d.getDate() + i * 7);
			dates.push(d.toISOString().slice(0, 10));
		} else {
			const d = new Date(cursor);
			d.setMonth(d.getMonth() + i);
			dates.push(d.toISOString().slice(0, 10));
		}
	}

	return dates;
}

export function formatMoney(cents: number, currency: string, locale: string): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(cents / 100);
}

export function progressPercent(saved: number, target: number): number {
	if (target <= 0) return 0;
	return Math.min(100, Math.round((saved / target) * 100));
}

export function formatGoalCreatedAtLabel(
	iso: string,
	locale: string,
	template: string,
): string {
	const d = new Date(iso);
	const day = String(d.getDate());
	const year = String(d.getFullYear());
	const month = d
		.toLocaleDateString(locale, { month: 'short' })
		.replace(/\.$/, '')
		.replace(/^\w/, (c) => c.toUpperCase());

	return template.replace('{day}', day).replace('{month}', month).replace('{year}', year);
}

export function generateId(): string {
	return crypto.randomUUID();
}
