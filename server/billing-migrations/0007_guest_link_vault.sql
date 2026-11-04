-- Existing invitations remain valid. Their one-way hashes cannot recover old tokens.
ALTER TABLE delivery_guests ADD COLUMN access_encrypted TEXT;
