-- Preserve the selected product when recovering an unpublished purchase.
-- Existing orders remain NULL; no format is guessed for previous buyers.
ALTER TABLE purchases ADD COLUMN requested_format TEXT CHECK(requested_format IS NULL OR requested_format IN ('stories','cartao','livro','convite'));
