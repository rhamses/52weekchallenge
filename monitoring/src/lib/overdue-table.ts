import type { OverduePeriodRow } from './queries';

export function formatAmountCents(cents: number): string {
	return (cents / 100).toFixed(2);
}

export function buildOverdueTableHtml(periods: OverduePeriodRow[]): string {
	if (periods.length === 0) return '';

	const rows = periods
		.map(
			(period) =>
				`<tr>
      <td style="padding: 8px; border: 1px solid #E2E8F0;">${period.period_index}</td>
      <td style="padding: 8px; border: 1px solid #E2E8F0;">${period.due_date}</td>
      <td style="padding: 8px; border: 1px solid #E2E8F0;">${formatAmountCents(period.amount_cents)}</td>
    </tr>`,
		)
		.join('');

	return `<h2 style="color: #0F172A; font-size: 18px; margin-top: 24px;">Overdue periods</h2>
<table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 14px;">
  <thead>
    <tr style="background: #F1F5F9;">
      <th style="padding: 8px; border: 1px solid #E2E8F0; text-align: left;">Period</th>
      <th style="padding: 8px; border: 1px solid #E2E8F0; text-align: left;">Due date</th>
      <th style="padding: 8px; border: 1px solid #E2E8F0; text-align: left;">Amount</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`;
}

export function formatOverdueSummary(periods: OverduePeriodRow[]): string {
	if (periods.length === 0) return '';

	const count = periods.length;
	return count === 1
		? ' You also have 1 overdue period.'
		: ` You also have ${count} overdue periods.`;
}
