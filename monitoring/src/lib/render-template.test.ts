import { describe, expect, it } from 'vitest';
import { renderTemplate } from './render-template';

describe('renderTemplate', () => {
	it('replaces all placeholders', () => {
		const result = renderTemplate('Hello {{name}}, goal {{goalTitle}}', {
			name: 'Alice',
			goalTitle: 'Vacation',
		});

		expect(result).toBe('Hello Alice, goal Vacation');
	});

	it('replaces repeated placeholders', () => {
		const result = renderTemplate('{{x}} and {{x}}', { x: 'yes' });
		expect(result).toBe('yes and yes');
	});

	it('leaves unknown placeholders unchanged', () => {
		const result = renderTemplate('Hello {{name}}', {});
		expect(result).toBe('Hello {{name}}');
	});
});
