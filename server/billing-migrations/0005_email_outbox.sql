ALTER TABLE purchases ADD COLUMN email_notifications INTEGER NOT NULL DEFAULT 0;
CREATE TABLE email_outbox (
 id TEXT PRIMARY KEY,
 purchase_id TEXT NOT NULL REFERENCES purchases(id),
 kind TEXT NOT NULL CHECK(kind='purchase-approved'),
 created_at INTEGER NOT NULL,
 next_attempt_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0,
 lease_until INTEGER NOT NULL DEFAULT 0,
 lease_token TEXT,
 sent_at INTEGER,
 message_id TEXT,
 last_error TEXT
);
CREATE INDEX email_outbox_pending ON email_outbox(sent_at,next_attempt_at);
