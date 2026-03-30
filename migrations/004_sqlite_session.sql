CREATE TABLE IF NOT EXISTS app_session (
  session_key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  auth_mode TEXT NOT NULL,
  access_token TEXT NOT NULL,
  backend_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
