import { env } from 'cloudflare:workers';

const COGNITO_ENV_KEYS = ['COGNITO_DOMAIN', 'COGNITO_CLIENT_ID', 'COGNITO_CLIENT_SECRET'] as const;

export class AuthConfigError extends Error {
	constructor(missing: string[]) {
		super(
			`Missing auth environment variable(s): ${missing.join(', ')}. ` +
				'Set public values in wrangler.toml [vars] and secrets with `wrangler secret put`.',
		);
		this.name = 'AuthConfigError';
	}
}

export function normalizeCognitoDomain(domain: string): string {
	return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

export function isCognitoOAuthConfigured(): boolean {
	return COGNITO_ENV_KEYS.every((key) => Boolean(env[key]));
}

export function getMissingCognitoEnvKeys(): string[] {
	return COGNITO_ENV_KEYS.filter((key) => !env[key]);
}

export function requireCognitoOAuthConfig(): {
	domain: string;
	clientId: string;
	clientSecret: string;
} {
	const missing = getMissingCognitoEnvKeys();
	if (missing.length > 0) {
		throw new AuthConfigError([...missing]);
	}

	return {
		domain: normalizeCognitoDomain(env.COGNITO_DOMAIN!),
		clientId: env.COGNITO_CLIENT_ID!,
		clientSecret: env.COGNITO_CLIENT_SECRET!,
	};
}

export function requireAuthSecret(): string {
	if (!env.AUTH_SECRET) {
		throw new AuthConfigError(['AUTH_SECRET']);
	}
	return env.AUTH_SECRET;
}

export function authBaseUrl(): string {
	return env.BETTER_AUTH_URL ?? env.SITE_URL ?? 'http://localhost:4321';
}

export function authTrustedOrigins(): string[] {
	const origins = new Set([
		authBaseUrl(),
		env.SITE_URL,
		'http://localhost:4321',
		'https://52weekchallenge.app',
	].filter(Boolean) as string[]);

	return [...origins];
}
