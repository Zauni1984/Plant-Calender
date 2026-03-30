pub mod models;
pub mod repos;

use sqlx::{postgres::PgPoolOptions, PgPool};

#[derive(Clone)]
pub struct AppState {
    pub pg: PgPool,
    pub jwt_secret: String,
}

impl AppState {
    pub async fn from_env() -> anyhow::Result<Self> {
        let database_url = std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/plants_calendar".to_string());
        let pg = PgPoolOptions::new().max_connections(5).connect_lazy(&database_url)?;
        let jwt_secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-change-me".to_string());
        Ok(Self { pg, jwt_secret })
    }
}
