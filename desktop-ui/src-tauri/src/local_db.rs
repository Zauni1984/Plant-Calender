use chrono::Utc;
use rusqlite::{params, Connection};
use shared::{
    AuthMode, DirtyRecord, LogEntry, LogType, Plant, PlantPhase, PlantStatus, SubscriptionPlan, SyncCursor,
    SyncEntityKind, SyncEnvelope, SyncOperation, SyncPushRequest, Task, TaskCategory, TaskStatus,
    UserProfile,
};
use uuid::Uuid;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StoredSession {
    pub session_key: String,
    pub user_id: Uuid,
    pub auth_mode: AuthMode,
    pub access_token: String,
    pub backend_url: String,
    pub created_at: chrono::DateTime<Utc>,
    pub updated_at: chrono::DateTime<Utc>,
}


#[derive(Debug, Clone, serde::Serialize)]
pub struct ReminderCandidate {
    pub task_id: Uuid,
    pub plant_id: Uuid,
    pub title: String,
    pub category: String,
    pub due_at: chrono::DateTime<Utc>,
    pub overdue: bool,
    pub minutes_until_due: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct DirtyBreakdown {
    pub plants: usize,
    pub tasks: usize,
    pub logs: usize,
    pub deletes: usize,
}

pub struct LocalStore {
    conn: Connection,
}

fn parse_plant_status(value: &str, is_active: bool, archived: bool) -> PlantStatus {
    PlantStatus::from_storage_value(value, is_active, archived)
}

fn plant_status_str(value: PlantStatus) -> &'static str {
    value.as_str()
}

impl LocalStore {
    pub fn open(path: impl AsRef<std::path::Path>) -> anyhow::Result<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch(include_str!("../../../../migrations/001_sqlite_init.sql"))?;
        conn.execute_batch(include_str!("../../../../migrations/002_sqlite_tombstones.sql"))?;
        conn.execute_batch(include_str!("../../../../migrations/004_sqlite_session.sql"))?;
        conn.execute_batch(include_str!("../../../../migrations/005_sqlite_sync_cursor.sql"))?;
        conn.execute_batch(include_str!("../../../../migrations/006_sqlite_plant_status.sql"))?;
        conn.execute_batch(include_str!("../../../../migrations/007_sqlite_plant_status_legacy_backfill.sql"))?;
        Ok(Self { conn })
    }

    pub fn get_or_create_guest_user(&self) -> anyhow::Result<UserProfile> {
        let guest_id = Uuid::nil();
        let mut stmt = self.conn.prepare(
            "SELECT user_id, auth_mode, adult_confirmed, locale, timezone, plan, created_at, updated_at FROM users WHERE user_id = ?1",
        )?;
        let mut rows = stmt.query(params![guest_id.to_string()])?;
        if let Some(row) = rows.next()? {
            return Ok(UserProfile {
                user_id: Uuid::parse_str(&row.get::<_, String>(0)?)?,
                auth_mode: match row.get::<_, String>(1)?.as_str() {
                    "email" => AuthMode::Email,
                    "google" => AuthMode::Google,
                    _ => AuthMode::Anonymous,
                },
                adult_confirmed: row.get::<_, i64>(2)? == 1,
                locale: row.get(3)?,
                timezone: row.get(4)?,
                plan: match row.get::<_, String>(5)?.as_str() {
                    "basic" => SubscriptionPlan::Basic,
                    "pro" => SubscriptionPlan::Pro,
                    "csc" => SubscriptionPlan::Csc,
                    _ => SubscriptionPlan::Free,
                },
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            });
        }

        let now = Utc::now();
        self.conn.execute(
            "INSERT INTO users (user_id, auth_mode, adult_confirmed, locale, timezone, plan, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            params![guest_id.to_string(), "anonymous", 1, "de-DE", "Europe/Berlin", "free", now, now],
        )?;

        Ok(UserProfile {
            user_id: guest_id,
            auth_mode: AuthMode::Anonymous,
            adult_confirmed: true,
            locale: "de-DE".into(),
            timezone: "Europe/Berlin".into(),
            plan: SubscriptionPlan::Free,
            created_at: now,
            updated_at: now,
        })
    }

    pub fn link_authenticated_user(&self, user_id: Uuid, auth_mode: AuthMode) -> anyhow::Result<()> {
        let now = Utc::now();
        self.conn.execute(
            "INSERT OR REPLACE INTO users (user_id, auth_mode, adult_confirmed, locale, timezone, plan, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,COALESCE((SELECT created_at FROM users WHERE user_id = ?1), ?7),?8)",
            params![
                user_id.to_string(),
                match auth_mode { AuthMode::Anonymous => "anonymous", AuthMode::Email => "email", AuthMode::Google => "google" },
                1,
                "de-DE",
                "Europe/Berlin",
                "free",
                now,
                now,
            ],
        )?;
        self.conn.execute(
            "UPDATE plants SET user_id = ?2, updated_at = ?3 WHERE user_id = ?1",
            params![Uuid::nil().to_string(), user_id.to_string(), now],
        )?;
        self.mark_all_guest_records_dirty(user_id)?;
        Ok(())
    }

    pub fn mark_all_guest_records_dirty(&self, _new_user_id: Uuid) -> anyhow::Result<()> {
        for plant in self.list_plants()? {
            self.mark_dirty(DirtyRecord {
                record_id: plant.plant_id,
                entity_kind: SyncEntityKind::Plant,
                operation: SyncOperation::Upsert,
                changed_at: Utc::now(),
            })?;
        }
        Ok(())
    }




    pub fn load_last_sync_cursor(&self) -> anyhow::Result<Option<SyncCursor>> {
        let mut stmt = self.conn.prepare("SELECT meta_value FROM app_meta WHERE meta_key = 'last_sync_at' LIMIT 1")?;
        let mut rows = stmt.query([])?;
        let last_synced_at = if let Some(row) = rows.next()? {
            let raw: String = row.get(0)?;
            Some(chrono::DateTime::parse_from_rfc3339(&raw)?.with_timezone(&Utc))
        } else {
            None
        };

        let session = self.load_session()?;
        Ok(Some(SyncCursor {
            user_id: session.as_ref().map(|s| s.user_id),
            device_id: Some("desktop-dev".into()),
            last_synced_at,
        }))
    }

    pub fn save_last_sync_cursor(&self, cursor: &SyncCursor) -> anyhow::Result<()> {
        if let Some(last_synced_at) = cursor.last_synced_at {
            let now = Utc::now();
            self.conn.execute(
                "INSERT OR REPLACE INTO app_meta (meta_key, meta_value, updated_at) VALUES (?1,?2,?3)",
                params!["last_sync_at", last_synced_at.to_rfc3339(), now.to_rfc3339()],
            )?;
        }
        Ok(())
    }

    pub fn save_session(&self, user_id: Uuid, auth_mode: AuthMode, access_token: String, backend_url: String) -> anyhow::Result<StoredSession> {
        let now = Utc::now();
        let session = StoredSession {
            session_key: "active".into(),
            user_id,
            auth_mode,
            access_token,
            backend_url,
            created_at: now,
            updated_at: now,
        };
        let auth_mode_value = match session.auth_mode {
            AuthMode::Anonymous => "anonymous",
            AuthMode::Email => "email",
            AuthMode::Google => "google",
        };
        self.conn.execute(
            "INSERT OR REPLACE INTO app_session (session_key, user_id, auth_mode, access_token, backend_url, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,COALESCE((SELECT created_at FROM app_session WHERE session_key = ?1), ?6),?7)",
            params![
                &session.session_key,
                session.user_id.to_string(),
                auth_mode_value,
                &session.access_token,
                &session.backend_url,
                now,
                now,
            ],
        )?;
        Ok(session)
    }

    pub fn load_session(&self) -> anyhow::Result<Option<StoredSession>> {
        let mut stmt = self.conn.prepare("SELECT session_key, user_id, auth_mode, access_token, backend_url, created_at, updated_at FROM app_session WHERE session_key = 'active' LIMIT 1")?;
        let mut rows = stmt.query([])?;
        if let Some(row) = rows.next()? {
            let auth_mode = match row.get::<_, String>(2)?.as_str() {
                "email" => AuthMode::Email,
                "google" => AuthMode::Google,
                _ => AuthMode::Anonymous,
            };
            return Ok(Some(StoredSession {
                session_key: row.get(0)?,
                user_id: Uuid::parse_str(&row.get::<_, String>(1)?)?,
                auth_mode,
                access_token: row.get(3)?,
                backend_url: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            }));
        }
        Ok(None)
    }

    pub fn clear_session(&self) -> anyhow::Result<()> {
        self.conn.execute("DELETE FROM app_session WHERE session_key = 'active'", [])?;
        Ok(())
    }

    pub fn list_plants(&self) -> anyhow::Result<Vec<Plant>> {
        let mut stmt = self.conn.prepare(
            "SELECT plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at FROM plants WHERE plant_status != 'deleted' ORDER BY updated_at DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Plant {
                plant_id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or(Uuid::nil()),
                user_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or(Uuid::nil()),
                name: row.get(2)?,
                color_tag: row.get(3)?,
                start_date: row.get(4)?,
                phase: match row.get::<_, String>(5)?.as_str() {
                    "seed" => PlantPhase::Seed,
                    "flower" => PlantPhase::Flower,
                    "harvest" => PlantPhase::Harvest,
                    "dry" => PlantPhase::Dry,
                    "cure" => PlantPhase::Cure,
                    "custom" => PlantPhase::Custom,
                    _ => PlantPhase::Veg,
                },
                phase_week: row.get(6)?,
                status: parse_plant_status(&row.get::<_, String>(7)?, row.get::<_, i64>(8)? == 1, row.get::<_, i64>(9)? == 1),
                is_active: row.get::<_, i64>(8)? == 1,
                archived: row.get::<_, i64>(9)? == 1,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            }.normalized())
        })?;
        Ok(rows.flatten().collect())
    }

    pub fn upsert_plant(&self, plant: &Plant) -> anyhow::Result<()> {
        let plant = plant.normalized_ref();
        self.conn.execute(
            "INSERT OR REPLACE INTO plants (plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            params![
                plant.plant_id.to_string(),
                plant.user_id.to_string(),
                &plant.name,
                &plant.color_tag,
                plant.start_date,
                format!("{:?}", plant.phase).to_lowercase(),
                plant.phase_week,
                plant_status_str(plant.status),
                i64::from(plant.is_active_state()),
                i64::from(plant.is_archived_state()),
                plant.created_at,
                plant.updated_at,
            ],
        )?;
        self.mark_dirty(DirtyRecord {
            record_id: plant.plant_id,
            entity_kind: SyncEntityKind::Plant,
            operation: SyncOperation::Upsert,
            changed_at: Utc::now(),
        })?;
        Ok(())
    }




    pub fn cache_upsert_plant(&self, plant: &Plant) -> anyhow::Result<()> {
        let plant = plant.normalized_ref();
        self.conn.execute(
            "INSERT OR REPLACE INTO plants (plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
            params![
                plant.plant_id.to_string(),
                plant.user_id.to_string(),
                &plant.name,
                &plant.color_tag,
                plant.start_date,
                format!("{:?}", plant.phase).to_lowercase(),
                plant.phase_week,
                plant_status_str(plant.status),
                i64::from(plant.is_active_state()),
                i64::from(plant.is_archived_state()),
                plant.created_at,
                plant.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn replace_cached_plants(&self, plants: &[Plant]) -> anyhow::Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute("DELETE FROM plants", [])?;
        for plant in plants {
            tx.execute(
                "INSERT OR REPLACE INTO plants (plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
                params![
                    plant.plant_id.to_string(),
                    plant.user_id.to_string(),
                    &plant.name,
                    &plant.color_tag,
                    plant.start_date,
                    format!("{:?}", plant.phase).to_lowercase(),
                    plant.phase_week,
                    plant_status_str(plant.status),
                    i64::from(plant.is_active_state()),
                    i64::from(plant.is_archived_state()),
                    plant.created_at,
                    plant.updated_at,
                ],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn cache_delete_plant(&self, plant_id: Uuid) -> anyhow::Result<()> {
        self.conn.execute("UPDATE plants SET plant_status = ?2, is_active = 0, archived = 0, updated_at = ?3 WHERE plant_id = ?1", params![plant_id.to_string(), "deleted", Utc::now()])?;
        self.clear_dirty(plant_id)?;
        Ok(())
    }

    pub fn delete_plant(&self, plant_id: Uuid) -> anyhow::Result<()> {
        self.conn.execute("UPDATE plants SET plant_status = ?2, is_active = 0, archived = 0, updated_at = ?3 WHERE plant_id = ?1", params![plant_id.to_string(), "deleted", Utc::now()])?;
        self.record_tombstone(Uuid::nil(), plant_id, SyncEntityKind::Plant)?;
        Ok(())
    }


    pub fn cache_upsert_task(&self, task: &Task) -> anyhow::Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO tasks (task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
            params![
                task.task_id.to_string(),
                task.plant_id.to_string(),
                &task.title,
                format!("{:?}", task.category).to_lowercase(),
                task.due_at,
                task.repeat_interval_hours,
                i64::from(task.notification_enabled),
                format!("{:?}", task.status).to_lowercase(),
                task.created_at,
                task.updated_at,
            ],
        )?;
        Ok(())
    }

    pub fn replace_cached_tasks_for_plant(&self, plant_id: Uuid, tasks: &[Task]) -> anyhow::Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute("DELETE FROM tasks WHERE plant_id = ?1", params![plant_id.to_string()])?;
        for task in tasks {
            tx.execute(
                "INSERT OR REPLACE INTO tasks (task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
                params![
                    task.task_id.to_string(),
                    task.plant_id.to_string(),
                    &task.title,
                    format!("{:?}", task.category).to_lowercase(),
                    task.due_at,
                    task.repeat_interval_hours,
                    i64::from(task.notification_enabled),
                    format!("{:?}", task.status).to_lowercase(),
                    task.created_at,
                    task.updated_at,
                ],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn cache_delete_task(&self, task_id: Uuid) -> anyhow::Result<()> {
        self.conn.execute("DELETE FROM tasks WHERE task_id = ?1", params![task_id.to_string()])?;
        self.clear_dirty(task_id)?;
        Ok(())
    }

    pub fn delete_task(&self, task_id: Uuid) -> anyhow::Result<()> {
        self.conn.execute("DELETE FROM tasks WHERE task_id = ?1", params![task_id.to_string()])?;
        self.record_tombstone(Uuid::nil(), task_id, SyncEntityKind::Task)?;
        Ok(())
    }


    pub fn cache_upsert_log(&self, log: &LogEntry) -> anyhow::Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO logs (log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            params![
                log.log_id.to_string(),
                log.plant_id.to_string(),
                format!("{:?}", log.log_type).to_lowercase(),
                log.text.as_deref(),
                log.metrics.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()),
                log.action.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()),
                log.photo_refs.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()),
                log.created_at,
            ],
        )?;
        Ok(())
    }

    pub fn replace_cached_logs_for_plant(&self, plant_id: Uuid, logs: &[LogEntry]) -> anyhow::Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        tx.execute("DELETE FROM logs WHERE plant_id = ?1", params![plant_id.to_string()])?;
        for log in logs {
            tx.execute(
                "INSERT OR REPLACE INTO logs (log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
                params![
                    log.log_id.to_string(),
                    log.plant_id.to_string(),
                    format!("{:?}", log.log_type).to_lowercase(),
                    log.text.as_deref(),
                    log.metrics.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()),
                    log.action.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()),
                    log.photo_refs.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()),
                    log.created_at,
                ],
            )?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn cache_delete_log(&self, log_id: Uuid) -> anyhow::Result<()> {
        self.conn.execute("DELETE FROM logs WHERE log_id = ?1", params![log_id.to_string()])?;
        self.clear_dirty(log_id)?;
        Ok(())
    }

    pub fn delete_log(&self, log_id: Uuid) -> anyhow::Result<()> {
        self.conn.execute("DELETE FROM logs WHERE log_id = ?1", params![log_id.to_string()])?;
        self.record_tombstone(Uuid::nil(), log_id, SyncEntityKind::Log)?;
        Ok(())
    }

    pub fn record_tombstone(&self, user_id: Uuid, record_id: Uuid, entity_kind: SyncEntityKind) -> anyhow::Result<()> {
        let now = Utc::now();
        self.conn.execute(
            "INSERT OR REPLACE INTO deleted_records (record_id, user_id, entity_kind, operation, changed_at) VALUES (?1,?2,?3,?4,?5)",
            params![record_id.to_string(), user_id.to_string(), format!("{:?}", entity_kind).to_lowercase(), "delete", now],
        )?;
        self.mark_dirty(DirtyRecord {
            record_id,
            entity_kind,
            operation: SyncOperation::Delete,
            changed_at: now,
        })?;
        Ok(())
    }

    pub fn apply_deleted_records(&self, deleted: &[DirtyRecord]) -> anyhow::Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        for item in deleted {
            match item.entity_kind {
                SyncEntityKind::Plant => { tx.execute("DELETE FROM plants WHERE plant_id = ?1", params![item.record_id.to_string()])?; }
                SyncEntityKind::Task => { tx.execute("DELETE FROM tasks WHERE task_id = ?1", params![item.record_id.to_string()])?; }
                SyncEntityKind::Log => { tx.execute("DELETE FROM logs WHERE log_id = ?1", params![item.record_id.to_string()])?; }
            }
            tx.execute("DELETE FROM deleted_records WHERE record_id = ?1 AND entity_kind = ?2", params![item.record_id.to_string(), format!("{:?}", item.entity_kind).to_lowercase()])?;
            tx.execute("DELETE FROM sync_state WHERE record_id = ?1", params![item.record_id.to_string()])?;
        }
        tx.commit()?;
        Ok(())
    }

    pub fn list_tasks(&self) -> anyhow::Result<Vec<Task>> {
        let mut stmt = self.conn.prepare("SELECT task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at FROM tasks ORDER BY updated_at DESC")?;
        let rows = stmt.query_map([], |row| {
            Ok(Task {
                task_id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or(Uuid::nil()),
                plant_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or(Uuid::nil()),
                title: row.get(2)?,
                category: match row.get::<_, String>(3)?.as_str() {
                    "feed" => TaskCategory::Feed,
                    "check" => TaskCategory::Check,
                    "train" => TaskCategory::Train,
                    "note" => TaskCategory::Note,
                    _ => TaskCategory::Water,
                },
                due_at: row.get(4)?,
                repeat_interval_hours: row.get(5)?,
                notification_enabled: row.get::<_, i64>(6)? == 1,
                status: match row.get::<_, String>(7)?.as_str() {
                    "done" => TaskStatus::Done,
                    "skipped" => TaskStatus::Skipped,
                    _ => TaskStatus::Open,
                },
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;
        Ok(rows.flatten().collect())
    }

    pub fn upsert_task(&self, task: &Task) -> anyhow::Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO tasks (task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
            params![
                task.task_id.to_string(),
                task.plant_id.to_string(),
                &task.title,
                format!("{:?}", task.category).to_lowercase(),
                task.due_at,
                task.repeat_interval_hours,
                i64::from(task.notification_enabled),
                format!("{:?}", task.status).to_lowercase(),
                task.created_at,
                task.updated_at,
            ],
        )?;
        self.mark_dirty(DirtyRecord {
            record_id: task.task_id,
            entity_kind: SyncEntityKind::Task,
            operation: SyncOperation::Upsert,
            changed_at: Utc::now(),
        })?;
        Ok(())
    }

    pub fn list_logs(&self) -> anyhow::Result<Vec<LogEntry>> {
        let mut stmt = self.conn.prepare("SELECT log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at FROM logs ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], |row| {
            Ok(LogEntry {
                log_id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or(Uuid::nil()),
                plant_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or(Uuid::nil()),
                log_type: match row.get::<_, String>(2)?.as_str() {
                    "measurement" => LogType::Measurement,
                    "photo" => LogType::Photo,
                    "action" => LogType::Action,
                    _ => LogType::Note,
                },
                text: row.get(3)?,
                metrics: row.get::<_, Option<String>>(4)?.and_then(|v| serde_json::from_str(&v).ok()),
                action: row.get::<_, Option<String>>(5)?.and_then(|v| serde_json::from_str(&v).ok()),
                photo_refs: row.get::<_, Option<String>>(6)?.and_then(|v| serde_json::from_str(&v).ok()),
                created_at: row.get(7)?,
            })
        })?;
        Ok(rows.flatten().collect())
    }

    pub fn upsert_log(&self, log: &LogEntry) -> anyhow::Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO logs (log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at)
             VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
            params![
                log.log_id.to_string(),
                log.plant_id.to_string(),
                format!("{:?}", log.log_type).to_lowercase(),
                log.text.as_deref(),
                log.metrics.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()),
                log.action.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()),
                log.photo_refs.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()),
                log.created_at,
            ],
        )?;
        self.mark_dirty(DirtyRecord {
            record_id: log.log_id,
            entity_kind: SyncEntityKind::Log,
            operation: SyncOperation::Upsert,
            changed_at: Utc::now(),
        })?;
        Ok(())
    }

    pub fn mark_dirty(&self, item: DirtyRecord) -> anyhow::Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO sync_state (record_id, entity_kind, operation, changed_at) VALUES (?1,?2,?3,?4)",
            params![
                item.record_id.to_string(),
                format!("{:?}", item.entity_kind).to_lowercase(),
                format!("{:?}", item.operation).to_lowercase(),
                item.changed_at,
            ],
        )?;
        Ok(())
    }



    pub fn list_deleted_records(&self) -> anyhow::Result<Vec<DirtyRecord>> {
        let mut stmt = self.conn.prepare("SELECT record_id, entity_kind, operation, changed_at FROM deleted_records ORDER BY changed_at ASC")?;
        let rows = stmt.query_map([], |row| {
            let entity_kind: String = row.get(1)?;
            let operation: String = row.get(2)?;
            Ok(DirtyRecord {
                record_id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or(Uuid::nil()),
                entity_kind: match entity_kind.as_str() {
                    "task" => SyncEntityKind::Task,
                    "log" => SyncEntityKind::Log,
                    _ => SyncEntityKind::Plant,
                },
                operation: match operation.as_str() {
                    "delete" => SyncOperation::Delete,
                    _ => SyncOperation::Upsert,
                },
                changed_at: row.get(3)?,
            })
        })?;
        Ok(rows.flatten().collect())
    }

    pub fn list_dirty(&self) -> anyhow::Result<Vec<DirtyRecord>> {
        let mut stmt = self.conn.prepare("SELECT record_id, entity_kind, operation, changed_at FROM sync_state ORDER BY changed_at ASC")?;
        let rows = stmt.query_map([], |row| {
            let entity_kind: String = row.get(1)?;
            let operation: String = row.get(2)?;
            Ok(DirtyRecord {
                record_id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or(Uuid::nil()),
                entity_kind: match entity_kind.as_str() {
                    "task" => SyncEntityKind::Task,
                    "log" => SyncEntityKind::Log,
                    _ => SyncEntityKind::Plant,
                },
                operation: match operation.as_str() {
                    "delete" => SyncOperation::Delete,
                    _ => SyncOperation::Upsert,
                },
                changed_at: row.get(3)?,
            })
        })?;
        Ok(rows.flatten().collect())
    }


    pub fn dirty_breakdown(&self) -> anyhow::Result<DirtyBreakdown> {
        let dirty = self.list_dirty()?;
        let mut plants = 0usize;
        let mut tasks = 0usize;
        let mut logs = 0usize;
        let mut deletes = 0usize;

        for item in dirty {
            if matches!(item.operation, SyncOperation::Delete) {
                deletes += 1;
                continue;
            }
            match item.entity_kind {
                SyncEntityKind::Plant => plants += 1,
                SyncEntityKind::Task => tasks += 1,
                SyncEntityKind::Log => logs += 1,
            }
        }

        Ok(DirtyBreakdown { plants, tasks, logs, deletes })
    }


    pub fn list_dirty_details(&self) -> anyhow::Result<Vec<DirtyRecord>> {
        self.list_dirty()
    }

    pub fn clear_dirty(&self, record_id: Uuid) -> anyhow::Result<()> {
        self.conn.execute("DELETE FROM sync_state WHERE record_id = ?1", params![record_id.to_string()])?;
        Ok(())
    }

    pub fn clear_all_dirty(&self) -> anyhow::Result<()> {
        self.conn.execute("DELETE FROM sync_state", [])?;
        Ok(())
    }

    pub fn clear_confirmed_upserts(&self, payload: &SyncEnvelope) -> anyhow::Result<()> {
        for plant in &payload.plants {
            self.clear_dirty(plant.plant_id)?;
        }
        for task in &payload.tasks {
            self.clear_dirty(task.task_id)?;
        }
        for log in &payload.logs {
            self.clear_dirty(log.log_id)?;
        }
        Ok(())
    }


    fn is_record_dirty(&self, record_id: Uuid) -> anyhow::Result<bool> {
        let mut stmt = self.conn.prepare("SELECT 1 FROM sync_state WHERE record_id = ?1 LIMIT 1")?;
        let mut rows = stmt.query(params![record_id.to_string()])?;
        Ok(rows.next()?.is_some())
    }

    pub fn clear_confirmed_deleted(&self, deleted: &[DirtyRecord]) -> anyhow::Result<()> {
        for item in deleted {
            self.conn.execute(
                "DELETE FROM deleted_records WHERE record_id = ?1 AND entity_kind = ?2",
                params![item.record_id.to_string(), format!("{:?}", item.entity_kind).to_lowercase()],
            )?;
            self.clear_dirty(item.record_id)?;
        }
        Ok(())
    }

    fn get_plant_by_id(&self, plant_id: Uuid) -> anyhow::Result<Option<Plant>> {
        let mut stmt = self.conn.prepare(
            "SELECT plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at FROM plants WHERE plant_id = ?1 AND plant_status != 'deleted' LIMIT 1",
        )?;
        let mut rows = stmt.query(params![plant_id.to_string()])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(Plant {
                plant_id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or(Uuid::nil()),
                user_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or(Uuid::nil()),
                name: row.get(2)?,
                color_tag: row.get(3)?,
                start_date: row.get(4)?,
                phase: match row.get::<_, String>(5)?.as_str() {
                    "seed" => PlantPhase::Seed,
                    "flower" => PlantPhase::Flower,
                    "harvest" => PlantPhase::Harvest,
                    "dry" => PlantPhase::Dry,
                    "cure" => PlantPhase::Cure,
                    "custom" => PlantPhase::Custom,
                    _ => PlantPhase::Veg,
                },
                phase_week: row.get(6)?,
                status: parse_plant_status(&row.get::<_, String>(7)?, row.get::<_, i64>(8)? == 1, row.get::<_, i64>(9)? == 1),
                is_active: row.get::<_, i64>(8)? == 1,
                archived: row.get::<_, i64>(9)? == 1,
                created_at: row.get(10)?,
                updated_at: row.get(11)?,
            }.normalized()));
        }
        Ok(None)
    }

    fn get_task_by_id(&self, task_id: Uuid) -> anyhow::Result<Option<Task>> {
        let mut stmt = self.conn.prepare(
            "SELECT task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at FROM tasks WHERE task_id = ?1 LIMIT 1",
        )?;
        let mut rows = stmt.query(params![task_id.to_string()])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(Task {
                task_id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or(Uuid::nil()),
                plant_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or(Uuid::nil()),
                title: row.get(2)?,
                category: match row.get::<_, String>(3)?.as_str() {
                    "feed" => TaskCategory::Feed,
                    "check" => TaskCategory::Check,
                    "train" => TaskCategory::Train,
                    "note" => TaskCategory::Note,
                    _ => TaskCategory::Water,
                },
                due_at: row.get(4)?,
                repeat_interval_hours: row.get(5)?,
                notification_enabled: row.get::<_, i64>(6)? == 1,
                status: match row.get::<_, String>(7)?.as_str() {
                    "done" => TaskStatus::Done,
                    "skipped" => TaskStatus::Skipped,
                    _ => TaskStatus::Open,
                },
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            }));
        }
        Ok(None)
    }

    fn get_log_by_id(&self, log_id: Uuid) -> anyhow::Result<Option<LogEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at FROM logs WHERE log_id = ?1 LIMIT 1",
        )?;
        let mut rows = stmt.query(params![log_id.to_string()])?;
        if let Some(row) = rows.next()? {
            return Ok(Some(LogEntry {
                log_id: Uuid::parse_str(&row.get::<_, String>(0)?).unwrap_or(Uuid::nil()),
                plant_id: Uuid::parse_str(&row.get::<_, String>(1)?).unwrap_or(Uuid::nil()),
                log_type: match row.get::<_, String>(2)?.as_str() {
                    "measurement" => LogType::Measurement,
                    "photo" => LogType::Photo,
                    "action" => LogType::Action,
                    _ => LogType::Note,
                },
                text: row.get(3)?,
                metrics: row.get::<_, Option<String>>(4)?.and_then(|v| serde_json::from_str(&v).ok()),
                action: row.get::<_, Option<String>>(5)?.and_then(|v| serde_json::from_str(&v).ok()),
                photo_refs: row.get::<_, Option<String>>(6)?.and_then(|v| serde_json::from_str(&v).ok()),
                created_at: row.get(7)?,
            }));
        }
        Ok(None)
    }

    pub fn export_sync_payload(&self, auth_user_id: Option<Uuid>, device_id: Option<String>) -> anyhow::Result<SyncPushRequest> {
        let existing_cursor = self.load_last_sync_cursor()?;
        let dirty_records = self.list_dirty()?;
        let mut plants = Vec::new();
        let mut tasks = Vec::new();
        let mut logs = Vec::new();
        let mut deleted_records = Vec::new();

        for dirty in dirty_records {
            match dirty.operation {
                SyncOperation::Delete => deleted_records.push(dirty),
                SyncOperation::Upsert => match dirty.entity_kind {
                    SyncEntityKind::Plant => {
                        if let Some(plant) = self.get_plant_by_id(dirty.record_id)? {
                            plants.push(plant.normalized());
                        }
                    }
                    SyncEntityKind::Task => {
                        if let Some(task) = self.get_task_by_id(dirty.record_id)? {
                            tasks.push(task);
                        }
                    }
                    SyncEntityKind::Log => {
                        if let Some(log) = self.get_log_by_id(dirty.record_id)? {
                            logs.push(log);
                        }
                    }
                },
            }
        }

        Ok(SyncPushRequest {
            cursor: SyncCursor {
                user_id: auth_user_id,
                device_id,
                last_synced_at: existing_cursor.and_then(|c| c.last_synced_at),
            },
            guest_user_id: Some(Uuid::nil()),
            envelope: SyncEnvelope {
                plants,
                tasks,
                logs,
            },
            deleted_records,
        })
    }

    pub fn apply_sync_pull(&self, payload: &SyncEnvelope, deleted: &[DirtyRecord], cursor: Option<&SyncCursor>) -> anyhow::Result<()> {
        let tx = self.conn.unchecked_transaction()?;
        for plant in &payload.plants {
            if self.is_record_dirty(plant.plant_id)? {
                continue;
            }
            let plant = plant.normalized_ref();
            tx.execute(
                "INSERT OR REPLACE INTO plants (plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)",
                params![plant.plant_id.to_string(), plant.user_id.to_string(), plant.name, plant.color_tag, plant.start_date, format!("{:?}", plant.phase).to_lowercase(), plant.phase_week, plant_status_str(plant.status), i64::from(plant.is_active_state()), i64::from(plant.is_archived_state()), plant.created_at, plant.updated_at],
            )?;
        }
        for task in &payload.tasks {
            if self.is_record_dirty(task.task_id)? {
                continue;
            }
            tx.execute(
                "INSERT OR REPLACE INTO tasks (task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)",
                params![task.task_id.to_string(), task.plant_id.to_string(), task.title, format!("{:?}", task.category).to_lowercase(), task.due_at, task.repeat_interval_hours, i64::from(task.notification_enabled), format!("{:?}", task.status).to_lowercase(), task.created_at, task.updated_at],
            )?;
        }
        for log in &payload.logs {
            if self.is_record_dirty(log.log_id)? {
                continue;
            }
            tx.execute(
                "INSERT OR REPLACE INTO logs (log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)",
                params![log.log_id.to_string(), log.plant_id.to_string(), format!("{:?}", log.log_type).to_lowercase(), log.text.as_deref(), log.metrics.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()), log.action.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()), log.photo_refs.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default()), log.created_at],
            )?;
        }
        for item in deleted {
            if self.is_record_dirty(item.record_id)? {
                continue;
            }
            match item.entity_kind {
                SyncEntityKind::Plant => { tx.execute("DELETE FROM plants WHERE plant_id = ?1", params![item.record_id.to_string()])?; }
                SyncEntityKind::Task => { tx.execute("DELETE FROM tasks WHERE task_id = ?1", params![item.record_id.to_string()])?; }
                SyncEntityKind::Log => { tx.execute("DELETE FROM logs WHERE log_id = ?1", params![item.record_id.to_string()])?; }
            }
            tx.execute("DELETE FROM deleted_records WHERE record_id = ?1 AND entity_kind = ?2", params![item.record_id.to_string(), format!("{:?}", item.entity_kind).to_lowercase()])?;
        }
        tx.commit()?;
        if let Some(cursor) = cursor {
            self.save_last_sync_cursor(cursor)?;
        }
        Ok(())
    }

    fn reminder_delivery_key(task_id: Uuid, due_at: chrono::DateTime<Utc>) -> String {
        format!("reminder_sent:{}:{}", task_id, due_at.to_rfc3339())
    }

    pub fn list_due_notification_candidates(&self, within_minutes: i64) -> anyhow::Result<Vec<ReminderCandidate>> {
        let now = Utc::now();
        let upper = now + chrono::Duration::minutes(within_minutes);
        let tasks = self.list_tasks()?;
        let mut out = Vec::new();
        for task in tasks.into_iter() {
            if !task.notification_enabled || task.status != TaskStatus::Open {
                continue;
            }
            if task.due_at > upper {
                continue;
            }
            let key = Self::reminder_delivery_key(task.task_id, task.due_at);
            let mut stmt = self.conn.prepare("SELECT 1 FROM app_meta WHERE meta_key = ?1 LIMIT 1")?;
            let mut rows = stmt.query(params![key])?;
            if rows.next()?.is_some() {
                continue;
            }
            let minutes_until_due = (task.due_at - now).num_minutes();
            out.push(ReminderCandidate {
                task_id: task.task_id,
                plant_id: task.plant_id,
                title: task.title.clone(),
                category: format!("{:?}", task.category).to_lowercase(),
                due_at: task.due_at,
                overdue: task.due_at < now,
                minutes_until_due,
            });
        }
        out.sort_by_key(|item| item.due_at);
        Ok(out)
    }

    pub fn mark_notification_sent(&self, task_id: Uuid, due_at: chrono::DateTime<Utc>) -> anyhow::Result<()> {
        let now = Utc::now();
        let key = Self::reminder_delivery_key(task_id, due_at);
        self.conn.execute(
            "INSERT OR REPLACE INTO app_meta (meta_key, meta_value, updated_at) VALUES (?1, ?2, ?3)",
            params![key, now.to_rfc3339(), now.to_rfc3339()],
        )?;
        Ok(())
    }

    pub fn clear_notification_sent_for_task(&self, task_id: Uuid) -> anyhow::Result<()> {
        self.conn.execute(
            "DELETE FROM app_meta WHERE meta_key LIKE ?1",
            params![format!("reminder_sent:{}:%", task_id)],
        )?;
        Ok(())
    }

}

pub fn demo_task(plant_id: Uuid) -> Task {
    let now = Utc::now();
    Task {
        task_id: Uuid::new_v4(),
        plant_id,
        title: "Gießen".into(),
        category: TaskCategory::Water,
        due_at: now,
        repeat_interval_hours: Some(48),
        notification_enabled: true,
        status: TaskStatus::Open,
        created_at: now,
        updated_at: now,
    }
}

pub fn demo_log(plant_id: Uuid) -> LogEntry {
    LogEntry {
        log_id: Uuid::new_v4(),
        plant_id,
        log_type: LogType::Note,
        text: Some("Erster lokaler Eintrag".into()),
        metrics: None,
        action: None,
        photo_refs: None,
        created_at: Utc::now(),
    }
}
