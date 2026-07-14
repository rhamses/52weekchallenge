# 52 Week Challenge — Landing page

Static Astro marketing site deployed as a Cloudflare Worker (`52week-landing-page`) with Workers Static Assets.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `PUBLIC_APP_URL` | Base URL of the app (default `https://52weekchallenge.app`) |
| `PUBLIC_APP_LOGIN_URL` | Login / account-creation URL (default `https://52weekchallenge.app/login`) |

`PUBLIC_*` values are baked in at **build** time. Change `.env` (or CI env) and rebuild to update CTA links.

## Deploy

```bash
npm run deploy
```

Worker name: `52week-landing-page`

## Locales

| Path | Locale |
|------|--------|
| `/` | pt-BR (default) |
| `/en-US/` | en-US |
| `/es-ES/` | es-ES |
