ALTER TABLE plants ADD COLUMN plant_status TEXT DEFAULT 'active';
UPDATE plants
SET plant_status = CASE
  WHEN archived = 1 THEN 'archived'
  WHEN is_active = 1 THEN 'active'
  ELSE 'ended'
END
WHERE plant_status IS NULL OR plant_status = '';
CREATE INDEX IF NOT EXISTS idx_plants_user_status ON plants(user_id, plant_status);
