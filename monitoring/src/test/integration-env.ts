import type { Env } from '../env';
import { loadDevVars, requireDevVar, validateAwsRegion } from './load-dev-vars';

export interface IntegrationEnv {
	vars: Record<string, string>;
	env: Env;
	testEmail: string | null;
}

export function loadIntegrationEnv(): IntegrationEnv {
	const vars = loadDevVars();

	const env: Env = {
		DB: {} as D1Database,
		AWS_REGION: requireDevVar(vars, 'AWS_REGION'),
		AWS_ACCESS_KEY_ID: requireDevVar(vars, 'AWS_ACCESS_KEY_ID'),
		AWS_SECRET_ACCESS_KEY: requireDevVar(vars, 'AWS_SECRET_ACCESS_KEY'),
		SES_FROM_EMAIL: vars.SES_FROM_EMAIL?.trim() ?? '',
		VAPID_PUBLIC_KEY: vars.VAPID_PUBLIC_KEY?.trim() ?? '',
		VAPID_PRIVATE_KEY: vars.VAPID_PRIVATE_KEY?.trim() ?? '',
		VAPID_SUBJECT: vars.VAPID_SUBJECT?.trim() ?? '',
	};

	return {
		vars,
		env,
		testEmail: vars.TEST_EMAIL?.trim() || null,
	};
}

export function logConfigSummary(vars: Record<string, string>): void {
	const mask = (value: string | undefined) => {
		if (!value) return '(vazio)';
		if (value.length <= 8) return '***';
		return `${value.slice(0, 4)}…${value.slice(-4)}`;
	};

	console.log('\n[SES] Configuração carregada de .dev.vars:');
	console.log(`  AWS_REGION:            ${vars.AWS_REGION || '(vazio)'}`);
	console.log(`  AWS_ACCESS_KEY_ID:     ${mask(vars.AWS_ACCESS_KEY_ID)}`);
	console.log(`  AWS_SECRET_ACCESS_KEY: ${vars.AWS_SECRET_ACCESS_KEY ? '(definido)' : '(vazio)'}`);
	console.log(`  SES_FROM_EMAIL:        ${vars.SES_FROM_EMAIL || '(vazio)'}`);
	console.log(`  TEST_EMAIL:            ${vars.TEST_EMAIL || '(vazio — usa SES_FROM_EMAIL)'}`);

	const regionIssues = validateAwsRegion(vars.AWS_REGION ?? '');
	if (regionIssues.length) {
		console.warn('\n  ⚠ Problemas na região:');
		for (const issue of regionIssues) {
			console.warn(`    • ${issue}`);
		}
	}
}
