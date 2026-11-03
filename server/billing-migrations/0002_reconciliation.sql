ALTER TABLE purchases ADD COLUMN last_synced_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX purchases_reconcile ON purchases(status,last_synced_at);
