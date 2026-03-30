use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts},
    http::{header::AUTHORIZATION, request::Parts, StatusCode},
};
use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use shared::AuthMode;
use uuid::Uuid;

use crate::db::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthClaims {
    pub sub: String,
    pub auth_mode: String,
    pub exp: usize,
}

#[derive(Debug, Clone)]
pub struct SessionUser {
    pub user_id: Uuid,
    pub auth_mode: AuthMode,
}

impl SessionUser {
    pub fn is_guest(&self) -> bool {
        matches!(self.auth_mode, AuthMode::Anonymous)
    }
}

impl FromRef<AppState> for String {
    fn from_ref(state: &AppState) -> Self {
        state.jwt_secret.clone()
    }
}

pub fn hash_password(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn verify_password(input: &str, expected_hash: &str) -> bool {
    hash_password(input) == expected_hash
}

pub fn issue_token(user_id: Uuid, auth_mode: AuthMode, secret: &str) -> anyhow::Result<String> {
    let auth_mode = match auth_mode {
        AuthMode::Anonymous => "anonymous",
        AuthMode::Email => "email",
        AuthMode::Google => "google",
    };
    let claims = AuthClaims {
        sub: user_id.to_string(),
        auth_mode: auth_mode.to_string(),
        exp: (Utc::now() + Duration::days(30)).timestamp() as usize,
    };
    Ok(encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.as_bytes()))?)
}

pub fn decode_token(token: &str, secret: &str) -> anyhow::Result<SessionUser> {
    let data = decode::<AuthClaims>(token, &DecodingKey::from_secret(secret.as_bytes()), &Validation::default())?;
    let user_id = Uuid::parse_str(&data.claims.sub)?;
    let auth_mode = match data.claims.auth_mode.as_str() {
        "email" => AuthMode::Email,
        "google" => AuthMode::Google,
        _ => AuthMode::Anonymous,
    };
    Ok(SessionUser { user_id, auth_mode })
}

#[async_trait]
impl<S> FromRequestParts<S> for SessionUser
where
    S: Send + Sync,
    String: FromRef<S>,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let secret = String::from_ref(state);
        let auth_header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "missing authorization header".to_string()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or((StatusCode::UNAUTHORIZED, "invalid authorization scheme".to_string()))?;

        decode_token(token, &secret).map_err(|_| (StatusCode::UNAUTHORIZED, "invalid token".to_string()))
    }
}
