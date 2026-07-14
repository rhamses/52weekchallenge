/** Client-side mirrors of lib/calculations.ts for optimistic UI updates. */

export function formatMoneyCents(cents: number, currency: string, locale: string): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	}).format(cents / 100);
}

export function formatProgressLabel(saved: number, target: number, template: string): string {
	if (target <= 0) return template.replace('{percent}', '0');
	const percent = Math.min(100, Math.round((saved / target) * 100));
	return template.replace('{percent}', String(percent));
}

export function formatCompletedDate(iso: string, locale: string): string {
	const d = new Date(iso);
	return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatGoalCreatedAtLabel(iso: string, locale: string, template: string): string {
	const d = new Date(iso);
	const day = String(d.getDate());
	const year = String(d.getFullYear());
	const month = d
		.toLocaleDateString(locale, { month: 'short' })
		.replace(/\.$/, '')
		.replace(/^\w/, (c) => c.toUpperCase());
	return template.replace('{day}', day).replace('{month}', month).replace('{year}', year);
}

export function progressPercent(saved: number, target: number): number {
	if (target <= 0) return 0;
	return Math.min(100, Math.round((saved / target) * 100));
}
