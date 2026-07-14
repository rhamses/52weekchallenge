-- Better Auth schema alignment (f2w_ prefix, camelCase columns)

DROP INDEX IF EXISTS idx_f2w_session_user;

DROP TABLE IF EXISTS f2w_verification;
DROP TABLE IF EXISTS f2w_account;
DROP TABLE IF EXISTS f2w_session;

CREATE TABLE f2w_ba_user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL
);

CREATE TABLE f2w_session (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt DATE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES f2w_ba_user(id) ON DELETE CASCADE
);

CREATE TABLE f2w_account (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES f2w_ba_user(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt DATE,
  refreshTokenExpiresAt DATE,
  scope TEXT,
  password TEXT,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL,
  UNIQUE(providerId, accountId)
);

CREATE TABLE f2w_verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt DATE NOT NULL,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL
);

CREATE INDEX idx_f2w_session_userId ON f2w_session(userId);
CREATE INDEX idx_f2w_session_token ON f2w_session(token);
CREATE INDEX idx_f2w_account_userId ON f2w_account(userId);
CREATE INDEX idx_f2w_verification_identifier ON f2w_verification(identifier);
