PRAGMA foreign_keys = ON;
CREATE TABLE orders (
 id TEXT PRIMARY KEY,
 access_hash TEXT NOT NULL,
 idempotency_hash TEXT NOT NULL UNIQUE,
 plan_id TEXT NOT NULL CHECK(plan_id IN ('mimo','historia','celebrar')),
 amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
 email TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','revoked')),
 preference_id TEXT,
 checkout_url TEXT,
 preference_lease INTEGER,
 payment_id TEXT UNIQUE,
 created_at INTEGER NOT NULL,
 approved_at INTEGER
);
CREATE TABLE gifts (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
 edit_hash TEXT NOT NULL,
 public_id TEXT NOT NULL UNIQUE,
 revision INTEGER NOT NULL DEFAULT 1,
 draft_json TEXT NOT NULL,
 published_json TEXT,
 published_revision INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 published_at INTEGER,
 expires_at INTEGER,
 deleted_at INTEGER
);
CREATE TABLE assets (
 id TEXT PRIMARY KEY,
 gift_id TEXT NOT NULL REFERENCES gifts(id),
 object_key TEXT NOT NULL UNIQUE,
 mime TEXT NOT NULL CHECK(mime IN ('image/jpeg','image/png','image/webp')),
 size_bytes INTEGER NOT NULL CHECK(size_bytes > 0),
 created_at INTEGER NOT NULL
);
CREATE INDEX assets_gift ON assets(gift_id);
CREATE TABLE guests (
 id TEXT PRIMARY KEY,
 gift_id TEXT NOT NULL REFERENCES gifts(id),
 token_hash TEXT NOT NULL,
 name TEXT NOT NULL,
 allowed_count INTEGER NOT NULL DEFAULT 1 CHECK(allowed_count BETWEEN 1 AND 10),
 status TEXT NOT NULL DEFAULT 'invited' CHECK(status IN ('invited','accepted','declined')),
 attending_count INTEGER NOT NULL DEFAULT 0 CHECK(attending_count BETWEEN 0 AND 10),
 updated_at INTEGER NOT NULL
);
CREATE INDEX guests_gift ON guests(gift_id);
