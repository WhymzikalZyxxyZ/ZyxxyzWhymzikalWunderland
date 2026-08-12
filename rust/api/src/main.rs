// Rust REST API — Axum. Mirrors Python Flask and dotnet/api.
//
// A security audit found this file's auth was entirely non-cryptographic:
// sha256() was a placeholder XOR rolling hash (explicitly labeled as such
// in its own comment), and make_token() produced an unsigned
// "demo.{username}.{exp}.{now}" string any client could forge for any
// username by just formatting it themselves — submit_score didn't even
// check it, hardcoding "anonymous". Fixed by actually using the
// jsonwebtoken crate (already declared in Cargo.toml but unused) for real
// HMAC-signed tokens, and adding argon2 for real salted password hashing —
// bringing this to parity with typescript/api and python/api's auth.
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use axum::{
    extract::Query,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Extension, Json, Router,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::{Arc, Mutex}, time::{SystemTime, UNIX_EPOCH}};
use tokio::net::TcpListener;

#[derive(Clone, Default)]
struct Store {
    users:  HashMap<String, String>,   // username → argon2 PHC hash
    scores: Vec<ScoreRow>,
}

#[derive(Clone, Serialize)]
struct ScoreRow { username: String, game: String, value: i64, ts: u64 }

type State = Arc<Mutex<Store>>;

// Wraps the JWT signing secret so it can be shared via Extension without
// being confused with any other String-typed state.
#[derive(Clone)]
struct JwtSecret(Arc<String>);

fn now_secs() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() }

fn hash_pw(pw: &str) -> String {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(pw.as_bytes(), &salt)
        .expect("argon2 hashing failed")
        .to_string()
}

fn verify_pw(pw: &str, stored: &str) -> bool {
    match PasswordHash::new(stored) {
        Ok(parsed) => Argon2::default().verify_password(pw.as_bytes(), &parsed).is_ok(),
        Err(_) => false,
    }
}

#[derive(Deserialize)] struct RegisterReq { username: String, password: String }
#[derive(Deserialize)] struct LoginReq    { username: String, password: String }
#[derive(Deserialize)] struct ScoreReq   { game: String, value: i64 }
#[derive(Deserialize)] struct ScoreQuery { game: Option<String>, limit: Option<usize> }

#[derive(Serialize)] struct TokenRes { token: String }
#[derive(Serialize)] struct ErrRes   { error: String }

#[derive(Serialize, Deserialize)]
struct Claims { sub: String, iat: u64, exp: u64 }

fn make_token(username: &str, secret: &JwtSecret) -> String {
    let now = now_secs();
    let claims = Claims { sub: username.to_string(), iat: now, exp: now + 3600 };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(secret.0.as_bytes()))
        .expect("jwt encoding failed")
}

// Returns the authenticated username, or None if the Authorization header
// is missing, malformed, unsigned-with-a-different-key, or expired.
fn verify_bearer(headers: &HeaderMap, secret: &JwtSecret) -> Option<String> {
    let auth = headers.get(axum::http::header::AUTHORIZATION)?.to_str().ok()?;
    let token = auth.strip_prefix("Bearer ")?;
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.0.as_bytes()),
        &Validation::new(jsonwebtoken::Algorithm::HS256),
    )
    .ok()?;
    Some(data.claims.sub)
}

#[tokio::main]
async fn main() {
    let secret = std::env::var("JWT_SECRET").expect("JWT_SECRET environment variable is required");
    if secret.len() < 32 {
        panic!("JWT_SECRET must be at least 32 characters");
    }
    let secret = JwtSecret(Arc::new(secret));

    let state: State = Arc::new(Mutex::new(Store::default()));
    let app = Router::new()
        .route("/api/auth/register", post(register))
        .route("/api/auth/login",    post(login))
        .route("/api/scores",        get(get_scores).post(submit_score))
        .route("/api/status",        get(status_handler))
        .route("/health",            get(|| async { Json(serde_json::json!({"status":"ok"})) }))
        .layer(Extension(state))
        .layer(Extension(secret));

    let listener = TcpListener::bind("0.0.0.0:5070").await.unwrap();
    println!("Rust API on :5070");
    axum::serve(listener, app).await.unwrap();
}

async fn register(
    Extension(state): Extension<State>,
    Extension(secret): Extension<JwtSecret>,
    Json(body): Json<RegisterReq>,
) -> axum::response::Response {
    if !body.username.chars().all(|c| c.is_alphanumeric() || c=='_' || c=='-') || body.username.len() < 2 || body.username.len() > 32 {
        return (StatusCode::BAD_REQUEST, Json(ErrRes{error:"Invalid username.".into()})).into_response();
    }
    if body.password.len() < 8 || body.password.len() > 128 {
        return (StatusCode::BAD_REQUEST, Json(ErrRes{error:"Password must be 8-128 chars.".into()})).into_response();
    }
    let mut s = state.lock().unwrap();
    if s.users.contains_key(&body.username) {
        return (StatusCode::CONFLICT, Json(ErrRes{error:"Username taken.".into()})).into_response();
    }
    s.users.insert(body.username.clone(), hash_pw(&body.password));
    (StatusCode::CREATED, Json(TokenRes{token:make_token(&body.username, &secret)})).into_response()
}

async fn login(
    Extension(state): Extension<State>,
    Extension(secret): Extension<JwtSecret>,
    Json(body): Json<LoginReq>,
) -> axum::response::Response {
    let s = state.lock().unwrap();
    let valid = s.users.get(&body.username).is_some_and(|stored| verify_pw(&body.password, stored));
    if !valid {
        return (StatusCode::UNAUTHORIZED, Json(ErrRes{error:"Invalid credentials.".into()})).into_response();
    }
    Json(TokenRes{token:make_token(&body.username, &secret)}).into_response()
}

async fn get_scores(Extension(state): Extension<State>, Query(q): Query<ScoreQuery>) -> Json<Vec<ScoreRow>> {
    let s = state.lock().unwrap();
    let limit = q.limit.unwrap_or(20).min(100);
    let mut rows: Vec<ScoreRow> = s.scores.iter()
        .filter(|r| q.game.as_deref().is_none_or(|g| r.game == g))
        .cloned().collect();
    rows.sort_by_key(|r| -(r.value));
    rows.truncate(limit);
    Json(rows)
}

async fn submit_score(
    Extension(state): Extension<State>,
    Extension(secret): Extension<JwtSecret>,
    headers: HeaderMap,
    Json(body): Json<ScoreReq>,
) -> axum::response::Response {
    // Previously unauthenticated (hardcoded "anonymous", the comment
    // admitted auth wasn't wired up) — now requires the same Bearer token
    // register/login issue, matching typescript/api's requireAuth.
    let Some(username) = verify_bearer(&headers, &secret) else {
        return (StatusCode::UNAUTHORIZED, Json(ErrRes{error:"Invalid or expired token".into()})).into_response();
    };
    if body.value < 0 {
        return (StatusCode::BAD_REQUEST, Json(ErrRes{error:"value must be >= 0.".into()})).into_response();
    }
    let entry = ScoreRow { username, game: body.game.clone(), value: body.value, ts: now_secs() };
    state.lock().unwrap().scores.push(entry.clone());
    (StatusCode::CREATED, Json(entry)).into_response()
}

async fn status_handler() -> Json<serde_json::Value> {
    Json(serde_json::json!([{"id":"rust-api","label":"Rust Axum API","ok":true,"latency":0,"ts":now_secs()*1000,"uptime":1.0}]))
}
