import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DEV_VARS_PATH = resolve(__dirname, '../../.dev.vars');

function trimQuotes(value: string): string {
	const trimmed = value.trim();
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
}

export function loadDevVars(filePath = DEFAULT_DEV_VARS_PATH): Record<string, string> {
	if (!existsSync(filePath)) {
		throw new Error(
			`Arquivo .dev.vars não encontrado em ${filePath}. Copie .dev.vars.example e preencha as credenciais.`,
		);
	}

	const vars: Record<string, string> = {};

	for (const rawLine of readFileSync(filePath, 'utf8').split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#') || !line.includes('=')) continue;

		const eqIndex = line.indexOf('=');
		const key = line.slice(0, eqIndex).trim();
		const value = trimQuotes(line.slice(eqIndex + 1));
		if (key) vars[key] = value;
	}

	return vars;
}

const VALID_AWS_REGIONS = new Set([
	'us-east-1',
	'us-east-2',
	'us-west-1',
	'us-west-2',
	'sa-east-1',
	'eu-west-1',
	'eu-west-2',
	'eu-central-1',
	'ap-southeast-1',
	'ap-southeast-2',
	'ap-northeast-1',
]);

export function validateAwsRegion(region: string): string[] {
	const issues: string[] = [];

	if (!region) {
		issues.push('AWS_REGION está vazio');
		return issues;
	}

	if (region === 'us-sa-1') {
		issues.push('AWS_REGION=us-sa-1 parece incorreto — use sa-east-1 (São Paulo)');
	}

	if (!VALID_AWS_REGIONS.has(region) && !/^[\w-]+-\w+-\d+$/.test(region)) {
		issues.push(`AWS_REGION "${region}" não parece um código de região AWS válido`);
	}

	return issues;
}

export function requireDevVar(vars: Record<string, string>, key: string): string {
	const value = vars[key]?.trim();
	if (!value) {
		throw new Error(`Variável obrigatória ausente em .dev.vars: ${key}`);
	}
	return value;
}
