CREATE TABLE admin_users (
 id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, password_changed_at INTEGER NOT NULL
);
CREATE TABLE admin_sessions (
 token_hash TEXT PRIMARY KEY, admin_id TEXT NOT NULL REFERENCES admin_users(id),
 created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE INDEX admin_sessions_owner ON admin_sessions(admin_id);
CREATE TABLE admin_rate_limits (
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
ALTER TABLE purchases ADD COLUMN grant_source TEXT NOT NULL DEFAULT 'payment';
ALTER TABLE purchases ADD COLUMN admin_format TEXT;
ALTER TABLE purchases ADD COLUMN admin_id TEXT REFERENCES admin_users(id);
CREATE UNIQUE INDEX admin_draft_grant ON purchases(admin_id,draft_id,mode) WHERE grant_source='admin';
