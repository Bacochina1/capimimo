PRAGMA foreign_keys=ON;
CREATE TABLE purchases (
 id TEXT PRIMARY KEY, access_hash TEXT NOT NULL, idempotency_hash TEXT NOT NULL UNIQUE,
 draft_id TEXT NOT NULL, plan_id TEXT NOT NULL, amount_cents INTEGER NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('test','live')), email TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked','failed')),
 mp_id TEXT UNIQUE, mp_user_id TEXT, checkout_url TEXT, lease_until INTEGER,
 webhook_verified INTEGER NOT NULL DEFAULT 0, remote_updated INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL, approved_at INTEGER
);
CREATE INDEX purchases_draft ON purchases(draft_id);
CREATE TABLE deliveries (
 id TEXT PRIMARY KEY, purchase_id TEXT NOT NULL UNIQUE REFERENCES purchases(id),
 public_id TEXT NOT NULL UNIQUE, object_key TEXT NOT NULL, recipient TEXT NOT NULL,
 format TEXT NOT NULL, size_bytes INTEGER NOT NULL, revision INTEGER NOT NULL DEFAULT 1,
 created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
);
CREATE TABLE delivery_guests (
 id TEXT PRIMARY KEY, delivery_id TEXT NOT NULL REFERENCES deliveries(id),
 access_hash TEXT NOT NULL, name TEXT NOT NULL, allowed_count INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'invited', attending_count INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL
);
CREATE INDEX delivery_guests_parent ON delivery_guests(delivery_id);
CREATE TABLE billing_rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE orphaned_deliveries (object_key TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
