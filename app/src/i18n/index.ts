import type { Locale } from './types';
import ptBR from './pt-BR.json';
import enUS from './en-US.json';
import esES from './es-ES.json';

const dictionaries = {
	'pt-BR': ptBR,
	'en-US': enUS,
	'es-ES': esES,
} as const;

export type Dictionary = typeof enUS;

export function resolveLocale(value: string | null | undefined): Locale {
	if (value === 'pt-BR' || value === 'es-ES') return value;
	return 'en-US';
}

export function getDictionary(locale: string | null | undefined): Dictionary {
	const key = resolveLocale(locale);
	return dictionaries[key];
}

export function t(
	locale: string | null | undefined,
	key: string,
	vars?: Record<string, string | number>,
): string {
	const dict = getDictionary(locale) as Record<string, string>;
	let text = dict[key] ?? key;
	if (vars) {
		for (const [k, v] of Object.entries(vars)) {
			text = text.replace(`{${k}}`, String(v));
		}
	}
	return text;
}

export const LOCALES: { code: Locale; label: string; emoji: string; logo: string }[] = [
	{ code: 'pt-BR', label: 'Português', emoji: '🇧🇷', logo: '/logos/logo-pt-br.svg' },
	{ code: 'en-US', label: 'English', emoji: '🇺🇸', logo: '/logos/logo-en-us.svg' },
	{ code: 'es-ES', label: 'Español', emoji: '🇪🇸', logo: '/logos/logo-es-es.svg' },
];

export function getLocaleFromCookie(cookies: string): Locale {
	const match = cookies.match(/(?:^|;\s*)f2w_locale=([^;]+)/);
	return resolveLocale(match ? decodeURIComponent(match[1]) : null);
}

export function localeCookie(code: Locale): string {
	return `f2w_locale=${code}; Max-Age=31536000; Path=/; SameSite=Lax`;
}
