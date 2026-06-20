import { describe, expect, it } from 'vitest';
import {
	buildOverdueTableHtml,
	formatAmountCents,
	formatOverdueSummary,
} from './overdue-table';

describe('formatAmountCents', () => {
	it('formats cents as decimal amount', () => {
		expect(formatAmountCents(1050)).toBe('10.50');
		expect(formatAmountCents(0)).toBe('0.00');
	});
});

describe('buildOverdueTableHtml', () => {
	it('returns empty string when there are no overdue periods', () => {
		expect(buildOverdueTableHtml([])).toBe('');
	});

	it('generates a table with one row per overdue period', () => {
		const html = buildOverdueTableHtml([
			{ period_index: 1, due_date: '2026-06-01', amount_cents: 500 },
			{ period_index: 2, due_date: '2026-06-08', amount_cents: 1000 },
		]);

		expect(html).toContain('<table');
		expect(html).toContain('Overdue periods');
		expect(html).toContain('2026-06-01');
		expect(html).toContain('2026-06-08');
		expect(html).toContain('5.00');
		expect(html).toContain('10.00');
		expect(html.match(/<tr/g)?.length).toBe(3);
	});
});

describe('formatOverdueSummary', () => {
	it('returns empty string when there are no overdue periods', () => {
		expect(formatOverdueSummary([])).toBe('');
	});

	it('uses singular copy for one overdue period', () => {
		expect(
			formatOverdueSummary([{ period_index: 1, due_date: '2026-06-01', amount_cents: 100 }]),
		).toBe(' You also have 1 overdue period.');
	});

	it('uses plural copy for multiple overdue periods', () => {
		expect(
			formatOverdueSummary([
				{ period_index: 1, due_date: '2026-06-01', amount_cents: 100 },
				{ period_index: 2, due_date: '2026-06-08', amount_cents: 200 },
			]),
		).toBe(' You also have 2 overdue periods.');
	});
});
