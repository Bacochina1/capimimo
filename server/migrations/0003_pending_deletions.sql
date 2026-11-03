-- Durable cleanup queue keeps object deletion retryable after storage failures.
CREATE TABLE pending_deletions (
 object_key TEXT PRIMARY KEY,
 gift_id TEXT NOT NULL REFERENCES gifts(id),
 created_at INTEGER NOT NULL
);
CREATE INDEX pending_deletions_gift ON pending_deletions(gift_id);
