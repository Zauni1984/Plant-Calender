UPDATE plants
SET
  plant_status = CASE
    WHEN plant_status IN ('active', 'ended', 'archived', 'deleted') THEN plant_status
    WHEN archived = TRUE THEN 'archived'
    WHEN is_active = TRUE THEN 'active'
    ELSE 'ended'
  END,
  is_active = CASE WHEN plant_status = 'active' THEN TRUE ELSE FALSE END,
  archived = CASE WHEN plant_status = 'archived' THEN TRUE ELSE FALSE END;
