export type Locale = 'pt-BR' | 'en-US' | 'es-ES';

export const DEFAULT_LOCALE: Locale = 'pt-BR';

export const LOCALES: { code: Locale; label: string; emoji: string; path: string }[] = [
	{ code: 'pt-BR', label: 'Português', emoji: '🇧🇷', path: '/' },
	{ code: 'en-US', label: 'English', emoji: '🇺🇸', path: '/en-US/' },
	{ code: 'es-ES', label: 'Español', emoji: '🇪🇸', path: '/es-ES/' },
];
