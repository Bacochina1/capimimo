-- Atomic guards: a concurrent publish/delete must never create broken media.
CREATE TRIGGER published_photo_exists BEFORE UPDATE OF published_json ON gifts
WHEN NEW.published_json IS NOT NULL
BEGIN
 SELECT CASE WHEN EXISTS (
  SELECT 1 FROM json_each(NEW.published_json,'$.photoIds') p
  WHERE NOT EXISTS (SELECT 1 FROM assets a WHERE a.id=p.value AND a.gift_id=NEW.id)
 ) THEN RAISE(ABORT,'CAPIMIMO_PHOTO_CONFLICT') END;
END;
CREATE TRIGGER published_photo_protected BEFORE DELETE ON assets
BEGIN
 SELECT CASE WHEN EXISTS (
  SELECT 1 FROM gifts g,json_each(g.published_json,'$.photoIds') p
  WHERE g.id=OLD.gift_id AND g.deleted_at IS NULL AND p.value=OLD.id
 ) THEN RAISE(ABORT,'CAPIMIMO_PHOTO_CONFLICT') END;
END;
CREATE TRIGGER active_asset_gift BEFORE INSERT ON assets
BEGIN
 SELECT CASE WHEN NOT EXISTS (
  SELECT 1 FROM gifts g JOIN orders o ON o.id=g.order_id
  WHERE g.id=NEW.gift_id AND g.deleted_at IS NULL AND o.status='approved'
 ) THEN RAISE(ABORT,'CAPIMIMO_GIFT_CONFLICT') END;
END;
