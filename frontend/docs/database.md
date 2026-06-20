# Database schema — 52 Week Challenge

All tables use the `f2w_` prefix on the shared D1 database `domain-monitor`.

## Migrations

| File | Purpose |
|------|---------|
| [0001_init.sql](../migrations/0001_init.sql) | App tables (`f2w_users`, goals, notifications, etc.) |
| [0002_better_auth.sql](../migrations/0002_better_auth.sql) | Better Auth tables (replaces legacy auth schema) |

## Tables

| Table | Purpose |
|-------|---------|
| `f2w_ba_user` | Better Auth user records |
| `f2w_session` | Better Auth sessions |
| `f2w_account` | OAuth provider accounts (Cognito IdPs) |
| `f2w_verification` | Verification tokens |
| `f2w_users` | App users (synced from Better Auth; FK target for goals) |
| `f2w_goals` | Savings goals |
| `f2w_goal_periods` | Weekly/monthly deposit slots |
| `f2w_deposits` | Recorded deposits |
| `f2w_notifications` | In-app notifications |
| `f2w_user_devices` | SNS push endpoints |

## KV cache keys

- `f2w:user:{userId}:goals` — goal list (TTL 5 min)
- `f2w:goal:{goalId}` — goal detail (TTL 5 min)
- `f2w:goal:{goalId}:periods` — goal periods (TTL 5 min)
- `f2w:user:{userId}:notifications` — notifications (TTL 2 min)

## Apply migrations

```bash
npm run db:migrate:local   # local D1
npm run db:migrate:remote  # production D1
```
