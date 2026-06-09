// Rust REST API — Axum. Mirrors Python Flask and dotnet/api.
use axum::{extract::Query, routing::{get, post}, Json, Router, Extension};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::{Arc, Mutex}, time::{SystemTime, UNIX_EPOCH}};
use tokio::net::TcpListener;

#[derive(Clone, Default)]
struct Store {
    users:  HashMap<String, String>,   // username → sha256(pw)
    scores: Vec<ScoreRow>,
}

#[derive(Clone, Serialize)]
struct ScoreRow { username: String, game: String, value: i64, ts: u64 }

type State = Arc<Mutex<Store>>;

fn now_secs() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs() }

fn hash_pw(pw: &str) -> String {
    use std::fmt::Write;
    let digest = sha256(pw.as_bytes());
    digest.iter().fold(String::new(), |mut s, b| { let _ = write!(s, "{:02x}", b); s })
}

fn sha256(data: &[u8]) -> [u8; 32] {
    // Minimal SHA-256 — real project would use the `sha2` crate.
    // For demo purposes we use a placeholder — replace with sha2::Sha256 in production.
    let mut h = [0u8; 32];
    for (i, &b) in data.iter().enumerate() { h[i % 32] ^= b.wrapping_add(i as u8); }
    h
}

#[derive(Deserialize)] struct RegisterReq { username: String, password: String }
#[derive(Deserialize)] struct LoginReq    { username: String, password: String }
#[derive(Deserialize)] struct ScoreReq   { game: String, value: i64 }
#[derive(Deserialize)] struct ScoreQuery { game: Option<String>, limit: Option<usize> }

#[derive(Serialize)] struct TokenRes { token: String }
#[derive(Serialize)] struct ErrRes   { error: String }

fn make_token(username: &str) -> String {
    // Minimal demo token — real project uses jsonwebtoken crate (already in Cargo.toml)
    let exp = now_secs() + 3600;
    format!("demo.{}.{}.{}", username, exp, now_secs())
}

fn verify_token(token: &str) -> Option<String> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() < 3 { return None; }
    let exp: u64 = parts[1].parse().ok()?;
    if exp < now_secs() { return None; }
    Some(parts[0].to_string())
}

#[tokio::main]
async fn main() {
    let state: State = Arc::new(Mutex::new(Store::default()));
    let app = Router::new()
        .route("/api/auth/register", post(register))
        .route("/api/auth/login",    post(login))
        .route("/api/scores",        get(get_scores).post(submit_score))
        .route("/api/status",        get(status_handler))
        .route("/health",            get(|| async { Json(serde_json::json!({"status":"ok"})) }))
        .layer(Extension(state));

    let listener = TcpListener::bind("0.0.0.0:5070").await.unwrap();
    println!("Rust API on :5070");
    axum::serve(listener, app).await.unwrap();
}

async fn register(Extension(state): Extension<State>, Json(body): Json<RegisterReq>) -> axum::response::Response {
    use axum::response::IntoResponse;
    if !body.username.chars().all(|c| c.is_alphanumeric() || c=='_' || c=='-') || body.username.len() < 2 || body.username.len() > 32 {
        return (axum::http::StatusCode::BAD_REQUEST, Json(ErrRes{error:"Invalid username.".into()})).into_response();
    }
    let mut s = state.lock().unwrap();
    if s.users.contains_key(&body.username) {
        return (axum::http::StatusCode::CONFLICT, Json(ErrRes{error:"Username taken.".into()})).into_response();
    }
    s.users.insert(body.username.clone(), hash_pw(&body.password));
    (axum::http::StatusCode::CREATED, Json(TokenRes{token:make_token(&body.username)})).into_response()
}

async fn login(Extension(state): Extension<State>, Json(body): Json<LoginReq>) -> axum::response::Response {
    use axum::response::IntoResponse;
    let s = state.lock().unwrap();
    if s.users.get(&body.username).map(|h| h.as_str()) != Some(&hash_pw(&body.password)) {
        return (axum::http::StatusCode::UNAUTHORIZED, Json(ErrRes{error:"Invalid credentials.".into()})).into_response();
    }
    Json(TokenRes{token:make_token(&body.username)}).into_response()
}

async fn get_scores(Extension(state): Extension<State>, Query(q): Query<ScoreQuery>) -> Json<Vec<ScoreRow>> {
    let s = state.lock().unwrap();
    let limit = q.limit.unwrap_or(20).min(100);
    let mut rows: Vec<ScoreRow> = s.scores.iter()
        .filter(|r| q.game.as_deref().map_or(true, |g| r.game == g))
        .cloned().collect();
    rows.sort_by_key(|r| -(r.value));
    rows.truncate(limit);
    Json(rows)
}

async fn submit_score(Extension(state): Extension<State>, Json(body): Json<ScoreReq>) -> axum::response::Response {
    use axum::response::IntoResponse;
    // Token auth would be via a proper middleware in production
    let entry = ScoreRow { username: "anonymous".into(), game: body.game.clone(), value: body.value, ts: now_secs() };
    state.lock().unwrap().scores.push(entry.clone());
    (axum::http::StatusCode::CREATED, Json(entry)).into_response()
}

async fn status_handler() -> Json<serde_json::Value> {
    Json(serde_json::json!([{"id":"rust-api","label":"Rust Axum API","ok":true,"latency":0,"ts":now_secs()*1000,"uptime":1.0}]))
}
