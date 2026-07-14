import defaultTheme from 'tailwindcss/defaultTheme';

const palette = {
	background: '#F5F7FB',
	card: '#FFFFFF',
	cardStrong: '#EFF4FB',
	text: '#0F172A',
	muted: '#475569',
	primary: '#16A34A',
	primaryDark: '#15803D',
	secondary: '#0EA5E9',
	accent: '#1E3A8A',
	border: '#E2E8F0',
	welcome: '#7CB342',
};

/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			fontFamily: {
				display: ['"Sora"', ...defaultTheme.fontFamily.sans],
				body: ['"Inter"', ...defaultTheme.fontFamily.sans],
			},
			colors: {
				brand: palette,
			},
			boxShadow: {
				glow: '0 15px 55px rgba(15, 23, 42, 0.12)',
				card: '0 25px 60px rgba(15, 23, 42, 0.08)',
			},
			borderRadius: {
				'4xl': '2rem',
			},
		},
	},
	plugins: [],
};
