import type { Locale } from './i18n';
import { getDictionary, localeHomePath } from './i18n';
export const LOGO_ICON = '/img/logo-icon.png';
export const LOGO_FULL = '/img/logo.png';

export function getNavMenu(locale: Locale) {
	const dict = getDictionary(locale);
	const home = localeHomePath(locale);
	return [
		{ name: dict.nav_features, href: `${home}#features` },
		// { name: dict.nav_how, href: `${home}#how-it-works` },
		// { name: dict.nav_reviews, href: `${home}#reviews` },
		{ name: dict.nav_faq, href: `${home}#faq` },
	];
}
