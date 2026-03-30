CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  auth_mode TEXT NOT NULL,
  adult_confirmed INTEGER NOT NULL DEFAULT 0,
  locale TEXT NOT NULL DEFAULT 'de-DE',
  timezone TEXT NOT NULL DEFAULT 'Europe/Berlin',
  plan TEXT NOT NULL DEFAULT 'free',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  plan TEXT NOT NULL,
  current_period_start TEXT,
  current_period_end TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plants (
  plant_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color_tag TEXT NOT NULL,
  start_date TEXT NOT NULL,
  phase TEXT NOT NULL,
  phase_week INTEGER,
  is_active INTEGER NOT NULL DEFAULT 1,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_plants_user_updated ON plants(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_plants_user_active ON plants(user_id, is_active, archived);

CREATE TABLE IF NOT EXISTS tasks (
  task_id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  due_at TEXT NOT NULL,
  repeat_interval_hours INTEGER,
  notification_enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(plant_id) REFERENCES plants(plant_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_tasks_plant_due ON tasks(plant_id, due_at);

CREATE TABLE IF NOT EXISTS logs (
  log_id TEXT PRIMARY KEY,
  plant_id TEXT NOT NULL,
  log_type TEXT NOT NULL,
  text TEXT,
  metrics_json TEXT,
  action_json TEXT,
  photo_refs_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(plant_id) REFERENCES plants(plant_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_logs_plant_created ON logs(plant_id, created_at DESC);
