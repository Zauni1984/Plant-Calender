CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY,
  auth_mode TEXT NOT NULL,
  adult_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  locale TEXT NOT NULL DEFAULT 'de-DE',
  timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  plan TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plants (
  plant_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_tag TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  phase TEXT NOT NULL,
  phase_week INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plants_user_updated ON plants(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_plants_user_active ON plants(user_id, is_active) WHERE archived = FALSE;

CREATE TABLE IF NOT EXISTS tasks (
  task_id UUID PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES plants(plant_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  repeat_interval_hours INTEGER,
  notification_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_plant_due ON tasks(plant_id, due_at);

CREATE TABLE IF NOT EXISTS logs (
  log_id UUID PRIMARY KEY,
  plant_id UUID NOT NULL REFERENCES plants(plant_id) ON DELETE CASCADE,
  log_type TEXT NOT NULL,
  text TEXT,
  metrics_json JSONB,
  action_json JSONB,
  photo_refs_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_logs_plant_created ON logs(plant_id, created_at DESC);
