CREATE TABLE customer_users (
 id TEXT PRIMARY KEY,
 email_normalized TEXT NOT NULL UNIQUE,
 verified_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE customer_sessions (
 token_hash TEXT PRIMARY KEY,
 customer_id TEXT NOT NULL REFERENCES customer_users(id),
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL
);
CREATE INDEX customer_sessions_owner ON customer_sessions(customer_id);
CREATE TABLE customer_challenges (
 id TEXT PRIMARY KEY,
 email_normalized TEXT NOT NULL,
 code_hmac TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 consumed_at INTEGER
);
CREATE INDEX customer_challenges_email ON customer_challenges(email_normalized,created_at);
CREATE TABLE customer_rate_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
-- Do not infer ownership from legacy, unverified purchase emails.
ALTER TABLE purchases ADD COLUMN customer_id TEXT REFERENCES customer_users(id);
CREATE INDEX purchases_customer ON purchases(customer_id,created_at);
