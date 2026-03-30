CREATE TABLE IF NOT EXISTS deleted_records (
  record_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  entity_kind TEXT NOT NULL,
  operation TEXT NOT NULL DEFAULT 'delete',
  changed_at TEXT NOT NULL,
  PRIMARY KEY (record_id, entity_kind)
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_user_changed
  ON deleted_records(user_id, changed_at DESC);
