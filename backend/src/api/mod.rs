use axum::{extract::{Path, Query, State}, http::StatusCode, response::IntoResponse, Json};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use shared::{
    AuthMode, LogEntry, LogType, Plant, PlantPhase, PlantStatus, SubscriptionPlan, SubscriptionStatusSummary, SyncCursor, SyncEnvelope,
    SyncPullResponse, SyncPushRequest, Task, TaskCategory, TaskStatus,
};
use uuid::Uuid;

use crate::{
    db::{repos, AppState},
    services::{auth::SessionUser, plants},
};

#[derive(Serialize)]
pub struct ApiMessage {
    message: String,
}

#[derive(Serialize)]
pub struct AuthResponse {
    pub user_id: Uuid,
    pub auth_mode: AuthMode,
    pub access_token: String,
}

fn api_error(status: StatusCode, message: impl ToString) -> impl IntoResponse {
    (status, Json(ApiMessage { message: message.to_string() })).into_response()
}

fn next_recurring_due_after(current_due: chrono::DateTime<Utc>, repeat_interval_hours: Option<i32>, now: chrono::DateTime<Utc>) -> Option<chrono::DateTime<Utc>> {
    let hours = repeat_interval_hours?;
    if hours <= 0 {
        return None;
    }
    let step = chrono::Duration::hours(hours as i64);
    let mut next_due = current_due + step;
    while next_due <= now {
        next_due += step;
    }
    Some(next_due)
}

pub async fn health() -> impl IntoResponse {
    Json(ApiMessage { message: "ok".into() })
}

#[derive(Deserialize)]
pub struct RegisterPayload {
    pub email: String,
    pub password: String,
}

pub async fn auth_register(State(state): State<AppState>, Json(payload): Json<RegisterPayload>) -> impl IntoResponse {
    match repos::get_user_by_email(&state, &payload.email).await {
        Ok(Some(_)) => return api_error(StatusCode::CONFLICT, "email already registered"),
        Ok(None) => {},
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
    let user_id = Uuid::new_v4();
    let password_hash = crate::services::auth::hash_password(&payload.password);
    match repos::create_user_with_credentials(&state, user_id, payload.email, password_hash, AuthMode::Email).await {
        Ok(user) => match crate::services::auth::issue_token(user.user_id, AuthMode::Email, &state.jwt_secret) {
            Ok(token) => Json(AuthResponse { user_id: user.user_id, auth_mode: AuthMode::Email, access_token: token }).into_response(),
            Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
        },
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct LoginPayload {
    pub email: String,
    pub password: String,
}

pub async fn auth_login(State(state): State<AppState>, Json(payload): Json<LoginPayload>) -> impl IntoResponse {
    let user = match repos::get_user_by_email(&state, &payload.email).await {
        Ok(Some(user)) => user,
        Ok(None) => return api_error(StatusCode::UNAUTHORIZED, "invalid credentials"),
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    };
    let password_hash = match repos::get_password_hash_by_user_id(&state, user.user_id).await {
        Ok(Some(value)) => value,
        Ok(None) => return api_error(StatusCode::UNAUTHORIZED, "invalid credentials"),
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    };
    if !crate::services::auth::verify_password(&payload.password, &password_hash) {
        return api_error(StatusCode::UNAUTHORIZED, "invalid credentials");
    }
    match crate::services::auth::issue_token(user.user_id, AuthMode::Email, &state.jwt_secret) {
        Ok(token) => Json(AuthResponse { user_id: user.user_id, auth_mode: AuthMode::Email, access_token: token }).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct GooglePayload {
    pub id_token: String,
}

pub async fn auth_google(State(state): State<AppState>, Json(_payload): Json<GooglePayload>) -> impl IntoResponse {
    let user_id = Uuid::new_v4();
    match repos::get_or_create_user(&state, user_id, AuthMode::Google).await {
        Ok(user) => match crate::services::auth::issue_token(user.user_id, AuthMode::Google, &state.jwt_secret) {
            Ok(token) => Json(AuthResponse { user_id: user.user_id, auth_mode: AuthMode::Google, access_token: token }).into_response(),
            Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
        },
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn auth_logout(_session: SessionUser) -> impl IntoResponse {
    StatusCode::NO_CONTENT
}

pub async fn get_me(State(state): State<AppState>, session: SessionUser) -> impl IntoResponse {
    match repos::get_or_create_user(&state, session.user_id, session.auth_mode).await {
        Ok(user) => Json(user).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct AdultConfirmationPayload {
    pub adult_confirmed: bool,
}

pub async fn patch_adult_confirmation(
    State(state): State<AppState>,
    session: SessionUser,
    Json(payload): Json<AdultConfirmationPayload>,
) -> impl IntoResponse {
    match repos::update_adult_confirmation(&state, session.user_id, payload.adult_confirmed).await {
        Ok(user) => Json(user).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn list_plants(State(state): State<AppState>, session: SessionUser) -> impl IntoResponse {
    match repos::list_plants(&state, session.user_id).await {
        Ok(plants) => Json(plants).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct CreatePlantPayload {
    pub name: String,
    pub color_tag: String,
    pub phase: PlantPhase,
}

pub async fn create_plant(
    State(state): State<AppState>,
    session: SessionUser,
    Json(payload): Json<CreatePlantPayload>,
) -> impl IntoResponse {
    let user = match repos::get_or_create_user(&state, session.user_id, session.auth_mode).await {
        Ok(user) => user,
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    };

    let existing_plants = match repos::list_plants(&state, user.user_id).await {
        Ok(plants) => plants,
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    };

    if let Err(err) = plants::validate_create_from_plants(&existing_plants, user.plan) {
        return api_error(StatusCode::FORBIDDEN, err);
    }

    let plant = plants::build_plant(user.user_id, payload.name, payload.color_tag, payload.phase);
    match repos::insert_plant(&state, &plant).await {
        Ok(_) => (StatusCode::CREATED, Json(plant)).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn get_plant(Path(id): Path<Uuid>, State(state): State<AppState>, session: SessionUser) -> impl IntoResponse {
    match repos::get_plant(&state, session.user_id, id).await {
        Ok(Some(plant)) => Json(plant).into_response(),
        Ok(None) => api_error(StatusCode::NOT_FOUND, "plant not found"),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct UpdatePlantPayload {
    pub name: Option<String>,
    pub color_tag: Option<String>,
    pub phase: Option<PlantPhase>,
    #[serde(default)]
    pub archived: Option<bool>,
    pub status: Option<PlantStatus>,
}

pub async fn update_plant(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    session: SessionUser,
    Json(payload): Json<UpdatePlantPayload>,
) -> impl IntoResponse {
    let user = match repos::get_or_create_user(&state, session.user_id, session.auth_mode).await {
        Ok(user) => user,
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    };
    let current = match repos::get_plant(&state, session.user_id, id).await {
        Ok(Some(plant)) => plant,
        Ok(None) => return api_error(StatusCode::NOT_FOUND, "plant not found"),
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    };
    let target_status = shared::resolve_requested_plant_status(current.status, payload.status, payload.archived, None);
    if shared::is_reactivation_transition(current.status, target_status) {
        let existing_plants = match repos::list_plants(&state, session.user_id).await {
            Ok(plants) => plants,
            Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
        };
        if let Err(err) = plants::validate_reactivate_from_plants(&existing_plants, id, user.plan) {
            return api_error(StatusCode::FORBIDDEN, err);
        }
    }

    match repos::update_plant(&state, session.user_id, id, payload.name, payload.color_tag, payload.phase, target_status).await {
        Ok(plant) => Json(plant).into_response(),
        Err(err) if err.to_string().contains("not found") => api_error(StatusCode::NOT_FOUND, err),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn delete_plant(Path(id): Path<Uuid>, State(state): State<AppState>, session: SessionUser) -> impl IntoResponse {
    match repos::delete_plant(&state, session.user_id, id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn list_tasks_for_plant(Path(id): Path<Uuid>, State(state): State<AppState>, _session: SessionUser) -> impl IntoResponse {
    match repos::list_tasks_for_plant(&state, id).await {
        Ok(tasks) => Json(tasks).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct CreateTaskPayload {
    pub title: String,
    pub category: TaskCategory,
    pub due_at: chrono::DateTime<Utc>,
    pub repeat_interval_hours: Option<i32>,
    pub notification_enabled: bool,
}

pub async fn create_task_for_plant(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    _session: SessionUser,
    Json(payload): Json<CreateTaskPayload>,
) -> impl IntoResponse {
    let now = Utc::now();
    let task = Task {
        task_id: Uuid::new_v4(),
        plant_id: id,
        title: payload.title,
        category: payload.category,
        due_at: payload.due_at,
        repeat_interval_hours: payload.repeat_interval_hours,
        notification_enabled: payload.notification_enabled,
        status: TaskStatus::Open,
        created_at: now,
        updated_at: now,
    };
    match repos::insert_task(&state, &task).await {
        Ok(_) => (StatusCode::CREATED, Json(task)).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct UpdateTaskPayload {
    pub title: Option<String>,
    pub status: Option<TaskStatus>,
    pub due_at: Option<chrono::DateTime<Utc>>,
    pub repeat_interval_hours: Option<i32>,
    pub notification_enabled: Option<bool>,
}

pub async fn update_task(Path(id): Path<Uuid>, State(state): State<AppState>, _session: SessionUser, Json(payload): Json<UpdateTaskPayload>) -> impl IntoResponse {
    let existing = match repos::get_task(&state, id).await {
        Ok(Some(task)) => task,
        Ok(None) => return api_error(StatusCode::NOT_FOUND, "task not found"),
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    };

    let requested_status = payload.status;
    let repeat_interval_hours = payload.repeat_interval_hours.or(existing.repeat_interval_hours);
    let mut due_at = payload.due_at;
    let mut final_status = requested_status.unwrap_or(existing.status);

    if requested_status == Some(TaskStatus::Done) && due_at.is_none() {
        if let Some(next_due) = next_recurring_due_after(existing.due_at, repeat_interval_hours, Utc::now()) {
            due_at = Some(next_due);
            final_status = TaskStatus::Open;
        }
    }

    match repos::update_task(&state, id, payload.title, Some(final_status), due_at, payload.repeat_interval_hours, payload.notification_enabled).await {
        Ok(task) => Json(task).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn delete_task(Path(id): Path<Uuid>, State(state): State<AppState>, session: SessionUser) -> impl IntoResponse {
    match repos::delete_task(&state, session.user_id, id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn list_logs_for_plant(Path(id): Path<Uuid>, State(state): State<AppState>, _session: SessionUser) -> impl IntoResponse {
    match repos::list_logs_for_plant(&state, id).await {
        Ok(logs) => Json(logs).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct CreateLogPayload {
    pub log_type: Option<LogType>,
    pub created_at: Option<chrono::DateTime<Utc>>,
    pub text: Option<String>,
    pub metrics: Option<shared::Metrics>,
    pub action: Option<serde_json::Value>,
    pub photo_refs: Option<Vec<String>>,
}

pub async fn create_log_for_plant(
    Path(id): Path<Uuid>,
    State(state): State<AppState>,
    _session: SessionUser,
    Json(payload): Json<CreateLogPayload>,
) -> impl IntoResponse {
    let log = LogEntry {
        log_id: Uuid::new_v4(),
        plant_id: id,
        log_type: payload.log_type.unwrap_or(LogType::Note),
        text: payload.text,
        metrics: payload.metrics,
        action: payload.action.and_then(|v| serde_json::from_value(v).ok()),
        photo_refs: payload.photo_refs,
        created_at: payload.created_at.unwrap_or_else(Utc::now),
    };
    match repos::insert_log(&state, &log).await {
        Ok(_) => (StatusCode::CREATED, Json(log)).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct UpdateLogPayload {
    pub log_type: Option<LogType>,
    pub text: Option<String>,
    pub metrics: Option<shared::Metrics>,
    pub action: Option<serde_json::Value>,
    pub photo_refs: Option<Vec<String>>,
}

pub async fn update_log(Path(id): Path<Uuid>, State(state): State<AppState>, _session: SessionUser, Json(payload): Json<UpdateLogPayload>) -> impl IntoResponse {
    match repos::update_log(&state, id, payload.log_type, payload.text, payload.metrics, payload.action, payload.photo_refs).await {
        Ok(log) => Json(log).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn delete_log(Path(id): Path<Uuid>, State(state): State<AppState>, session: SessionUser) -> impl IntoResponse {
    match repos::delete_log(&state, session.user_id, id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn get_subscription(State(state): State<AppState>, session: SessionUser) -> impl IntoResponse {
    match repos::get_or_create_user(&state, session.user_id, session.auth_mode).await {
        Ok(user) => {
            let history = repos::list_subscription_history(&state, session.user_id, 10).await.unwrap_or_default();
            let summary = repos::subscription_status_summary(&state, session.user_id, user.plan)
                .await
                .unwrap_or_else(|_| SubscriptionStatusSummary::empty_for_plan(user.plan));
            Json(serde_json::json!({
                "plan": format!("{:?}", user.plan).to_lowercase(),
                "plant_limit": user.plan.plant_limit(),
                "history": history,
                "summary": summary,
            })).into_response()
        },
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn get_subscription_status(State(state): State<AppState>, session: SessionUser) -> impl IntoResponse {
    let user = match repos::get_or_create_user(&state, session.user_id, session.auth_mode).await {
        Ok(user) => user,
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    };
    match repos::subscription_status_summary(&state, session.user_id, user.plan).await {
        Ok(summary) => Json(summary).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn get_subscription_history(State(state): State<AppState>, session: SessionUser) -> impl IntoResponse {
    match repos::list_subscription_history(&state, session.user_id, 50).await {
        Ok(history) => Json(serde_json::json!({"history": history})).into_response(),
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

#[derive(Deserialize)]
pub struct CheckoutPayload {
    pub plan: SubscriptionPlan,
}

#[derive(Serialize)]
pub struct CheckoutResponse {
    pub status: String,
    pub plan: String,
    pub mode: String,
    pub message: String,
    pub checkout_url: Option<String>,
    pub plant_limit: usize,
    pub price_eur_month: f32,
    pub activated_immediately: bool,
}

#[derive(Deserialize)]
pub struct CheckoutReturnQuery {
    pub plan: Option<String>,
    pub user_id: Option<Uuid>,
    pub checkout_status: Option<String>,
    pub checkout_id: Option<String>,
}

#[derive(Deserialize)]
pub struct CheckoutWebhookPayload {
    pub user_id: Uuid,
    pub plan: SubscriptionPlan,
    pub checkout_status: String,
    pub checkout_id: Option<String>,
    pub event_type: Option<String>,
    pub provider: Option<String>,
}

#[derive(Serialize)]
pub struct CheckoutWebhookResponse {
    pub status: String,
    pub applied: bool,
    pub plan: String,
    pub user_id: Uuid,
    pub checkout_status: String,
    pub event_type: String,
    pub provider: String,
    pub checkout_id: Option<String>,
    pub activated_immediately: bool,
    pub message: String,
}

fn checkout_price_eur_month(plan: SubscriptionPlan) -> f32 {
    match plan {
        SubscriptionPlan::Free => 0.0,
        SubscriptionPlan::Basic => 0.99,
        SubscriptionPlan::Pro => 5.99,
        SubscriptionPlan::Csc => 50.0,
    }
}

fn checkout_mode_for(plan: SubscriptionPlan) -> &'static str {
    match plan {
        SubscriptionPlan::Free => "direct_plan_change",
        SubscriptionPlan::Basic | SubscriptionPlan::Pro | SubscriptionPlan::Csc => "external_checkout_stub",
    }
}

fn build_checkout_url(base: Option<&str>, user_id: Uuid, plan: SubscriptionPlan) -> Option<String> {
    let base = base?.trim();
    if base.is_empty() {
        return None;
    }
    let separator = if base.contains('?') { '&' } else { '?' };
    Some(format!(
        "{base}{separator}plan={plan}&user_id={user_id}",
        plan = format!("{:?}", plan).to_lowercase()
    ))
}

fn checkout_status_allows_activation(value: &str) -> bool {
    matches!(value.trim().to_lowercase().as_str(), "paid" | "success" | "completed" | "active")
}

pub async fn get_subscription_checkout_return(Query(query): Query<CheckoutReturnQuery>) -> impl IntoResponse {
    let status = query.checkout_status.unwrap_or_else(|| "pending".to_string());
    let plan = query.plan.unwrap_or_else(|| "unknown".to_string());
    let message = if checkout_status_allows_activation(&status) {
        format!("Checkout-Rückkehr für Plan {plan} erkannt. Der finale Aktivierungsstand kann jetzt über Webhook oder Bestätigung verarbeitet werden.")
    } else {
        format!("Checkout-Rückkehr für Plan {plan} mit Status {status} erkannt. Eine Aktivierung erfolgt erst bei erfolgreicher Zahlungsbestätigung.")
    };
    Json(serde_json::json!({
        "status": "return_received",
        "plan": plan,
        "checkout_status": status,
        "user_id": query.user_id,
        "checkout_id": query.checkout_id,
        "message": message,
    }))
}

pub async fn post_subscription_checkout(State(state): State<AppState>, session: SessionUser, Json(payload): Json<CheckoutPayload>) -> impl IntoResponse {
    let current_user = match repos::get_or_create_user(&state, session.user_id, session.auth_mode).await {
        Ok(user) => user,
        Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    };
    let previous_plan = current_user.plan;
    let normalized_plan = format!("{:?}", payload.plan).to_lowercase();
    let checkout_url = build_checkout_url(std::env::var("CHECKOUT_BASE_URL").ok().as_deref(), session.user_id, payload.plan);
    let mode = checkout_mode_for(payload.plan).to_string();
    let price = checkout_price_eur_month(payload.plan);
    let message = if payload.plan == SubscriptionPlan::Free {
        "Free-Plan wird direkt ohne externen Checkout gesetzt.".to_string()
    } else if checkout_url.is_some() {
        format!(
            "Checkout-Stub für {plan} vorbereitet. In diesem MVP wird der Plan zusätzlich direkt aktiviert.",
            plan = normalized_plan
        )
    } else {
        format!(
            "Checkout-Stub für {plan} vorbereitet. Sobald CHECKOUT_BASE_URL gesetzt ist, wird hier eine externe Checkout-URL zurückgegeben. In diesem MVP wird der Plan zusätzlich direkt aktiviert.",
            plan = normalized_plan
        )
    };
    let checkout_id = Some(format!("stub_{}", Uuid::new_v4()));

    let _ = repos::record_subscription_history(&state, session.user_id, "checkout_prepared", payload.plan, Some(previous_plan), checkout_id.as_deref(), Some("stub"), Some("pending"), Some(&message)).await;

    match repos::upsert_user_plan(&state, session.user_id, payload.plan).await {
        Ok(_) => {
            let _ = repos::enforce_user_plan_limit(&state, session.user_id).await;
            let _ = repos::record_subscription_history(&state, session.user_id, "plan_activated_mvp_direct", payload.plan, Some(previous_plan), checkout_id.as_deref(), Some("stub"), Some("active"), Some("Plan im MVP direkt aktiviert.")).await;
            Json(CheckoutResponse {
                status: "ready".into(),
                plan: normalized_plan,
                mode,
                message,
                checkout_url,
                plant_limit: payload.plan.plant_limit(),
                price_eur_month: price,
                activated_immediately: true,
            }).into_response()
        },
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}

pub async fn post_subscription_webhook(State(state): State<AppState>, Json(payload): Json<CheckoutWebhookPayload>) -> impl IntoResponse {
    let normalized_plan = format!("{:?}", payload.plan).to_lowercase();
    let event_type = payload.event_type.clone().unwrap_or_else(|| "checkout.completed".to_string());
    let provider = payload.provider.clone().unwrap_or_else(|| "stub".to_string());
    let activation_allowed = checkout_status_allows_activation(&payload.checkout_status);
    let previous_plan = repos::get_user(&state, payload.user_id).await.ok().flatten().map(|u| u.plan);

    let _ = repos::record_subscription_history(&state, payload.user_id, "webhook_received", payload.plan, previous_plan, payload.checkout_id.as_deref(), Some(&provider), Some(&payload.checkout_status), Some(&format!("Webhook-Event {event_type} empfangen."))).await;

    if activation_allowed {
        if let Err(err) = repos::upsert_user_plan(&state, payload.user_id, payload.plan).await {
            return api_error(StatusCode::INTERNAL_SERVER_ERROR, err);
        }
        let _ = repos::enforce_user_plan_limit(&state, payload.user_id).await;
        let _ = repos::record_subscription_history(&state, payload.user_id, "plan_activated_webhook", payload.plan, previous_plan, payload.checkout_id.as_deref(), Some(&provider), Some(&payload.checkout_status), Some("Plan nach erfolgreichem Webhook aktiviert.")).await;
    }

    Json(CheckoutWebhookResponse {
        status: if activation_allowed { "processed".into() } else { "ignored".into() },
        applied: activation_allowed,
        plan: normalized_plan.clone(),
        user_id: payload.user_id,
        checkout_status: payload.checkout_status.clone(),
        event_type,
        provider,
        checkout_id: payload.checkout_id.clone(),
        activated_immediately: activation_allowed,
        message: if activation_allowed {
            format!("Webhook für Plan {normalized_plan} verarbeitet. Der Nutzerplan wurde aktualisiert.")
        } else {
            format!("Webhook für Plan {normalized_plan} empfangen, aber wegen Checkout-Status {} noch nicht aktiviert.", payload.checkout_status)
        },
    }).into_response()
}

pub async fn sync_push(
    State(state): State<AppState>,
    session: SessionUser,
    Json(payload): Json<SyncPushRequest>,
) -> impl IntoResponse {
    if let Some(guest_user_id) = payload.guest_user_id {
        if guest_user_id != session.user_id && !session.is_guest() {
            if let Err(err) = repos::merge_guest_data(&state, guest_user_id, session.user_id).await {
                return api_error(StatusCode::INTERNAL_SERVER_ERROR, err);
            }
        }
    }

    for mut plant in payload.envelope.plants {
        plant.user_id = session.user_id;
        plant.normalize_in_place();
        if let Err(err) = repos::upsert_plant(&state, &plant).await {
            return api_error(StatusCode::INTERNAL_SERVER_ERROR, err);
        }
    }
    for task in payload.envelope.tasks {
        if let Err(err) = repos::upsert_task(&state, &task).await {
            return api_error(StatusCode::INTERNAL_SERVER_ERROR, err);
        }
    }
    for log in payload.envelope.logs {
        if let Err(err) = repos::upsert_log(&state, &log).await {
            return api_error(StatusCode::INTERNAL_SERVER_ERROR, err);
        }
    }

    for deleted in payload.deleted_records {
        if let Err(err) = repos::record_delete(&state, session.user_id, deleted.record_id, match deleted.entity_kind { shared::SyncEntityKind::Plant => "plant", shared::SyncEntityKind::Task => "task", shared::SyncEntityKind::Log => "log" }).await {
            return api_error(StatusCode::INTERNAL_SERVER_ERROR, err);
        }
    }
    let _ = repos::enforce_user_plan_limit(&state, session.user_id).await;
    Json(serde_json::json!({ "status": "ok", "synced_at": Utc::now() })).into_response()
}

#[derive(Deserialize)]
pub struct SyncPullQuery {
    pub since: Option<chrono::DateTime<Utc>>,
}

pub async fn sync_pull(
    State(state): State<AppState>,
    session: SessionUser,
    Query(query): Query<SyncPullQuery>,
) -> impl IntoResponse {
    match repos::list_changes_since(&state, session.user_id, query.since).await {
        Ok((plants, tasks, logs)) => {
            let deleted_records = match repos::list_deleted_records_since(&state, session.user_id, query.since).await { Ok(v) => v, Err(err) => return api_error(StatusCode::INTERNAL_SERVER_ERROR, err), };
            Json(SyncPullResponse {
            cursor: SyncCursor {
                user_id: Some(session.user_id),
                device_id: None,
                last_synced_at: Some(Utc::now()),
            },
            envelope: SyncEnvelope { plants, tasks, logs },
            deleted_records,
        }).into_response() },
        Err(err) => api_error(StatusCode::INTERNAL_SERVER_ERROR, err),
    }
}
