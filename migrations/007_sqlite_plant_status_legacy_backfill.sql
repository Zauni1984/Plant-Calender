UPDATE plants
SET
  plant_status = CASE
    WHEN plant_status IN ('active', 'ended', 'archived', 'deleted') THEN plant_status
    WHEN archived = 1 THEN 'archived'
    WHEN is_active = 1 THEN 'active'
    ELSE 'ended'
  END,
  is_active = CASE WHEN plant_status = 'active' THEN 1 ELSE 0 END,
  archived = CASE WHEN plant_status = 'archived' THEN 1 ELSE 0 END
WHERE 1 = 1;
