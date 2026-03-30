use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct UserRow {
    pub user_id: Uuid,
    pub auth_mode: String,
    pub adult_confirmed: bool,
    pub email: Option<String>,
    pub password_hash: Option<String>,
    pub locale: String,
    pub timezone: String,
    pub plan: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct PlantRow {
    pub plant_id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub color_tag: String,
    pub start_date: DateTime<Utc>,
    pub phase: String,
    pub phase_week: Option<i32>,
    pub plant_status: String,
    pub is_active: bool,
    pub archived: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct TaskRow {
    pub task_id: Uuid,
    pub plant_id: Uuid,
    pub title: String,
    pub category: String,
    pub due_at: DateTime<Utc>,
    pub repeat_interval_hours: Option<i32>,
    pub notification_enabled: bool,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LogRow {
    pub log_id: Uuid,
    pub plant_id: Uuid,
    pub log_type: String,
    pub text: Option<String>,
    pub metrics_json: Option<serde_json::Value>,
    pub action_json: Option<serde_json::Value>,
    pub photo_refs_json: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}


#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct DeletedRow {
    pub record_id: Uuid,
    pub user_id: Uuid,
    pub entity_kind: String,
    pub operation: String,
    pub changed_at: DateTime<Utc>,
}


#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SubscriptionHistoryRow {
    pub event_id: Uuid,
    pub user_id: Uuid,
    pub event_kind: String,
    pub plan: String,
    pub previous_plan: Option<String>,
    pub checkout_id: Option<String>,
    pub provider: Option<String>,
    pub checkout_status: Option<String>,
    pub message: Option<String>,
    pub created_at: DateTime<Utc>,
}
