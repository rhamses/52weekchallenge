import { env } from 'cloudflare:workers';
import type { Env } from './types';

/** Cloudflare bindings (Astro v6 — use instead of Astro.locals.runtime.env). */
export function getWorkerEnv(): Env {
	return env as Env;
}
