use chrono::{DateTime, Utc};
use shared::{
    ActionInfo, AuthMode, LogEntry, LogType, Metrics, Plant, PlantPhase, PlantStatus, SubscriptionPlan, Task,
    TaskCategory, TaskStatus, UserProfile,
};
use uuid::Uuid;

use super::{models::*, AppState};

fn parse_auth_mode(value: &str) -> AuthMode {
    match value {
        "email" => AuthMode::Email,
        "google" => AuthMode::Google,
        _ => AuthMode::Anonymous,
    }
}

fn auth_mode_str(value: AuthMode) -> &'static str {
    match value {
        AuthMode::Anonymous => "anonymous",
        AuthMode::Email => "email",
        AuthMode::Google => "google",
    }
}

fn parse_plan(value: &str) -> SubscriptionPlan {
    match value {
        "basic" => SubscriptionPlan::Basic,
        "pro" => SubscriptionPlan::Pro,
        "csc" => SubscriptionPlan::Csc,
        _ => SubscriptionPlan::Free,
    }
}

fn plan_str(value: SubscriptionPlan) -> &'static str {
    match value {
        SubscriptionPlan::Free => "free",
        SubscriptionPlan::Basic => "basic",
        SubscriptionPlan::Pro => "pro",
        SubscriptionPlan::Csc => "csc",
    }
}

fn parse_phase(value: &str) -> PlantPhase {
    match value {
        "seed" => PlantPhase::Seed,
        "flower" => PlantPhase::Flower,
        "harvest" => PlantPhase::Harvest,
        "dry" => PlantPhase::Dry,
        "cure" => PlantPhase::Cure,
        "custom" => PlantPhase::Custom,
        _ => PlantPhase::Veg,
    }
}

fn phase_str(value: PlantPhase) -> &'static str {
    match value {
        PlantPhase::Seed => "seed",
        PlantPhase::Veg => "veg",
        PlantPhase::Flower => "flower",
        PlantPhase::Harvest => "harvest",
        PlantPhase::Dry => "dry",
        PlantPhase::Cure => "cure",
        PlantPhase::Custom => "custom",
    }
}

fn parse_plant_status(value: &str, is_active: bool, archived: bool) -> PlantStatus {
    PlantStatus::from_storage_value(value, is_active, archived)
}

fn plant_status_str(value: PlantStatus) -> &'static str {
    value.as_str()
}

fn normalize_plant_status(current: &Plant, requested_status: Option<PlantStatus>) -> PlantStatus {
    shared::resolve_requested_plant_status(current.status, requested_status, None, None)
}

fn parse_category(value: &str) -> TaskCategory {
    match value {
        "feed" => TaskCategory::Feed,
        "check" => TaskCategory::Check,
        "train" => TaskCategory::Train,
        "note" => TaskCategory::Note,
        _ => TaskCategory::Water,
    }
}

fn category_str(value: TaskCategory) -> &'static str {
    match value {
        TaskCategory::Water => "water",
        TaskCategory::Feed => "feed",
        TaskCategory::Check => "check",
        TaskCategory::Train => "train",
        TaskCategory::Note => "note",
    }
}

fn parse_status(value: &str) -> TaskStatus {
    match value {
        "done" => TaskStatus::Done,
        "skipped" => TaskStatus::Skipped,
        _ => TaskStatus::Open,
    }
}

fn status_str(value: TaskStatus) -> &'static str {
    match value {
        TaskStatus::Open => "open",
        TaskStatus::Done => "done",
        TaskStatus::Skipped => "skipped",
    }
}

fn parse_log_type(value: &str) -> LogType {
    match value {
        "measurement" => LogType::Measurement,
        "photo" => LogType::Photo,
        "action" => LogType::Action,
        _ => LogType::Note,
    }
}

fn log_type_str(value: LogType) -> &'static str {
    match value {
        LogType::Note => "note",
        LogType::Measurement => "measurement",
        LogType::Photo => "photo",
        LogType::Action => "action",
    }
}

pub fn user_from_row(row: UserRow) -> UserProfile {
    UserProfile {
        user_id: row.user_id,
        auth_mode: parse_auth_mode(&row.auth_mode),
        adult_confirmed: row.adult_confirmed,
        locale: row.locale,
        timezone: row.timezone,
        plan: parse_plan(&row.plan),
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

pub fn plant_from_row(row: PlantRow) -> Plant {
    Plant {
        plant_id: row.plant_id,
        user_id: row.user_id,
        name: row.name,
        color_tag: row.color_tag,
        start_date: row.start_date,
        phase: parse_phase(&row.phase),
        phase_week: row.phase_week,
        status: parse_plant_status(&row.plant_status, row.is_active, row.archived),
        is_active: row.is_active,
        archived: row.archived,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
    .normalized()
}

pub fn task_from_row(row: TaskRow) -> Task {
    Task {
        task_id: row.task_id,
        plant_id: row.plant_id,
        title: row.title,
        category: parse_category(&row.category),
        due_at: row.due_at,
        repeat_interval_hours: row.repeat_interval_hours,
        notification_enabled: row.notification_enabled,
        status: parse_status(&row.status),
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}

pub fn log_from_row(row: LogRow) -> LogEntry {
    LogEntry {
        log_id: row.log_id,
        plant_id: row.plant_id,
        log_type: parse_log_type(&row.log_type),
        text: row.text,
        metrics: row.metrics_json.and_then(|v| serde_json::from_value::<Metrics>(v).ok()),
        action: row.action_json.and_then(|v| serde_json::from_value::<ActionInfo>(v).ok()),
        photo_refs: row.photo_refs_json.and_then(|v| serde_json::from_value::<Vec<String>>(v).ok()),
        created_at: row.created_at,
    }
}

pub async fn get_user(state: &AppState, user_id: Uuid) -> anyhow::Result<Option<UserProfile>> {
    let row = sqlx::query_as::<_, UserRow>(
        "SELECT user_id, auth_mode, adult_confirmed, email, password_hash, locale, timezone, plan, created_at, updated_at FROM users WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pg)
    .await?;
    Ok(row.map(user_from_row))
}

pub async fn get_or_create_user(state: &AppState, user_id: Uuid, auth_mode: AuthMode) -> anyhow::Result<UserProfile> {
    if let Some(user) = get_user(state, user_id).await? {
        return Ok(user);
    }
    let now = Utc::now();
    sqlx::query(
        "INSERT INTO users (user_id, auth_mode, adult_confirmed, email, password_hash, locale, timezone, plan, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    )
    .bind(user_id)
    .bind(auth_mode_str(auth_mode))
    .bind(false)
    .bind(Option::<String>::None)
    .bind(Option::<String>::None)
    .bind("de-DE")
    .bind("Europe/Berlin")
    .bind("free")
    .bind(now)
    .bind(now)
    .execute(&state.pg)
    .await?;

    Ok(UserProfile {
        user_id,
        auth_mode,
        adult_confirmed: false,
        locale: "de-DE".into(),
        timezone: "Europe/Berlin".into(),
        plan: SubscriptionPlan::Free,
        created_at: now,
        updated_at: now,
    })
}

pub async fn update_adult_confirmation(state: &AppState, user_id: Uuid, adult_confirmed: bool) -> anyhow::Result<UserProfile> {
    sqlx::query("UPDATE users SET adult_confirmed = $2, updated_at = $3 WHERE user_id = $1")
        .bind(user_id)
        .bind(adult_confirmed)
        .bind(Utc::now())
        .execute(&state.pg)
        .await?;
    get_user(state, user_id).await?.ok_or_else(|| anyhow::anyhow!("user not found"))
}

pub async fn upsert_user_plan(state: &AppState, user_id: Uuid, plan: SubscriptionPlan) -> anyhow::Result<()> {
    sqlx::query("UPDATE users SET plan = $2, updated_at = $3 WHERE user_id = $1")
        .bind(user_id)
        .bind(plan_str(plan))
        .bind(Utc::now())
        .execute(&state.pg)
        .await?;
    Ok(())
}

pub async fn active_plant_count(state: &AppState, user_id: Uuid) -> anyhow::Result<i64> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM plants WHERE user_id = $1 AND plant_status = 'active'",
    )
    .bind(user_id)
    .fetch_one(&state.pg)
    .await?;
    Ok(count)
}


pub async fn subscription_status_summary(state: &AppState, user_id: Uuid, plan: SubscriptionPlan) -> anyhow::Result<shared::SubscriptionStatusSummary> {
    let plants = list_plants(state, user_id).await?;
    Ok(shared::subscription_status_summary(&plants, plan))
}

pub async fn list_plants(state: &AppState, user_id: Uuid) -> anyhow::Result<Vec<Plant>> {
    let rows = sqlx::query_as::<_, PlantRow>(
        "SELECT plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at
         FROM plants WHERE user_id = $1 AND plant_status != 'deleted' ORDER BY updated_at DESC",
    )
    .bind(user_id)
    .fetch_all(&state.pg)
    .await?;
    Ok(rows.into_iter().map(plant_from_row).collect())
}

pub async fn get_plant(state: &AppState, user_id: Uuid, plant_id: Uuid) -> anyhow::Result<Option<Plant>> {
    let row = sqlx::query_as::<_, PlantRow>(
        "SELECT plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at
         FROM plants WHERE user_id = $1 AND plant_id = $2 AND plant_status != 'deleted'",
    )
    .bind(user_id)
    .bind(plant_id)
    .fetch_optional(&state.pg)
    .await?;
    Ok(row.map(plant_from_row))
}

pub async fn insert_plant(state: &AppState, plant: &Plant) -> anyhow::Result<()> {
    let plant = plant.normalized_ref();
    sqlx::query(
        "INSERT INTO plants (plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
    )
    .bind(plant.plant_id)
    .bind(plant.user_id)
    .bind(&plant.name)
    .bind(&plant.color_tag)
    .bind(plant.start_date)
    .bind(phase_str(plant.phase))
    .bind(plant.phase_week)
    .bind(plant_status_str(plant.status))
    .bind(plant.is_active_state())
    .bind(plant.is_archived_state())
    .bind(plant.created_at)
    .bind(plant.updated_at)
    .execute(&state.pg)
    .await?;
    Ok(())
}

pub async fn upsert_plant(state: &AppState, plant: &Plant) -> anyhow::Result<()> {
    let plant = plant.normalized_ref();
    sqlx::query(
        "INSERT INTO plants (plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (plant_id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            name = EXCLUDED.name,
            color_tag = EXCLUDED.color_tag,
            start_date = EXCLUDED.start_date,
            phase = EXCLUDED.phase,
            phase_week = EXCLUDED.phase_week,
            plant_status = EXCLUDED.plant_status,
            is_active = EXCLUDED.is_active,
            archived = EXCLUDED.archived,
            updated_at = EXCLUDED.updated_at",
    )
    .bind(plant.plant_id)
    .bind(plant.user_id)
    .bind(&plant.name)
    .bind(&plant.color_tag)
    .bind(plant.start_date)
    .bind(phase_str(plant.phase))
    .bind(plant.phase_week)
    .bind(plant_status_str(plant.status))
    .bind(plant.is_active_state())
    .bind(plant.is_archived_state())
    .bind(plant.created_at)
    .bind(plant.updated_at)
    .execute(&state.pg)
    .await?;
    Ok(())
}

pub async fn update_plant(state: &AppState, user_id: Uuid, plant_id: Uuid, name: Option<String>, color_tag: Option<String>, phase: Option<PlantPhase>, status: Option<PlantStatus>) -> anyhow::Result<Plant> {
    let current = get_plant(state, user_id, plant_id).await?.ok_or_else(|| anyhow::anyhow!("plant not found"))?;
    let updated_name = name.unwrap_or(current.name);
    let updated_color = color_tag.unwrap_or(current.color_tag);
    let updated_phase = phase.unwrap_or(current.phase);
    let updated_status = normalize_plant_status(&current, status);
    let updated_archived = updated_status == PlantStatus::Archived;
    let updated_is_active = updated_status == PlantStatus::Active;
    let now = Utc::now();
    sqlx::query(
        "UPDATE plants SET name = $3, color_tag = $4, phase = $5, plant_status = $6, is_active = $7, archived = $8, updated_at = $9 WHERE user_id = $1 AND plant_id = $2",
    )
    .bind(user_id)
    .bind(plant_id)
    .bind(updated_name)
    .bind(updated_color)
    .bind(phase_str(updated_phase))
    .bind(plant_status_str(updated_status))
    .bind(updated_is_active)
    .bind(updated_archived)
    .bind(now)
    .execute(&state.pg)
    .await?;
    get_plant(state, user_id, plant_id).await?.ok_or_else(|| anyhow::anyhow!("plant not found"))
}

pub async fn delete_plant(state: &AppState, user_id: Uuid, plant_id: Uuid) -> anyhow::Result<()> {
    sqlx::query("UPDATE plants SET plant_status = 'deleted', is_active = FALSE, archived = FALSE, updated_at = $3 WHERE user_id = $1 AND plant_id = $2")
        .bind(user_id)
        .bind(plant_id)
        .bind(Utc::now())
        .execute(&state.pg)
        .await?;
    record_delete(state, user_id, plant_id, "plant").await?;
    Ok(())
}

pub async fn list_tasks_for_plant(state: &AppState, plant_id: Uuid) -> anyhow::Result<Vec<Task>> {
    let rows = sqlx::query_as::<_, TaskRow>(
        "SELECT task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at
         FROM tasks WHERE plant_id = $1 ORDER BY due_at ASC",
    )
    .bind(plant_id)
    .fetch_all(&state.pg)
    .await?;
    Ok(rows.into_iter().map(task_from_row).collect())
}

pub async fn list_tasks_for_user_since(state: &AppState, user_id: Uuid, since: Option<DateTime<Utc>>) -> anyhow::Result<Vec<Task>> {
    let rows = if let Some(since) = since {
        sqlx::query_as::<_, TaskRow>(
            "SELECT t.task_id, t.plant_id, t.title, t.category, t.due_at, t.repeat_interval_hours, t.notification_enabled, t.status, t.created_at, t.updated_at
             FROM tasks t INNER JOIN plants p ON p.plant_id = t.plant_id
             WHERE p.user_id = $1 AND t.updated_at > $2 ORDER BY t.updated_at DESC"
        ).bind(user_id).bind(since).fetch_all(&state.pg).await?
    } else {
        sqlx::query_as::<_, TaskRow>(
            "SELECT t.task_id, t.plant_id, t.title, t.category, t.due_at, t.repeat_interval_hours, t.notification_enabled, t.status, t.created_at, t.updated_at
             FROM tasks t INNER JOIN plants p ON p.plant_id = t.plant_id
             WHERE p.user_id = $1 ORDER BY t.updated_at DESC"
        ).bind(user_id).fetch_all(&state.pg).await?
    };
    Ok(rows.into_iter().map(task_from_row).collect())
}

pub async fn get_task(state: &AppState, task_id: Uuid) -> anyhow::Result<Option<Task>> {
    let row = sqlx::query_as::<_, TaskRow>(
        "SELECT task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at FROM tasks WHERE task_id = $1",
    )
    .bind(task_id)
    .fetch_optional(&state.pg)
    .await?;

    Ok(row.map(|row| Task {
        task_id: row.task_id,
        plant_id: row.plant_id,
        title: row.title,
        category: parse_category(&row.category),
        due_at: row.due_at,
        repeat_interval_hours: row.repeat_interval_hours,
        notification_enabled: row.notification_enabled,
        status: parse_status(&row.status),
        created_at: row.created_at,
        updated_at: row.updated_at,
    }))
}

pub async fn insert_task(state: &AppState, task: &Task) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO tasks (task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    )
    .bind(task.task_id)
    .bind(task.plant_id)
    .bind(&task.title)
    .bind(category_str(task.category))
    .bind(task.due_at)
    .bind(task.repeat_interval_hours)
    .bind(task.notification_enabled)
    .bind(status_str(task.status))
    .bind(task.created_at)
    .bind(task.updated_at)
    .execute(&state.pg)
    .await?;
    Ok(())
}

pub async fn upsert_task(state: &AppState, task: &Task) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO tasks (task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (task_id) DO UPDATE SET
            plant_id = EXCLUDED.plant_id,
            title = EXCLUDED.title,
            category = EXCLUDED.category,
            due_at = EXCLUDED.due_at,
            repeat_interval_hours = EXCLUDED.repeat_interval_hours,
            notification_enabled = EXCLUDED.notification_enabled,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at"
    )
    .bind(task.task_id)
    .bind(task.plant_id)
    .bind(&task.title)
    .bind(category_str(task.category))
    .bind(task.due_at)
    .bind(task.repeat_interval_hours)
    .bind(task.notification_enabled)
    .bind(status_str(task.status))
    .bind(task.created_at)
    .bind(task.updated_at)
    .execute(&state.pg)
    .await?;
    Ok(())
}

pub async fn update_task(state: &AppState, task_id: Uuid, title: Option<String>, status: Option<TaskStatus>, due_at: Option<DateTime<Utc>>, repeat_interval_hours: Option<i32>, notification_enabled: Option<bool>) -> anyhow::Result<Task> {
    let row = sqlx::query_as::<_, TaskRow>(
        "SELECT task_id, plant_id, title, category, due_at, repeat_interval_hours, notification_enabled, status, created_at, updated_at FROM tasks WHERE task_id = $1",
    )
    .bind(task_id)
    .fetch_one(&state.pg)
    .await?;
    let next_title = title.unwrap_or(row.title.clone());
    let next_status = status.unwrap_or(parse_status(&row.status));
    let next_due_at = due_at.unwrap_or(row.due_at);
    let next_repeat = repeat_interval_hours.or(row.repeat_interval_hours);
    let next_notification = notification_enabled.unwrap_or(row.notification_enabled);
    let updated_at = Utc::now();
    sqlx::query("UPDATE tasks SET title = $2, status = $3, due_at = $4, repeat_interval_hours = $5, notification_enabled = $6, updated_at = $7 WHERE task_id = $1")
        .bind(task_id)
        .bind(&next_title)
        .bind(status_str(next_status))
        .bind(next_due_at)
        .bind(next_repeat)
        .bind(next_notification)
        .bind(updated_at)
        .execute(&state.pg)
        .await?;
    Ok(Task {
        task_id: row.task_id,
        plant_id: row.plant_id,
        title: next_title,
        category: parse_category(&row.category),
        due_at: next_due_at,
        repeat_interval_hours: next_repeat,
        notification_enabled: next_notification,
        status: next_status,
        created_at: row.created_at,
        updated_at,
    })
}

pub async fn delete_task(state: &AppState, user_id: Uuid, task_id: Uuid) -> anyhow::Result<()> {
    sqlx::query("DELETE FROM tasks USING plants WHERE tasks.task_id = $1 AND tasks.plant_id = plants.plant_id AND plants.user_id = $2")
        .bind(task_id)
        .bind(user_id)
        .execute(&state.pg)
        .await?;
    record_delete(state, user_id, task_id, "task").await?;
    Ok(())
}

pub async fn list_logs_for_plant(state: &AppState, plant_id: Uuid) -> anyhow::Result<Vec<LogEntry>> {
    let rows = sqlx::query_as::<_, LogRow>(
        "SELECT log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at
         FROM logs WHERE plant_id = $1 ORDER BY created_at DESC",
    )
    .bind(plant_id)
    .fetch_all(&state.pg)
    .await?;
    Ok(rows.into_iter().map(log_from_row).collect())
}

pub async fn list_logs_for_user_since(state: &AppState, user_id: Uuid, since: Option<DateTime<Utc>>) -> anyhow::Result<Vec<LogEntry>> {
    let rows = if let Some(since) = since {
        sqlx::query_as::<_, LogRow>(
            "SELECT l.log_id, l.plant_id, l.log_type, l.text, l.metrics_json, l.action_json, l.photo_refs_json, l.created_at
             FROM logs l INNER JOIN plants p ON p.plant_id = l.plant_id
             WHERE p.user_id = $1 AND l.created_at > $2 ORDER BY l.created_at DESC"
        ).bind(user_id).bind(since).fetch_all(&state.pg).await?
    } else {
        sqlx::query_as::<_, LogRow>(
            "SELECT l.log_id, l.plant_id, l.log_type, l.text, l.metrics_json, l.action_json, l.photo_refs_json, l.created_at
             FROM logs l INNER JOIN plants p ON p.plant_id = l.plant_id
             WHERE p.user_id = $1 ORDER BY l.created_at DESC"
        ).bind(user_id).fetch_all(&state.pg).await?
    };
    Ok(rows.into_iter().map(log_from_row).collect())
}

pub async fn insert_log(state: &AppState, log: &LogEntry) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO logs (log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    )
    .bind(log.log_id)
    .bind(log.plant_id)
    .bind(log_type_str(log.log_type))
    .bind(&log.text)
    .bind(log.metrics.as_ref().map(|m| serde_json::to_value(m).unwrap_or_default()))
    .bind(log.action.as_ref().map(|m| serde_json::to_value(m).unwrap_or_default()))
    .bind(log.photo_refs.as_ref().map(|m| serde_json::to_value(m).unwrap_or_default()))
    .bind(log.created_at)
    .execute(&state.pg)
    .await?;
    Ok(())
}

pub async fn upsert_log(state: &AppState, log: &LogEntry) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO logs (log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (log_id) DO UPDATE SET
            plant_id = EXCLUDED.plant_id,
            log_type = EXCLUDED.log_type,
            text = EXCLUDED.text,
            metrics_json = EXCLUDED.metrics_json,
            action_json = EXCLUDED.action_json,
            photo_refs_json = EXCLUDED.photo_refs_json,
            created_at = EXCLUDED.created_at"
    )
    .bind(log.log_id)
    .bind(log.plant_id)
    .bind(log_type_str(log.log_type))
    .bind(&log.text)
    .bind(log.metrics.as_ref().map(|m| serde_json::to_value(m).unwrap_or_default()))
    .bind(log.action.as_ref().map(|m| serde_json::to_value(m).unwrap_or_default()))
    .bind(log.photo_refs.as_ref().map(|m| serde_json::to_value(m).unwrap_or_default()))
    .bind(log.created_at)
    .execute(&state.pg)
    .await?;
    Ok(())
}

pub async fn update_log(state: &AppState, log_id: Uuid, log_type: Option<LogType>, text: Option<String>, metrics: Option<Metrics>, action: Option<serde_json::Value>, photo_refs: Option<Vec<String>>) -> anyhow::Result<LogEntry> {
    let row = sqlx::query_as::<_, LogRow>(
        "SELECT log_id, plant_id, log_type, text, metrics_json, action_json, photo_refs_json, created_at FROM logs WHERE log_id = $1",
    )
    .bind(log_id)
    .fetch_one(&state.pg)
    .await?;
    let next_log_type = log_type.unwrap_or(parse_log_type(&row.log_type));
    let next_text = text.or(row.text.clone());
    let next_metrics = metrics.or_else(|| row.metrics_json.clone().and_then(|v| serde_json::from_value::<Metrics>(v).ok()));
    let next_action_json = action.or_else(|| row.action_json.clone());
    let next_photo_refs = photo_refs.or_else(|| row.photo_refs_json.clone().and_then(|v| serde_json::from_value::<Vec<String>>(v).ok()));

    sqlx::query(
        "UPDATE logs SET log_type = $2, text = $3, metrics_json = $4, action_json = $5, photo_refs_json = $6 WHERE log_id = $1",
    )
    .bind(log_id)
    .bind(log_type_str(next_log_type))
    .bind(&next_text)
    .bind(next_metrics.as_ref().map(|m| serde_json::to_value(m).unwrap_or_default()))
    .bind(next_action_json.clone())
    .bind(next_photo_refs.as_ref().map(|m| serde_json::to_value(m).unwrap_or_default()))
    .execute(&state.pg)
    .await?;

    Ok(LogEntry {
        log_id: row.log_id,
        plant_id: row.plant_id,
        log_type: next_log_type,
        text: next_text,
        metrics: next_metrics,
        action: next_action_json.and_then(|v| serde_json::from_value(v).ok()),
        photo_refs: next_photo_refs,
        created_at: row.created_at,
    })
}

pub async fn delete_log(state: &AppState, user_id: Uuid, log_id: Uuid) -> anyhow::Result<()> {
    sqlx::query("DELETE FROM logs USING plants WHERE logs.log_id = $1 AND logs.plant_id = plants.plant_id AND plants.user_id = $2")
        .bind(log_id)
        .bind(user_id)
        .execute(&state.pg)
        .await?;
    record_delete(state, user_id, log_id, "log").await?;
    Ok(())
}

pub async fn list_changes_since(state: &AppState, user_id: Uuid, since: Option<DateTime<Utc>>) -> anyhow::Result<(Vec<Plant>, Vec<Task>, Vec<LogEntry>)> {
    let plants = if let Some(since) = since {
        let rows = sqlx::query_as::<_, PlantRow>(
            "SELECT plant_id, user_id, name, color_tag, start_date, phase, phase_week, plant_status, is_active, archived, created_at, updated_at
             FROM plants WHERE user_id = $1 AND plant_status != 'deleted' AND updated_at > $2 ORDER BY updated_at DESC",
        ).bind(user_id).bind(since).fetch_all(&state.pg).await?;
        rows.into_iter().map(plant_from_row).collect()
    } else {
        list_plants(state, user_id).await?
    };
    let tasks = list_tasks_for_user_since(state, user_id, since).await?;
    let logs = list_logs_for_user_since(state, user_id, since).await?;
    Ok((plants, tasks, logs))
}

pub async fn merge_guest_data(state: &AppState, guest_user_id: Uuid, account_user_id: Uuid) -> anyhow::Result<()> {
    if guest_user_id == account_user_id {
        return Ok(());
    }
    sqlx::query("UPDATE plants SET user_id = $2, updated_at = $3 WHERE user_id = $1")
        .bind(guest_user_id)
        .bind(account_user_id)
        .bind(Utc::now())
        .execute(&state.pg)
        .await?;
    sqlx::query("DELETE FROM users WHERE user_id = $1")
        .bind(guest_user_id)
        .execute(&state.pg)
        .await?;
    Ok(())
}


pub async fn record_delete(state: &AppState, user_id: Uuid, record_id: Uuid, entity_kind: &str) -> anyhow::Result<()> {
    sqlx::query(
        "INSERT INTO deleted_records (record_id, user_id, entity_kind, operation, changed_at) VALUES ($1,$2,$3,'delete',$4)
         ON CONFLICT (record_id, entity_kind) DO UPDATE SET changed_at = EXCLUDED.changed_at, user_id = EXCLUDED.user_id"
    )
    .bind(record_id)
    .bind(user_id)
    .bind(entity_kind)
    .bind(Utc::now())
    .execute(&state.pg)
    .await?;
    Ok(())
}

pub async fn list_deleted_records_since(state: &AppState, user_id: Uuid, since: Option<DateTime<Utc>>) -> anyhow::Result<Vec<shared::DirtyRecord>> {
    let rows = if let Some(since) = since {
        sqlx::query_as::<_, DeletedRow>(
            "SELECT record_id, user_id, entity_kind, operation, changed_at FROM deleted_records WHERE user_id = $1 AND changed_at >= $2 ORDER BY changed_at ASC"
        ).bind(user_id).bind(since).fetch_all(&state.pg).await?
    } else {
        sqlx::query_as::<_, DeletedRow>(
            "SELECT record_id, user_id, entity_kind, operation, changed_at FROM deleted_records WHERE user_id = $1 ORDER BY changed_at ASC"
        ).bind(user_id).fetch_all(&state.pg).await?
    };
    Ok(rows.into_iter().map(|row| shared::DirtyRecord {
        record_id: row.record_id,
        entity_kind: match row.entity_kind.as_str() {
            "task" => shared::SyncEntityKind::Task,
            "log" => shared::SyncEntityKind::Log,
            _ => shared::SyncEntityKind::Plant,
        },
        operation: shared::SyncOperation::Delete,
        changed_at: row.changed_at,
    }).collect())
}

pub async fn enforce_user_plan_limit(state: &AppState, user_id: Uuid) -> anyhow::Result<()> {
    let user = get_user(state, user_id).await?.ok_or_else(|| anyhow::anyhow!("user not found"))?;
    let plants = list_plants(state, user_id).await?;
    let adjusted = crate::services::plants::apply_downgrade(plants, user.plan);
    let mut tx = state.pg.begin().await?;
    for plant in adjusted {
        let normalized = plant.normalized();
        sqlx::query("UPDATE plants SET plant_status = $2, is_active = $3, archived = $4, updated_at = $5 WHERE plant_id = $1")
            .bind(normalized.plant_id)
            .bind(plant_status_str(normalized.status))
            .bind(normalized.is_active)
            .bind(normalized.archived)
            .bind(Utc::now())
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(())
}


pub async fn get_user_by_email(state: &AppState, email: &str) -> anyhow::Result<Option<UserProfile>> {
    let row = sqlx::query_as::<_, UserRow>(
        "SELECT user_id, auth_mode, adult_confirmed, email, password_hash, locale, timezone, plan, created_at, updated_at FROM users WHERE email = $1"
    )
    .bind(email)
    .fetch_optional(&state.pg)
    .await?;
    Ok(row.map(user_from_row))
}


#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn sample_plant(status: PlantStatus) -> Plant {
        let now = Utc::now();
        Plant {
            plant_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            name: "RepoSample".into(),
            color_tag: "#0B3D2E".into(),
            start_date: now,
            phase: PlantPhase::Veg,
            phase_week: Some(1),
            status,
            is_active: false,
            archived: false,
            created_at: now,
            updated_at: now,
        }
        .normalized()
    }

    #[test]
    fn normalize_plant_status_keeps_current_status_when_nothing_requested() {
        let current = sample_plant(PlantStatus::Ended);
        assert_eq!(normalize_plant_status(&current, None), PlantStatus::Ended);
    }

    #[test]
    fn normalize_plant_status_respects_explicit_requested_status() {
        let current = sample_plant(PlantStatus::Archived);
        assert_eq!(normalize_plant_status(&current, Some(PlantStatus::Active)), PlantStatus::Active);
    }

    #[test]
    fn plant_status_parser_prefers_explicit_storage_value() {
        assert_eq!(parse_plant_status("deleted", true, true), PlantStatus::Deleted);
        assert_eq!(parse_plant_status("ended", false, false), PlantStatus::Ended);
    }
}

pub async fn create_user_with_credentials(state: &AppState, user_id: Uuid, email: String, password_hash: String, auth_mode: AuthMode) -> anyhow::Result<UserProfile> {
    let now = Utc::now();
    sqlx::query(
        "INSERT INTO users (user_id, auth_mode, adult_confirmed, email, password_hash, locale, timezone, plan, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)"
    )
    .bind(user_id)
    .bind(auth_mode_str(auth_mode))
    .bind(false)
    .bind(email)
    .bind(password_hash)
    .bind("de-DE")
    .bind("Europe/Berlin")
    .bind("free")
    .bind(now)
    .bind(now)
    .execute(&state.pg)
    .await?;
    Ok(UserProfile {
        user_id,
        auth_mode,
        adult_confirmed: false,
        locale: "de-DE".into(),
        timezone: "Europe/Berlin".into(),
        plan: SubscriptionPlan::Free,
        created_at: now,
        updated_at: now,
    })
}

pub async fn get_password_hash_by_user_id(state: &AppState, user_id: Uuid) -> anyhow::Result<Option<String>> {
    let row: Option<(Option<String>,)> = sqlx::query_as("SELECT password_hash FROM users WHERE user_id = $1")
        .bind(user_id)
        .fetch_optional(&state.pg)
        .await?;
    Ok(row.and_then(|r| r.0))
}
