#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod local_db;

use chrono::{Duration, Utc};
use local_db::{DirtyBreakdown, LocalStore, ReminderCandidate, StoredSession};
use serde::{Deserialize, Serialize};
use shared::{AuthMode, DirtyRecord, LogEntry, LogType, Metrics, Plant, PlantPhase, PlantStatus, SubscriptionPlan, SubscriptionStatusSummary, SyncPullResponse, SyncPushRequest, Task, TaskCategory, TaskStatus, UserProfile};
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;

struct AppLocalState {
    store: Mutex<LocalStore>,
}

#[derive(Debug, Deserialize)]
struct RegisterPayload {
    email: String,
    password: String,
    backend_url: Option<String>,
}

#[derive(Debug, Deserialize)]
struct LoginPayload {
    email: String,
    password: String,
    backend_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AuthResponse {
    user_id: Uuid,
    auth_mode: AuthMode,
    access_token: String,
}

#[derive(Debug, Serialize)]
struct SessionView {
    session: StoredSession,
    me: UserProfile,
}

#[derive(Debug, Serialize)]
struct SyncStatusView {
    session_active: bool,
    user_id: Option<Uuid>,
    auth_mode: Option<AuthMode>,
    backend_url: Option<String>,
    dirty_count: usize,
    dirty_breakdown: DirtyBreakdown,
    last_sync_at: Option<chrono::DateTime<Utc>>,
}

#[derive(Debug, Serialize)]
struct SyncRunResult {
    pushed_plants: usize,
    pushed_tasks: usize,
    pushed_logs: usize,
    pushed_deleted: usize,
    pulled_plants: usize,
    pulled_tasks: usize,
    pulled_logs: usize,
    pulled_deleted: usize,
}

#[derive(Debug, Deserialize)]
struct ReminderDispatchPayload {
    task_id: String,
    due_at: String,
}

#[derive(Debug, Serialize)]
struct ReminderCheckResult {
    count: usize,
    reminders: Vec<ReminderCandidate>,
}

#[derive(Debug, Serialize)]
struct CreatePlantPayload {
    name: String,
    color_tag: String,
    phase: PlantPhase,
}

#[derive(Debug, Serialize)]
struct CreateTaskPayload {
    title: String,
    category: TaskCategory,
    due_at: chrono::DateTime<Utc>,
    repeat_interval_hours: Option<i32>,
    notification_enabled: bool,
}

#[derive(Debug, Serialize)]
struct UpdateTaskPayload {
    title: Option<String>,
    status: Option<TaskStatus>,
    due_at: Option<chrono::DateTime<Utc>>,
    repeat_interval_hours: Option<i32>,
    notification_enabled: Option<bool>,
}

#[derive(Debug, Serialize)]
struct CreateLogPayload {
    log_type: LogType,
    text: Option<String>,
    metrics: Option<Metrics>,
    action: Option<serde_json::Value>,
    photo_refs: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct PlantCreateInput {
    name: String,
    color_tag: Option<String>,
    phase: Option<String>,
    phase_week: Option<i32>,
}

#[derive(Debug, Deserialize)]
struct PlantUpdateInput {
    plant_id: String,
    name: String,
    color_tag: String,
    phase: String,
    phase_week: Option<i32>,
    #[serde(default)]
    is_active: Option<bool>,
    #[serde(default)]
    archived: Option<bool>,
    status: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TaskCreateInput {
    plant_id: String,
    title: String,
    category: Option<String>,
    due_at: Option<String>,
    repeat_interval_hours: Option<i32>,
    notification_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct TaskStatusInput {
    task_id: String,
    status: String,
}

#[derive(Debug, Deserialize)]
struct TaskUpdateInput {
    task_id: String,
    title: Option<String>,
    status: Option<String>,
    due_at: Option<String>,
    repeat_interval_hours: Option<i32>,
    notification_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct LogCreateInput {
    plant_id: String,
    log_type: Option<String>,
    created_at: Option<String>,
    text: Option<String>,
    ph: Option<f32>,
    ec: Option<f32>,
    temp_c: Option<f32>,
    rh: Option<f32>,
}

#[derive(Debug, Deserialize)]
struct LogUpdateInput {
    log_id: String,
    log_type: Option<String>,
    text: Option<String>,
    ph: Option<f32>,
    ec: Option<f32>,
    temp_c: Option<f32>,
    rh: Option<f32>,
}

fn parse_plant_status(value: Option<&str>, fallback_archived: bool, fallback_active: bool) -> PlantStatus {
    PlantStatus::from_optional_storage_value(value, fallback_active, fallback_archived)
}

fn resolve_requested_plant_status(payload: &PlantUpdateInput, current_status: PlantStatus) -> PlantStatus {
    shared::resolve_requested_plant_status(
        current_status,
        payload
            .status
            .as_deref()
            .map(|status| PlantStatus::from_optional_storage_value(Some(status), false, false)),
        payload.archived,
        payload.is_active,
    )
}

fn outbound_requested_plant_status(payload: &PlantUpdateInput) -> Option<PlantStatus> {
    shared::outbound_requested_plant_status(
        payload
            .status
            .as_deref()
            .map(|status| PlantStatus::from_optional_storage_value(Some(status), false, false)),
        payload.archived,
        payload.is_active,
    )
}

fn parse_phase(value: Option<&str>) -> PlantPhase {
    match value.unwrap_or("veg").to_lowercase().as_str() {
        "seed" => PlantPhase::Seed,
        "flower" => PlantPhase::Flower,
        "harvest" => PlantPhase::Harvest,
        "dry" => PlantPhase::Dry,
        "cure" => PlantPhase::Cure,
        "custom" => PlantPhase::Custom,
        _ => PlantPhase::Veg,
    }
}

fn parse_task_category(value: Option<&str>) -> TaskCategory {
    match value.unwrap_or("water").to_lowercase().as_str() {
        "feed" => TaskCategory::Feed,
        "check" => TaskCategory::Check,
        "train" => TaskCategory::Train,
        "note" => TaskCategory::Note,
        _ => TaskCategory::Water,
    }
}


fn parse_due_at(value: Option<&str>, fallback: chrono::DateTime<Utc>) -> chrono::DateTime<Utc> {
    value
        .and_then(|raw| chrono::DateTime::parse_from_rfc3339(raw).ok().map(|dt| dt.with_timezone(&Utc)))
        .unwrap_or(fallback)
}

fn parse_task_status(value: &str) -> TaskStatus {
    match value.to_lowercase().as_str() {
        "done" => TaskStatus::Done,
        "skipped" => TaskStatus::Skipped,
        _ => TaskStatus::Open,
    }
}

fn parse_log_type(value: Option<&str>) -> LogType {
    match value.unwrap_or("note").to_lowercase().as_str() {
        "measurement" => LogType::Measurement,
        "photo" => LogType::Photo,
        "action" => LogType::Action,
        _ => LogType::Note,
    }
}

fn current_user_id(store: &LocalStore) -> Uuid {
    store.load_session().ok().flatten().map(|s| s.user_id).unwrap_or(Uuid::nil())
}

async fn fetch_me_with_session(session: &StoredSession) -> Result<UserProfile, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/me", session.backend_url))
        .bearer_auth(&session.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "fetch me failed".into()));
    }

    response.json().await.map_err(|e| e.to_string())
}

async fn authorized_post_sync_push(session: &StoredSession, payload: &SyncPushRequest) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/sync/push", session.backend_url))
        .bearer_auth(&session.access_token)
        .json(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "sync push failed".into()));
    }

    Ok(())
}

async fn authorized_get_sync_pull(session: &StoredSession, since: Option<chrono::DateTime<Utc>>) -> Result<SyncPullResponse, String> {
    let client = reqwest::Client::new();
    let mut request = client
        .get(format!("{}/sync/pull", session.backend_url))
        .bearer_auth(&session.access_token);

    if let Some(since) = since {
        request = request.query(&[("since", since.to_rfc3339())]);
    }

    let response = request.send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "sync pull failed".into()));
    }

    response.json().await.map_err(|e| e.to_string())
}


async fn authorized_get_plants(session: &StoredSession) -> Result<Vec<Plant>, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/plants", session.backend_url))
        .bearer_auth(&session.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "list plants failed".into()));
    }
    response.json().await.map_err(|e| e.to_string())
}

async fn authorized_create_plant(session: &StoredSession, payload: &CreatePlantPayload) -> Result<Plant, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/plants", session.backend_url))
        .bearer_auth(&session.access_token)
        .json(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "create plant failed".into()));
    }
    response.json().await.map_err(|e| e.to_string())
}

async fn authorized_update_plant(session: &StoredSession, plant_id: Uuid, payload: &PlantUpdateInput) -> Result<Plant, String> {
    let client = reqwest::Client::new();
    let response = client
        .patch(format!("{}/plants/{}", session.backend_url, plant_id))
        .bearer_auth(&session.access_token)
        .json(&serde_json::json!({
            "name": payload.name.trim(),
            "color_tag": payload.color_tag,
            "phase": parse_phase(Some(&payload.phase)),
            "status": outbound_requested_plant_status(payload).map(|status| status.as_str().to_string()),
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "update plant failed".into()));
    }

    let get_response = client
        .get(format!("{}/plants/{}", session.backend_url, plant_id))
        .bearer_auth(&session.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !get_response.status().is_success() {
        return Err(get_response.text().await.unwrap_or_else(|_| "fetch updated plant failed".into()));
    }
    get_response.json().await.map_err(|e| e.to_string())
}

async fn authorized_delete_plant(session: &StoredSession, plant_id: Uuid) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .delete(format!("{}/plants/{}", session.backend_url, plant_id))
        .bearer_auth(&session.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "delete plant failed".into()));
    }
    Ok(())
}

async fn authorized_get_tasks(session: &StoredSession, plant_id: Option<Uuid>) -> Result<Vec<Task>, String> {
    let client = reqwest::Client::new();
    let url = match plant_id {
        Some(id) => format!("{}/plants/{}/tasks", session.backend_url, id),
        None => return Err("plant id required for online tasks".into()),
    };
    let response = client.get(url).bearer_auth(&session.access_token).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "list tasks failed".into()));
    }
    response.json().await.map_err(|e| e.to_string())
}

async fn authorized_create_task(session: &StoredSession, plant_id: Uuid, payload: &CreateTaskPayload) -> Result<Task, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/plants/{}/tasks", session.backend_url, plant_id))
        .bearer_auth(&session.access_token)
        .json(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "create task failed".into()));
    }
    response.json().await.map_err(|e| e.to_string())
}

async fn authorized_update_task(session: &StoredSession, task_id: Uuid, payload: &UpdateTaskPayload) -> Result<Task, String> {
    let client = reqwest::Client::new();
    let response = client
        .patch(format!("{}/tasks/{}", session.backend_url, task_id))
        .bearer_auth(&session.access_token)
        .json(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "update task failed".into()));
    }
    response.json().await.map_err(|e| e.to_string())
}

async fn authorized_delete_task(session: &StoredSession, task_id: Uuid) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .delete(format!("{}/tasks/{}", session.backend_url, task_id))
        .bearer_auth(&session.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "delete task failed".into()));
    }
    Ok(())
}

async fn authorized_get_logs(session: &StoredSession, plant_id: Option<Uuid>) -> Result<Vec<LogEntry>, String> {
    let client = reqwest::Client::new();
    let url = match plant_id {
        Some(id) => format!("{}/plants/{}/logs", session.backend_url, id),
        None => return Err("plant id required for online logs".into()),
    };
    let response = client.get(url).bearer_auth(&session.access_token).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "list logs failed".into()));
    }
    response.json().await.map_err(|e| e.to_string())
}

async fn authorized_create_log(session: &StoredSession, plant_id: Uuid, payload: &CreateLogPayload) -> Result<LogEntry, String> {
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/plants/{}/logs", session.backend_url, plant_id))
        .bearer_auth(&session.access_token)
        .json(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "create log failed".into()));
    }
    response.json().await.map_err(|e| e.to_string())
}

async fn authorized_update_log(session: &StoredSession, log_id: Uuid, payload: &CreateLogPayload) -> Result<LogEntry, String> {
    let client = reqwest::Client::new();
    let response = client
        .patch(format!("{}/logs/{}", session.backend_url, log_id))
        .bearer_auth(&session.access_token)
        .json(payload)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "update log failed".into()));
    }
    response.json().await.map_err(|e| e.to_string())
}

async fn authorized_delete_log(session: &StoredSession, log_id: Uuid) -> Result<(), String> {
    let client = reqwest::Client::new();
    let response = client
        .delete(format!("{}/logs/{}", session.backend_url, log_id))
        .bearer_auth(&session.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "delete log failed".into()));
    }
    Ok(())
}

fn normalize_backend_url(value: Option<String>) -> String {
    value
        .unwrap_or_else(|| "http://127.0.0.1:8080".into())
        .trim_end_matches('/')
        .to_string()
}

#[tauri::command]
fn get_plan_info() -> String {
    format!(
        "Free: {}, Basic: {}, Pro: {}, CSC: {}",
        SubscriptionPlan::Free.plant_limit(),
        SubscriptionPlan::Basic.plant_limit(),
        SubscriptionPlan::Pro.plant_limit(),
        if SubscriptionPlan::Csc.plant_limit() == usize::MAX { "∞".to_string() } else { SubscriptionPlan::Csc.plant_limit().to_string() }
    )
}

fn parse_subscription_plan(value: &str) -> SubscriptionPlan {
    match value.to_lowercase().as_str() {
        "basic" => SubscriptionPlan::Basic,
        "pro" => SubscriptionPlan::Pro,
        "csc" => SubscriptionPlan::Csc,
        _ => SubscriptionPlan::Free,
    }
}


fn local_subscription_summary(store: &LocalStore) -> Result<SubscriptionStatusSummary, String> {
    let user = store.get_or_create_guest_user().map_err(|e| e.to_string())?;
    let plants = store.list_plants().map_err(|e| e.to_string())?;
    Ok(shared::subscription_status_summary(&plants, user.plan))
}

#[tauri::command]
fn bootstrap_local_user(state: State<AppLocalState>) -> Result<String, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let user = store.get_or_create_guest_user().map_err(|e| e.to_string())?;
    Ok(format!("{}:{}", user.locale, if user.adult_confirmed { "adult" } else { "pending" }))
}

#[tauri::command]
fn list_local_plants(state: State<AppLocalState>) -> Result<Vec<Plant>, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.list_plants().map_err(|e| e.to_string())
}

#[tauri::command]
fn create_local_plant(state: State<AppLocalState>, payload: PlantCreateInput) -> Result<Plant, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let user = store.get_or_create_guest_user().map_err(|e| e.to_string())?;
    let plants = store.list_plants().map_err(|e| e.to_string())?;
    shared::validate_create_with_plants(&plants, user.plan).map_err(|e| e.to_string())?;
    let now = Utc::now();
    let plant = Plant {
        plant_id: Uuid::new_v4(),
        user_id: current_user_id(&store),
        name: payload.name.trim().to_string(),
        color_tag: payload.color_tag.unwrap_or_else(|| "#0B3D2E".into()),
        start_date: now,
        phase: parse_phase(payload.phase.as_deref()),
        phase_week: payload.phase_week,
        status: PlantStatus::Active,
        is_active: true,
        archived: false,
        created_at: now,
        updated_at: now,
    }
    .normalized();
    store.upsert_plant(&plant).map_err(|e| e.to_string())?;
    Ok(plant)
}

#[tauri::command]
fn update_local_plant(state: State<AppLocalState>, payload: PlantUpdateInput) -> Result<Plant, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let user = store.get_or_create_guest_user().map_err(|e| e.to_string())?;
    let plants = store.list_plants().map_err(|e| e.to_string())?;
    let mut plant = plants
        .iter()
        .find(|p| p.plant_id.to_string() == payload.plant_id)
        .cloned()
        .ok_or_else(|| "plant not found".to_string())?;

    let requested_status = resolve_requested_plant_status(&payload, plant.status);
    if shared::is_reactivation_transition(plant.status, requested_status) {
        shared::validate_reactivate_with_plants(&plants, plant.plant_id, user.plan).map_err(|e| e.to_string())?;
    }

    plant.name = payload.name.trim().to_string();
    plant.color_tag = payload.color_tag;
    plant.phase = parse_phase(Some(&payload.phase));
    plant.phase_week = payload.phase_week;
    plant.status = requested_status;
    plant.sync_legacy_flags();
    plant.updated_at = Utc::now();

    store.upsert_plant(&plant).map_err(|e| e.to_string())?;
    Ok(plant)
}

#[tauri::command]
fn delete_local_plant(state: State<AppLocalState>, plant_id: String) -> Result<String, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let parsed = Uuid::parse_str(&plant_id).map_err(|e| e.to_string())?;
    store.delete_plant(parsed).map_err(|e| e.to_string())?;
    Ok("plant deleted".into())
}

#[tauri::command]
fn list_local_tasks(state: State<AppLocalState>, plant_id: Option<String>) -> Result<Vec<Task>, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let mut tasks = store.list_tasks().map_err(|e| e.to_string())?;
    if let Some(plant_id) = plant_id {
        tasks.retain(|t| t.plant_id.to_string() == plant_id);
    }
    Ok(tasks)
}

#[tauri::command]
fn create_local_task(state: State<AppLocalState>, payload: TaskCreateInput) -> Result<Task, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let plant_id = Uuid::parse_str(&payload.plant_id).map_err(|e| e.to_string())?;
    let now = Utc::now();
    let task = Task {
        task_id: Uuid::new_v4(),
        plant_id,
        title: payload.title.trim().to_string(),
        category: parse_task_category(payload.category.as_deref()),
        due_at: parse_due_at(payload.due_at.as_deref(), now + Duration::hours(24)),
        repeat_interval_hours: payload.repeat_interval_hours,
        notification_enabled: payload.notification_enabled.unwrap_or(true),
        status: TaskStatus::Open,
        created_at: now,
        updated_at: now,
    };
    store.upsert_task(&task).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
fn update_local_task_status(state: State<AppLocalState>, payload: TaskStatusInput) -> Result<Task, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let mut task = store
        .list_tasks()
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|t| t.task_id.to_string() == payload.task_id)
        .ok_or_else(|| "task not found".to_string())?;
    let requested_status = parse_task_status(&payload.status);
    let now = Utc::now();
    task.status = requested_status;
    task.updated_at = now;
    if requested_status == TaskStatus::Done {
        if let Some(next_due) = next_recurring_due_after(task.due_at, task.repeat_interval_hours, now) {
            task.status = TaskStatus::Open;
            task.due_at = next_due;
            store.clear_notification_sent_for_task(task.task_id).map_err(|e| e.to_string())?;
        }
    }
    store.upsert_task(&task).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
fn update_local_task(state: State<AppLocalState>, payload: TaskUpdateInput) -> Result<Task, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let task_id = Uuid::parse_str(&payload.task_id).map_err(|e| e.to_string())?;
    let mut task = store
        .list_tasks()
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|t| t.task_id == task_id)
        .ok_or_else(|| "task not found".to_string())?;
    if let Some(title) = payload.title { task.title = title.trim().to_string(); }
    let requested_status = payload.status.as_deref().map(parse_task_status);
    if let Some(due_at) = payload.due_at.as_deref() { task.due_at = parse_due_at(Some(due_at), task.due_at); }
    if let Some(repeat) = payload.repeat_interval_hours { task.repeat_interval_hours = Some(repeat); }
    if let Some(enabled) = payload.notification_enabled { task.notification_enabled = enabled; }
    let now = Utc::now();
    if let Some(status) = requested_status {
        task.status = status;
        if status == TaskStatus::Done {
            if let Some(next_due) = next_recurring_due_after(task.due_at, task.repeat_interval_hours, now) {
                task.status = TaskStatus::Open;
                task.due_at = next_due;
                store.clear_notification_sent_for_task(task.task_id).map_err(|e| e.to_string())?;
            }
        }
    }
    task.updated_at = now;
    store.upsert_task(&task).map_err(|e| e.to_string())?;
    Ok(task)
}

#[tauri::command]
fn delete_local_task(state: State<AppLocalState>, task_id: String) -> Result<String, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let parsed = Uuid::parse_str(&task_id).map_err(|e| e.to_string())?;
    store.delete_task(parsed).map_err(|e| e.to_string())?;
    Ok("task deleted".into())
}

#[tauri::command]
fn list_local_logs(state: State<AppLocalState>, plant_id: Option<String>) -> Result<Vec<LogEntry>, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let mut logs = store.list_logs().map_err(|e| e.to_string())?;
    if let Some(plant_id) = plant_id {
        logs.retain(|l| l.plant_id.to_string() == plant_id);
    }
    Ok(logs)
}

#[tauri::command]
fn create_local_log(state: State<AppLocalState>, payload: LogCreateInput) -> Result<LogEntry, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let plant_id = Uuid::parse_str(&payload.plant_id).map_err(|e| e.to_string())?;
    let has_metrics = payload.ph.is_some() || payload.ec.is_some() || payload.temp_c.is_some() || payload.rh.is_some();
    let log = LogEntry {
        log_id: Uuid::new_v4(),
        plant_id,
        log_type: parse_log_type(payload.log_type.as_deref()),
        text: payload.text.filter(|t| !t.trim().is_empty()),
        metrics: if has_metrics {
            Some(Metrics { ph: payload.ph, ec: payload.ec, temp_c: payload.temp_c, rh: payload.rh })
        } else {
            None
        },
        action: None,
        photo_refs: None,
        created_at: parse_due_at(payload.created_at.as_deref(), Utc::now()),
    };
    store.upsert_log(&log).map_err(|e| e.to_string())?;
    Ok(log)
}

#[tauri::command]
fn update_local_log(state: State<AppLocalState>, payload: LogUpdateInput) -> Result<LogEntry, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let log_id = Uuid::parse_str(&payload.log_id).map_err(|e| e.to_string())?;
    let mut log = store
        .list_logs()
        .map_err(|e| e.to_string())?
        .into_iter()
        .find(|l| l.log_id == log_id)
        .ok_or_else(|| "log not found".to_string())?;
    log.log_type = parse_log_type(payload.log_type.as_deref());
    log.text = payload.text.filter(|t| !t.trim().is_empty());
    let has_metrics = payload.ph.is_some() || payload.ec.is_some() || payload.temp_c.is_some() || payload.rh.is_some();
    log.metrics = if has_metrics { Some(Metrics { ph: payload.ph, ec: payload.ec, temp_c: payload.temp_c, rh: payload.rh }) } else { None };
    store.upsert_log(&log).map_err(|e| e.to_string())?;
    Ok(log)
}

#[tauri::command]
fn delete_local_log(state: State<AppLocalState>, log_id: String) -> Result<String, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let parsed = Uuid::parse_str(&log_id).map_err(|e| e.to_string())?;
    store.delete_log(parsed).map_err(|e| e.to_string())?;
    Ok("log deleted".into())
}

#[tauri::command]
async fn list_current_plants(state: State<'_, AppLocalState>) -> Result<Vec<Plant>, String> {
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        let plants = authorized_get_plants(&session).await?;
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.replace_cached_plants(&plants).map_err(|e| e.to_string())?;
        Ok(plants)
    } else {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.list_plants().map_err(|e| e.to_string())
    }
}

#[tauri::command]
async fn create_plant_smart(state: State<'_, AppLocalState>, payload: PlantCreateInput) -> Result<Plant, String> {
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        let request = CreatePlantPayload {
            name: payload.name.trim().to_string(),
            color_tag: payload.color_tag.unwrap_or_else(|| "#0B3D2E".into()),
            phase: parse_phase(payload.phase.as_deref()),
        };
        let plant = authorized_create_plant(&session, &request).await?;
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.cache_upsert_plant(&plant).map_err(|e| e.to_string())?;
        Ok(plant)
    } else {
        create_local_plant(state, payload)
    }
}

#[tauri::command]
async fn update_plant_smart(state: State<'_, AppLocalState>, payload: PlantUpdateInput) -> Result<Plant, String> {
    let plant_id = Uuid::parse_str(&payload.plant_id).map_err(|e| e.to_string())?;
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        let plant = authorized_update_plant(&session, plant_id, &payload).await?;
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.cache_upsert_plant(&plant).map_err(|e| e.to_string())?;
        Ok(plant)
    } else {
        update_local_plant(state, payload)
    }
}

#[tauri::command]
async fn delete_plant_smart(state: State<'_, AppLocalState>, plant_id: String) -> Result<String, String> {
    let parsed = Uuid::parse_str(&plant_id).map_err(|e| e.to_string())?;
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        authorized_delete_plant(&session, parsed).await?;
    }
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.cache_delete_plant(parsed).map_err(|e| e.to_string())?;
    Ok("plant deleted".into())
}

#[tauri::command]
async fn list_current_tasks(state: State<'_, AppLocalState>, plant_id: Option<String>) -> Result<Vec<Task>, String> {
    let parsed = plant_id.and_then(|v| Uuid::parse_str(&v).ok());
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        if let Some(pid) = parsed {
            let tasks = authorized_get_tasks(&session, Some(pid)).await?;
            let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
            store.replace_cached_tasks_for_plant(pid, &tasks).map_err(|e| e.to_string())?;
            Ok(tasks)
        } else {
            let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
            store.list_tasks().map_err(|e| e.to_string())
        }
    } else {
        list_local_tasks(state, plant_id)
    }
}

#[tauri::command]
async fn create_task_smart(state: State<'_, AppLocalState>, payload: TaskCreateInput) -> Result<Task, String> {
    let plant_id = Uuid::parse_str(&payload.plant_id).map_err(|e| e.to_string())?;
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        let request = CreateTaskPayload {
            title: payload.title.trim().to_string(),
            category: parse_task_category(payload.category.as_deref()),
            due_at: parse_due_at(payload.due_at.as_deref(), Utc::now() + Duration::hours(24)),
            repeat_interval_hours: payload.repeat_interval_hours,
            notification_enabled: payload.notification_enabled.unwrap_or(true),
        };
        let task = authorized_create_task(&session, plant_id, &request).await?;
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.cache_upsert_task(&task).map_err(|e| e.to_string())?;
        Ok(task)
    } else {
        create_local_task(state, payload)
    }
}

#[tauri::command]
async fn update_task_smart(state: State<'_, AppLocalState>, payload: TaskUpdateInput) -> Result<Task, String> {
    let task_id = Uuid::parse_str(&payload.task_id).map_err(|e| e.to_string())?;
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        let request = UpdateTaskPayload {
            title: payload.title.clone().map(|v| v.trim().to_string()),
            status: payload.status.as_deref().map(parse_task_status),
            due_at: payload.due_at.as_deref().map(|raw| parse_due_at(Some(raw), Utc::now() + Duration::hours(24))),
            repeat_interval_hours: payload.repeat_interval_hours,
            notification_enabled: payload.notification_enabled,
        };
        let task = authorized_update_task(&session, task_id, &request).await?;
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.cache_upsert_task(&task).map_err(|e| e.to_string())?;
        if payload.status.as_deref().map(parse_task_status) == Some(TaskStatus::Done) {
            store.clear_notification_sent_for_task(task.task_id).map_err(|e| e.to_string())?;
        }
        return Ok(task);
    }
    update_local_task(state, payload)
}

#[tauri::command]
async fn update_task_status_smart(state: State<'_, AppLocalState>, payload: TaskStatusInput) -> Result<Task, String> {
    update_task_smart(state, TaskUpdateInput {
        task_id: payload.task_id,
        title: None,
        status: Some(payload.status),
        due_at: None,
        repeat_interval_hours: None,
        notification_enabled: None,
    }).await
}

#[tauri::command]
async fn delete_task_smart(state: State<'_, AppLocalState>, task_id: String) -> Result<String, String> {
    let parsed = Uuid::parse_str(&task_id).map_err(|e| e.to_string())?;
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        authorized_delete_task(&session, parsed).await?;
    }
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.cache_delete_task(parsed).map_err(|e| e.to_string())?;
    Ok("task deleted".into())
}

#[tauri::command]
async fn list_current_logs(state: State<'_, AppLocalState>, plant_id: Option<String>) -> Result<Vec<LogEntry>, String> {
    let parsed = plant_id.and_then(|v| Uuid::parse_str(&v).ok());
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        if let Some(pid) = parsed {
            let logs = authorized_get_logs(&session, Some(pid)).await?;
            let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
            store.replace_cached_logs_for_plant(pid, &logs).map_err(|e| e.to_string())?;
            Ok(logs)
        } else {
            let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
            store.list_logs().map_err(|e| e.to_string())
        }
    } else {
        list_local_logs(state, plant_id)
    }
}

#[tauri::command]
async fn create_log_smart(state: State<'_, AppLocalState>, payload: LogCreateInput) -> Result<LogEntry, String> {
    let plant_id = Uuid::parse_str(&payload.plant_id).map_err(|e| e.to_string())?;
    let has_metrics = payload.ph.is_some() || payload.ec.is_some() || payload.temp_c.is_some() || payload.rh.is_some();
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        let request = CreateLogPayload {
            log_type: parse_log_type(payload.log_type.as_deref()),
            created_at: payload.created_at.as_deref().map(|raw| parse_due_at(Some(raw), Utc::now())),
            text: payload.text.clone().filter(|t| !t.trim().is_empty()),
            metrics: if has_metrics { Some(Metrics { ph: payload.ph, ec: payload.ec, temp_c: payload.temp_c, rh: payload.rh }) } else { None },
            action: None,
            photo_refs: None,
        };
        let log = authorized_create_log(&session, plant_id, &request).await?;
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.cache_upsert_log(&log).map_err(|e| e.to_string())?;
        Ok(log)
    } else {
        create_local_log(state, payload)
    }
}

#[tauri::command]
async fn update_log_smart(state: State<'_, AppLocalState>, payload: LogUpdateInput) -> Result<LogEntry, String> {
    let log_id = Uuid::parse_str(&payload.log_id).map_err(|e| e.to_string())?;
    let has_metrics = payload.ph.is_some() || payload.ec.is_some() || payload.temp_c.is_some() || payload.rh.is_some();
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        let request = CreateLogPayload {
            log_type: parse_log_type(payload.log_type.as_deref()),
            text: payload.text.clone().filter(|t| !t.trim().is_empty()),
            metrics: if has_metrics { Some(Metrics { ph: payload.ph, ec: payload.ec, temp_c: payload.temp_c, rh: payload.rh }) } else { None },
            action: None,
            photo_refs: None,
        };
        let log = authorized_update_log(&session, log_id, &request).await?;
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.cache_upsert_log(&log).map_err(|e| e.to_string())?;
        return Ok(log);
    }
    update_local_log(state, payload)
}

#[tauri::command]
async fn delete_log_smart(state: State<'_, AppLocalState>, log_id: String) -> Result<String, String> {
    let parsed = Uuid::parse_str(&log_id).map_err(|e| e.to_string())?;
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        authorized_delete_log(&session, parsed).await?;
    }
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.cache_delete_log(parsed).map_err(|e| e.to_string())?;
    Ok("log deleted".into())
}

#[tauri::command]
fn dirty_sync_count(state: State<AppLocalState>) -> Result<usize, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    Ok(store.list_dirty().map_err(|e| e.to_string())?.len())
}

#[tauri::command]
fn export_sync_payload(state: State<AppLocalState>, user_id: Option<String>) -> Result<String, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let auth_user_id = user_id.and_then(|v| Uuid::parse_str(&v).ok());
    let payload = store.export_sync_payload(auth_user_id, Some("desktop-dev".into())).map_err(|e| e.to_string())?;
    serde_json::to_string_pretty(&payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_last_sync_cursor(state: State<AppLocalState>) -> Result<serde_json::Value, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let cursor = store.load_last_sync_cursor().map_err(|e| e.to_string())?;
    serde_json::to_value(cursor).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_sync_status(state: State<AppLocalState>) -> Result<SyncStatusView, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let session = store.load_session().map_err(|e| e.to_string())?;
    let dirty_breakdown = store.dirty_breakdown().map_err(|e| e.to_string())?;
    let dirty_count = dirty_breakdown.plants + dirty_breakdown.tasks + dirty_breakdown.logs + dirty_breakdown.deletes;
    let last_sync_at = store.load_last_sync_cursor().map_err(|e| e.to_string())?.and_then(|c| c.last_synced_at);

    Ok(SyncStatusView {
        session_active: session.is_some(),
        user_id: session.as_ref().map(|s| s.user_id),
        auth_mode: session.as_ref().map(|s| s.auth_mode),
        backend_url: session.as_ref().map(|s| s.backend_url.clone()),
        dirty_count,
        dirty_breakdown,
        last_sync_at,
    })
}

#[tauri::command]
fn get_dirty_records(state: State<AppLocalState>) -> Result<Vec<DirtyRecord>, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.list_dirty_details().map_err(|e| e.to_string())
}

#[tauri::command]
fn get_stored_session(state: State<AppLocalState>) -> Result<Option<StoredSession>, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.load_session().map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_stored_session(state: State<AppLocalState>) -> Result<String, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.clear_session().map_err(|e| e.to_string())?;
    Ok("session cleared".into())
}

#[tauri::command]
async fn auth_register(state: State<'_, AppLocalState>, payload: RegisterPayload) -> Result<SessionView, String> {
    let backend_url = normalize_backend_url(payload.backend_url);
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{backend_url}/auth/register"))
        .json(&serde_json::json!({ "email": payload.email, "password": payload.password }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "register failed".into()));
    }

    let auth: AuthResponse = response.json().await.map_err(|e| e.to_string())?;
    finalize_auth(state, auth, backend_url)
}

#[tauri::command]
async fn auth_login(state: State<'_, AppLocalState>, payload: LoginPayload) -> Result<SessionView, String> {
    let backend_url = normalize_backend_url(payload.backend_url);
    let client = reqwest::Client::new();
    let response = client
        .post(format!("{backend_url}/auth/login"))
        .json(&serde_json::json!({ "email": payload.email, "password": payload.password }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "login failed".into()));
    }

    let auth: AuthResponse = response.json().await.map_err(|e| e.to_string())?;
    finalize_auth(state, auth, backend_url)
}

#[tauri::command]
async fn auth_fetch_me(state: State<'_, AppLocalState>) -> Result<UserProfile, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let session = store.load_session().map_err(|e| e.to_string())?.ok_or_else(|| "no stored session".to_string())?;
    drop(store);
    fetch_me_with_session(&session).await
}

#[tauri::command]
async fn subscription_status_smart(state: State<'_, AppLocalState>) -> Result<SubscriptionStatusSummary, String> {
    let session = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_session().map_err(|e| e.to_string())?
    };
    if let Some(session) = session {
        let client = reqwest::Client::new();
        let response = client
            .get(format!("{}/subscription/status", session.backend_url))
            .bearer_auth(&session.access_token)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(response.text().await.unwrap_or_else(|_| "subscription status failed".into()));
        }

        response.json().await.map_err(|e| e.to_string())
    } else {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        local_subscription_summary(&store)
    }
}

#[tauri::command]
async fn subscription_checkout_smart(state: State<'_, AppLocalState>, plan: String) -> Result<serde_json::Value, String> {
    let parsed_plan = parse_subscription_plan(&plan);
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let session = store.load_session().map_err(|e| e.to_string())?.ok_or_else(|| "no stored session".to_string())?;
    drop(store);

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/subscription/checkout", session.backend_url))
        .bearer_auth(&session.access_token)
        .json(&serde_json::json!({ "plan": format!("{:?}", parsed_plan).to_lowercase() }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "subscription checkout failed".into()));
    }

    response.json().await.map_err(|e| e.to_string())
}


#[tauri::command]
async fn subscription_webhook_stub_smart(state: State<'_, AppLocalState>, plan: String, checkout_status: Option<String>) -> Result<serde_json::Value, String> {
    let parsed_plan = parse_subscription_plan(&plan);
    let status_value = checkout_status.unwrap_or_else(|| "paid".to_string());
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let session = store.load_session().map_err(|e| e.to_string())?.ok_or_else(|| "no stored session".to_string())?;
    drop(store);

    let client = reqwest::Client::new();
    let response = client
        .post(format!("{}/subscription/webhook", session.backend_url))
        .json(&serde_json::json!({
            "user_id": session.user_id,
            "plan": format!("{:?}", parsed_plan).to_lowercase(),
            "checkout_status": status_value,
            "checkout_id": format!("stub-{}-{}", format!("{:?}", parsed_plan).to_lowercase(), session.user_id),
            "event_type": "checkout.completed",
            "provider": "desktop_stub"
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "subscription webhook stub failed".into()));
    }

    response.json().await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn subscription_history_smart(state: State<'_, AppLocalState>) -> Result<serde_json::Value, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let session = store.load_session().map_err(|e| e.to_string())?.ok_or_else(|| "no stored session".to_string())?;
    drop(store);

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/subscription/history", session.backend_url))
        .bearer_auth(&session.access_token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(response.text().await.unwrap_or_else(|_| "subscription history failed".into()));
    }

    response.json().await.map_err(|e| e.to_string())
}
#[tauri::command]
async fn sync_push_now(state: State<'_, AppLocalState>) -> Result<SyncRunResult, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let session = store.load_session().map_err(|e| e.to_string())?.ok_or_else(|| "no stored session".to_string())?;
    let payload = store.export_sync_payload(Some(session.user_id), Some("desktop-dev".into())).map_err(|e| e.to_string())?;
    let pushed = SyncRunResult {
        pushed_plants: payload.envelope.plants.len(),
        pushed_tasks: payload.envelope.tasks.len(),
        pushed_logs: payload.envelope.logs.len(),
        pushed_deleted: payload.deleted_records.len(),
        pulled_plants: 0,
        pulled_tasks: 0,
        pulled_logs: 0,
        pulled_deleted: 0,
    };
    drop(store);

    authorized_post_sync_push(&session, &payload).await?;

    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.clear_confirmed_upserts(&payload.envelope).map_err(|e| e.to_string())?;
    store.clear_confirmed_deleted(&payload.deleted_records).map_err(|e| e.to_string())?;
    Ok(pushed)
}

#[tauri::command]
async fn sync_pull_now(state: State<'_, AppLocalState>) -> Result<SyncRunResult, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let session = store.load_session().map_err(|e| e.to_string())?.ok_or_else(|| "no stored session".to_string())?;
    drop(store);

    let since = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_last_sync_cursor().map_err(|e| e.to_string())?.and_then(|c| c.last_synced_at)
    };

    let pulled = authorized_get_sync_pull(&session, since).await?;
    let result = SyncRunResult {
        pushed_plants: 0,
        pushed_tasks: 0,
        pushed_logs: 0,
        pushed_deleted: 0,
        pulled_plants: pulled.envelope.plants.len(),
        pulled_tasks: pulled.envelope.tasks.len(),
        pulled_logs: pulled.envelope.logs.len(),
        pulled_deleted: pulled.deleted_records.len(),
    };

    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.apply_sync_pull(&pulled.envelope, &pulled.deleted_records, Some(&pulled.cursor)).map_err(|e| e.to_string())?;
    Ok(result)
}

#[tauri::command]
async fn sync_now(state: State<'_, AppLocalState>) -> Result<SyncRunResult, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let session = store.load_session().map_err(|e| e.to_string())?.ok_or_else(|| "no stored session".to_string())?;
    let first_payload = store.export_sync_payload(Some(session.user_id), Some("desktop-dev".into())).map_err(|e| e.to_string())?;
    let mut pushed_plants = first_payload.envelope.plants.len();
    let mut pushed_tasks = first_payload.envelope.tasks.len();
    let mut pushed_logs = first_payload.envelope.logs.len();
    let mut pushed_deleted = first_payload.deleted_records.len();
    drop(store);

    authorized_post_sync_push(&session, &first_payload).await?;

    let since = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.load_last_sync_cursor().map_err(|e| e.to_string())?.and_then(|c| c.last_synced_at)
    };

    let pulled = authorized_get_sync_pull(&session, since).await?;
    let pulled_plants = pulled.envelope.plants.len();
    let pulled_tasks = pulled.envelope.tasks.len();
    let pulled_logs = pulled.envelope.logs.len();
    let pulled_deleted = pulled.deleted_records.len();

    {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.clear_confirmed_upserts(&first_payload.envelope).map_err(|e| e.to_string())?;
        store.clear_confirmed_deleted(&first_payload.deleted_records).map_err(|e| e.to_string())?;
        store.apply_sync_pull(&pulled.envelope, &pulled.deleted_records, Some(&pulled.cursor)).map_err(|e| e.to_string())?;
    }

    let second_payload = {
        let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
        store.export_sync_payload(Some(session.user_id), Some("desktop-dev".into())).map_err(|e| e.to_string())?
    };

    if !second_payload.envelope.plants.is_empty() || !second_payload.envelope.tasks.is_empty() || !second_payload.envelope.logs.is_empty() || !second_payload.deleted_records.is_empty() {
        authorized_post_sync_push(&session, &second_payload).await?;
        {
            let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
            store.clear_confirmed_upserts(&second_payload.envelope).map_err(|e| e.to_string())?;
            store.clear_confirmed_deleted(&second_payload.deleted_records).map_err(|e| e.to_string())?;
        }

        pushed_plants += second_payload.envelope.plants.len();
        pushed_tasks += second_payload.envelope.tasks.len();
        pushed_logs += second_payload.envelope.logs.len();
        pushed_deleted += second_payload.deleted_records.len();

        let final_since = {
            let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
            store.load_last_sync_cursor().map_err(|e| e.to_string())?.and_then(|c| c.last_synced_at)
        };

        let final_pull = authorized_get_sync_pull(&session, final_since).await?;
        let final_pulled_plants = final_pull.envelope.plants.len();
        let final_pulled_tasks = final_pull.envelope.tasks.len();
        let final_pulled_logs = final_pull.envelope.logs.len();
        let final_pulled_deleted = final_pull.deleted_records.len();

        {
            let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
            store.apply_sync_pull(&final_pull.envelope, &final_pull.deleted_records, Some(&final_pull.cursor)).map_err(|e| e.to_string())?;
        }

        return Ok(SyncRunResult {
            pushed_plants,
            pushed_tasks,
            pushed_logs,
            pushed_deleted,
            pulled_plants: pulled_plants + final_pulled_plants,
            pulled_tasks: pulled_tasks + final_pulled_tasks,
            pulled_logs: pulled_logs + final_pulled_logs,
            pulled_deleted: pulled_deleted + final_pulled_deleted,
        });
    }

    Ok(SyncRunResult { pushed_plants, pushed_tasks, pushed_logs, pushed_deleted, pulled_plants, pulled_tasks, pulled_logs, pulled_deleted })
}

#[tauri::command]
fn list_due_notification_candidates(state: State<AppLocalState>, within_minutes: Option<i64>) -> Result<ReminderCheckResult, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let reminders = store.list_due_notification_candidates(within_minutes.unwrap_or(30)).map_err(|e| e.to_string())?;
    Ok(ReminderCheckResult { count: reminders.len(), reminders })
}

#[tauri::command]
fn mark_notification_sent(state: State<AppLocalState>, payload: ReminderDispatchPayload) -> Result<String, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    let task_id = Uuid::parse_str(&payload.task_id).map_err(|e| e.to_string())?;
    let due_at = chrono::DateTime::parse_from_rfc3339(&payload.due_at).map_err(|e| e.to_string())?.with_timezone(&Utc);
    store.mark_notification_sent(task_id, due_at).map_err(|e| e.to_string())?;
    Ok("notification marked sent".into())
}

fn finalize_auth(state: State<'_, AppLocalState>, auth: AuthResponse, backend_url: String) -> Result<SessionView, String> {
    let store = state.store.lock().map_err(|_| "failed to lock store".to_string())?;
    store.link_authenticated_user(auth.user_id, auth.auth_mode).map_err(|e| e.to_string())?;
    let session = store.save_session(auth.user_id, auth.auth_mode, auth.access_token, backend_url).map_err(|e| e.to_string())?;
    let me = store.get_or_create_guest_user().map_err(|e| e.to_string())?;
    Ok(SessionView { session, me: UserProfile { user_id: auth.user_id, auth_mode: auth.auth_mode, ..me } })
}

fn main() {
    let app_dir = std::env::current_dir().expect("failed to get current dir");
    let db_path = app_dir.join("plants_calendar_local.sqlite");
    let store = LocalStore::open(db_path).expect("failed to initialize local store");

    tauri::Builder::default()
        .manage(AppLocalState { store: Mutex::new(store) })
        .invoke_handler(tauri::generate_handler![
            get_plan_info,
            bootstrap_local_user,
            list_local_plants,
            create_local_plant,
            update_local_plant,
            delete_local_plant,
            list_local_tasks,
            create_local_task,
            update_local_task_status,
            update_local_task,
            delete_local_task,
            list_local_logs,
            create_local_log,
            update_local_log,
            delete_local_log,
            list_current_plants,
            create_plant_smart,
            update_plant_smart,
            delete_plant_smart,
            list_current_tasks,
            create_task_smart,
            update_task_smart,
            update_task_status_smart,
            delete_task_smart,
            list_current_logs,
            create_log_smart,
            update_log_smart,
            delete_log_smart,
            dirty_sync_count,
            export_sync_payload,
            get_last_sync_cursor,
            get_sync_status,
            get_dirty_records,
            list_due_notification_candidates,
            mark_notification_sent,
            get_stored_session,
            clear_stored_session,
            auth_register,
            auth_login,
            auth_fetch_me,
            subscription_status_smart,
            subscription_checkout_smart,
            subscription_webhook_stub_smart,
            subscription_history_smart,
            sync_push_now,
            sync_pull_now,
            sync_now,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
