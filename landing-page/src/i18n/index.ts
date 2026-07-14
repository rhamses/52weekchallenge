import type { Locale } from './types';
import { DEFAULT_LOCALE, LOCALES } from './types';
import ptBR from './pt-BR.json';
import enUS from './en-US.json';
import esES from './es-ES.json';

const dictionaries = {
	'pt-BR': ptBR,
	'en-US': enUS,
	'es-ES': esES,
} as const;

export type Dictionary = typeof enUS;

export { DEFAULT_LOCALE, LOCALES };
export type { Locale };

export function resolveLocale(value: string | null | undefined): Locale {
	if (value === 'pt-BR' || value === 'en-US' || value === 'es-ES') return value;
	return DEFAULT_LOCALE;
}

export function getDictionary(locale: string | null | undefined): Dictionary {
	return dictionaries[resolveLocale(locale)];
}

export function t(
	locale: string | null | undefined,
	key: keyof Dictionary,
	vars?: Record<string, string | number>,
): string {
	const dict = getDictionary(locale);
	let text = dict[key] ?? String(key);
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			text = text.replace(`{${k}}`, String(v));
		}
	}
	return text;
}

export function localeHomePath(locale: Locale): string {
	return LOCALES.find((l) => l.code === locale)?.path ?? '/';
}

export function getAppLoginUrl(): string {
	return (
		import.meta.env.PUBLIC_APP_LOGIN_URL ||
		`${import.meta.env.PUBLIC_APP_URL || 'https://52weekchallenge.app'}/login`
	);
}

export function getAppUrl(): string {
	return import.meta.env.PUBLIC_APP_URL || 'https://52weekchallenge.app';
}

export function getAppTermsUrl(): string {
	return `${getAppUrl().replace(/\/$/, '')}/terms`;
}
