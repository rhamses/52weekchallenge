-- 52 Week Challenge schema (f2w_ prefix on shared domain-monitor D1)

CREATE TABLE IF NOT EXISTS f2w_users (
  id TEXT PRIMARY KEY,
  cognito_sub TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  email_verified INTEGER DEFAULT 0,
  locale TEXT DEFAULT 'en-US',
  default_currency TEXT DEFAULT 'USD',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS f2w_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES f2w_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS f2w_account (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES f2w_users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TEXT,
  refresh_token_expires_at TEXT,
  scope TEXT,
  id_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider_id, account_id)
);

CREATE TABLE IF NOT EXISTS f2w_verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS f2w_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES f2w_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount_cents INTEGER NOT NULL,
  currency_code TEXT NOT NULL,
  savings_mode TEXT NOT NULL CHECK (savings_mode IN ('weekly', 'monthly')),
  deadline_date TEXT,
  period_count INTEGER NOT NULL,
  installment_cents INTEGER NOT NULL,
  saved_amount_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS f2w_goal_periods (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES f2w_goals(id) ON DELETE CASCADE,
  period_index INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month')),
  due_date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at TEXT,
  UNIQUE(goal_id, period_index)
);

CREATE TABLE IF NOT EXISTS f2w_deposits (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES f2w_goals(id) ON DELETE CASCADE,
  period_id TEXT NOT NULL UNIQUE REFERENCES f2w_goal_periods(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  note TEXT,
  deposited_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS f2w_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES f2w_users(id) ON DELETE CASCADE,
  goal_id TEXT REFERENCES f2w_goals(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('reminder', 'milestone', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  dedup_key TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS f2w_user_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES f2w_users(id) ON DELETE CASCADE,
  sns_endpoint_arn TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_f2w_goals_user_status ON f2w_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_f2w_goal_periods_goal_due ON f2w_goal_periods(goal_id, due_date, status);
CREATE INDEX IF NOT EXISTS idx_f2w_notifications_user_created ON f2w_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_f2w_deposits_goal ON f2w_deposits(goal_id);
CREATE INDEX IF NOT EXISTS idx_f2w_session_user ON f2w_session(user_id);
CREATE INDEX IF NOT EXISTS idx_f2w_notifications_dedup ON f2w_notifications(dedup_key);
