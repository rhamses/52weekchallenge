// @ts-check

import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  site: "https://52week-landing-page.amb1.workers.dev",
  integrations: [
    robotsTxt(),
    sitemap({
      entryLimit: 1000,
      changefreq: "weekly",
      priority: 0.7,
    }),
  ],
  i18n: {
    defaultLocale: "pt-BR",
    locales: ["pt-BR", "en-US", "es-ES"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
