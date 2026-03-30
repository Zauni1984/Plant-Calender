ALTER TABLE plants ADD COLUMN IF NOT EXISTS plant_status TEXT;
UPDATE plants
SET plant_status = CASE
  WHEN archived = TRUE THEN 'archived'
  WHEN is_active = TRUE THEN 'active'
  ELSE 'ended'
END
WHERE plant_status IS NULL OR plant_status = '';
ALTER TABLE plants ALTER COLUMN plant_status SET DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_plants_user_status ON plants(user_id, plant_status);
