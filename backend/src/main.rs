mod api;
mod db;
mod services;

use axum::{routing::{get, patch, post}, Router};
use db::AppState;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new("info"))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let state = AppState::from_env().await?;

    let app = Router::new()
        .route("/health", get(api::health))
        .route("/auth/register", post(api::auth_register))
        .route("/auth/login", post(api::auth_login))
        .route("/auth/google", post(api::auth_google))
        .route("/auth/logout", post(api::auth_logout))
        .route("/me", get(api::get_me))
        .route("/me/adult-confirmation", patch(api::patch_adult_confirmation))
        .route("/plants", get(api::list_plants).post(api::create_plant))
        .route("/plants/:id", get(api::get_plant).patch(api::update_plant).delete(api::delete_plant))
        .route("/plants/:id/tasks", get(api::list_tasks_for_plant).post(api::create_task_for_plant))
        .route("/tasks/:id", patch(api::update_task).delete(api::delete_task))
        .route("/plants/:id/logs", get(api::list_logs_for_plant).post(api::create_log_for_plant))
        .route("/logs/:id", patch(api::update_log).delete(api::delete_log))
        .route("/subscription", get(api::get_subscription))
        .route("/subscription/status", get(api::get_subscription_status))
        .route("/subscription/history", get(api::get_subscription_history))
        .route("/subscription/checkout", post(api::post_subscription_checkout))
        .route("/subscription/checkout/return", get(api::get_subscription_checkout_return))
        .route("/subscription/webhook", post(api::post_subscription_webhook))
        .route("/sync/push", post(api::sync_push))
        .route("/sync/pull", get(api::sync_pull))
        .with_state(state)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    tracing::info!("backend listening on 0.0.0.0:8080");
    axum::serve(listener, app).await?;
    Ok(())
}
