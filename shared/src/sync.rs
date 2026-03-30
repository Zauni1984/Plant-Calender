use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{LogEntry, Plant, Task};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SyncEntityKind {
    Plant,
    Task,
    Log,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SyncOperation {
    Upsert,
    Delete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncCursor {
    pub user_id: Option<Uuid>,
    pub device_id: Option<String>,
    pub last_synced_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SyncEnvelope {
    pub plants: Vec<Plant>,
    pub tasks: Vec<Task>,
    pub logs: Vec<LogEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirtyRecord {
    pub record_id: Uuid,
    pub entity_kind: SyncEntityKind,
    pub operation: SyncOperation,
    pub changed_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPushRequest {
    pub cursor: SyncCursor,
    pub guest_user_id: Option<Uuid>,
    pub envelope: SyncEnvelope,
    pub deleted_records: Vec<DirtyRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPullResponse {
    pub cursor: SyncCursor,
    pub envelope: SyncEnvelope,
    pub deleted_records: Vec<DirtyRecord>,
}
