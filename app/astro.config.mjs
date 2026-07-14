// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	site: 'https://52weekchallenge.app',
	output: 'server',
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
		sessionKVBindingName: 'CACHE',
	}),
	integrations: [],
	vite: {
		resolve: {
			alias: {
				'@': fileURLToPath(new URL('./src', import.meta.url)),
			},
		},
		optimizeDeps: {
			exclude: ['@aws-sdk/client-ses', '@aws-sdk/client-sns'],
		},
		ssr: {
			external: ['@aws-sdk/client-ses', '@aws-sdk/client-sns', 'node:crypto'],
		},
	},
});
