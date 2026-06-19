# 52 Week Challenge

A PWA for weekly savings goals, built with **Astro 6** on Cloudflare Workers, with a scheduled monitoring worker for reminders.

## Repository structure

```
├── frontend/     # Astro SSR PWA (Tailwind, Alpine.js, htmx)
├── monitoring/   # Cron worker (daily UTC midnight reminders)
└── _docs/        # Design references and original spec
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Astro 6, Tailwind CSS, Alpine.js, htmx |
| Hosting | Cloudflare Workers (`@astrojs/cloudflare`) |
| Database | Cloudflare D1 (`domain-monitor`, tables prefixed `f2w_`) |
| Cache | Cloudflare KV (`f2w:*` keys) |
| Client cache | localStorage + Service Worker |
| Auth | Better Auth + AWS Cognito (Google/Facebook/Apple via `identity_provider`) |
| Email | AWS SES |
| Push (web) | Web Push + VAPID (`web-push`) |
| Push (mobile, future) | AWS SNS |

## Data flow

1. **Read:** localStorage → KV → D1  
2. **Write:** optimistic localStorage → API → D1 → KV invalidate  
3. **Offline:** pending ops queue in localStorage, replay on reconnect

## Getting started

### Frontend

```bash
cd frontend
cp .dev.vars.example .dev.vars   # fill in Cognito + AWS credentials
npm install
npm run db:migrate:local         # apply D1 migrations locally
npm run dev
```

### Monitoring worker

```bash
cd monitoring
cp .dev.vars.example .dev.vars
npm install
npm run dev
```

### Deploy

```bash
cd frontend && npm run build && npx wrangler deploy
cd monitoring && npx wrangler deploy
```

## Environment variables

See `frontend/.dev.vars.example` and `monitoring/.dev.vars.example`.

| Variable | Purpose |
|----------|---------|
| `BETTER_AUTH_URL` | OAuth callback base URL (dev: `http://localhost:4321`) |
| `COGNITO_*` | Cognito User Pool OAuth (Better Auth generic OAuth) |
| `AUTH_SECRET` | Better Auth session signing |
| `AWS_*` | SES email + SNS push |
| `SES_FROM_EMAIL` | Sender address |
| `SNS_PLATFORM_ARN` | SNS platform app (iOS/Android, future) |
| `VAPID_PUBLIC_KEY` | Web Push public key (also in `wrangler.toml` [vars]) |
| `VAPID_PRIVATE_KEY` | Web Push private key (secret) |
| `VAPID_SUBJECT` | VAPID contact (`mailto:…`) |

### PWA setup

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Set `VAPID_PUBLIC_KEY` in `frontend/wrangler.toml` and `monitoring/wrangler.toml` `[vars]`
3. Set `VAPID_PRIVATE_KEY` via `wrangler secret put VAPID_PRIVATE_KEY` on **both** workers
4. Apply migration `0004_user_devices_web_push.sql`
5. Verify in Chrome DevTools → Application → Manifest / Service Workers
6. Lighthouse PWA audit: installable, SW registered

**Features:** `public/sw.js` (offline shell, push, background sync), `site.webmanifest` (standalone + splash via `background_color`), install prompt, push permission banner after login.

**Push flow:** browser subscribes with VAPID → `POST /api/devices/register` → D1 `f2w_user_devices.push_subscription` → monitoring cron sends via `web-push`.

SNS (`SNS_PLATFORM_ARN`) remains for future native iOS/Android apps.

### Cognito App Client URLs

Register these in the Cognito App Client (Allowed callback URLs):

- `http://localhost:4321/api/auth/oauth2/callback/cognito-google`
- `http://localhost:4321/api/auth/oauth2/callback/cognito-facebook`
- `http://localhost:4321/api/auth/oauth2/callback/cognito-apple`
- `https://52weekchallenge.app/api/auth/oauth2/callback/cognito-google`
- `https://52weekchallenge.app/api/auth/oauth2/callback/cognito-facebook`
- `https://52weekchallenge.app/api/auth/oauth2/callback/cognito-apple`

Allowed sign-out URLs:

- `http://localhost:4321/welcome`
- `https://52weekchallenge.app/welcome`

Sign out is handled by Better Auth at `POST /api/auth/sign-out`.

## Database

All tables use the `f2w_` prefix on the shared D1 database `domain-monitor`:

- `f2w_ba_user`, `f2w_session`, `f2w_account`, `f2w_verification` — Better Auth
- `f2w_users` — app profile (synced from Better Auth on login)
- `f2w_goals`, `f2w_goal_periods`, `f2w_deposits`
- `f2w_notifications`, `f2w_user_devices`

Migrations: `0001_init.sql` (app schema), `0002_better_auth.sql` (Better Auth tables).

## App routes

| Route | Screen |
|-------|--------|
| `/` | PWA splash loader |
| `/welcome` | Welcome / hero |
| `/goals/new` | Goal setup (slider, currency, deadline) |
| `/login` | Social login |
| `/terms` | Terms and conditions |
| `/goals` | Goal list |
| `/goals/[id]` | Goal detail + swipe deposits |
| `/notifications` | Notification list |

## License

Private project.
