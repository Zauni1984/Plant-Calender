CREATE TABLE IF NOT EXISTS subscription_history (
    event_id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_kind TEXT NOT NULL,
    plan TEXT NOT NULL,
    previous_plan TEXT NULL,
    checkout_id TEXT NULL,
    provider TEXT NULL,
    checkout_status TEXT NULL,
    message TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_history_user_created_at
    ON subscription_history(user_id, created_at DESC);
