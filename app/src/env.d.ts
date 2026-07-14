/// <reference types="@cloudflare/workers-types" />
/// <reference path="../.astro/types.d.ts" />

declare module 'cloudflare:workers' {
	interface Env {
		DB: D1Database;
		CACHE: KVNamespace;
		SITE_URL: string;
		BETTER_AUTH_URL?: string;
		AUTH_SECRET: string;
		COGNITO_CLIENT_ID: string;
		COGNITO_CLIENT_SECRET: string;
		COGNITO_DOMAIN: string;
		COGNITO_USER_POOL_ID: string;
		AWS_ACCESS_KEY_ID: string;
		AWS_SECRET_ACCESS_KEY: string;
		AWS_REGION: string;
		SES_FROM_EMAIL: string;
		SNS_PLATFORM_ARN: string;
		VAPID_PUBLIC_KEY: string;
		VAPID_PRIVATE_KEY: string;
		VAPID_SUBJECT: string;
	}
}

declare namespace App {
	interface Locals {
		user: import('./lib/types').User | null;
		locale: import('./lib/types').Locale;
		cfContext: ExecutionContext;
	}
}
