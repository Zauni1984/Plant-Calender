CREATE TABLE IF NOT EXISTS deleted_records (
  record_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  entity_kind TEXT NOT NULL,
  operation TEXT NOT NULL DEFAULT 'delete',
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (record_id, entity_kind)
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_user_changed
  ON deleted_records(user_id, changed_at DESC);
