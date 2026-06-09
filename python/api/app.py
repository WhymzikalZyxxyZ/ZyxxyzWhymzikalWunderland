"""Flask REST API — mirrors dotnet/api. In-memory store, JWT auth."""
from __future__ import annotations
import base64
import hashlib
import hmac
import json
import os
import re
import time
from functools import wraps
from flask import Flask, request, jsonify, abort

app = Flask(__name__)
SECRET = os.environ.get("JWT_SECRET", "zyxxyz-dev-secret-change-in-prod")

# ── In-memory store ──────────────────────────────────────────────────────────
_users:  dict[str, str]         = {}   # username → password_hash
_scores: list[dict]             = []   # {username, game, value, ts}

# ── Minimal JWT (HS256, no external deps) ────────────────────────────────────

def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _make_token(username: str) -> str:
    header  = _b64url(json.dumps({"alg":"HS256","typ":"JWT"}).encode())
    payload = _b64url(json.dumps({"sub": username, "iat": int(time.time()),
                                   "exp": int(time.time()) + 3600}).encode())
    sig = _b64url(hmac.new(SECRET.encode(), f"{header}.{payload}".encode(),
                            hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"

def _verify_token(token: str) -> str | None:
    try:
        header, payload, sig = token.split(".")
        expected = _b64url(hmac.new(SECRET.encode(),
                                     f"{header}.{payload}".encode(),
                                     hashlib.sha256).digest())
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload + "=="))
        if data["exp"] < time.time():
            return None
        return data["sub"]
    except Exception:
        return None

def _hash_pw(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def require_auth(f):
    @wraps(f)
    def wrapper(*a, **kw):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            abort(401)
        user = _verify_token(auth[7:])
        if not user:
            abort(401)
        request.username = user
        return f(*a, **kw)
    return wrapper

# ── Validation ───────────────────────────────────────────────────────────────
_NAME_RE = re.compile(r"^[A-Za-z0-9_-]{2,32}$")

def _validate_register(body):
    u, p = body.get("username",""), body.get("password","")
    if not _NAME_RE.match(u):
        return "Username must be 2-32 alphanumeric/_/- chars."
    if len(p) < 8 or len(p) > 128:
        return "Password must be 8-128 characters."
    return None

# ── Auth endpoints ───────────────────────────────────────────────────────────

@app.post("/api/auth/register")
def register():
    body = request.get_json(silent=True) or {}
    err = _validate_register(body)
    if err:
        return jsonify({"error": err}), 400
    u = body["username"]
    if u in _users:
        return jsonify({"error": "Username taken."}), 409
    _users[u] = _hash_pw(body["password"])
    return jsonify({"token": _make_token(u)}), 201

@app.post("/api/auth/login")
def login():
    body = request.get_json(silent=True) or {}
    u, p = body.get("username",""), body.get("password","")
    if _users.get(u) != _hash_pw(p):
        return jsonify({"error": "Invalid credentials."}), 401
    return jsonify({"token": _make_token(u)})

# ── Scores endpoints ─────────────────────────────────────────────────────────

@app.get("/api/scores")
def get_scores():
    game  = request.args.get("game")
    limit = min(int(request.args.get("limit", 20)), 100)
    rows  = [s for s in _scores if not game or s["game"] == game]
    rows  = sorted(rows, key=lambda s: s["value"], reverse=True)[:limit]
    return jsonify(rows)

@app.post("/api/scores")
@require_auth
def submit_score():
    body = request.get_json(silent=True) or {}
    game  = str(body.get("game",""))[:64]
    value = body.get("value")
    if not game or not isinstance(value, int) or value < 0:
        return jsonify({"error": "game (string) and value (int ≥ 0) required."}), 400
    entry = {"username": request.username, "game": game,
             "value": value, "ts": int(time.time())}
    _scores.append(entry)
    return jsonify(entry), 201

# ── Status endpoint ──────────────────────────────────────────────────────────

_start = time.time()

@app.get("/api/status")
def status():
    up = time.time() - _start
    return jsonify([{
        "id":      "python-api",
        "label":   "Python Flask API",
        "ok":      True,
        "latency": 0,
        "ts":      int(time.time() * 1000),
        "uptime":  min(up / 86400, 1.0),
    }])

@app.get("/health")
def health():
    return jsonify({"status": "ok"})

# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=False)
