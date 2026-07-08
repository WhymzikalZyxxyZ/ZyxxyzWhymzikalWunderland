-- Epitome — full schema with user authentication
-- Re-run after clearing local D1 state: npx wrangler d1 execute epitome --local --file=drizzle/0001_initial.sql

CREATE TABLE IF NOT EXISTS users (
    user_id       TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS genres (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    parent_id  TEXT REFERENCES genres(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS series (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    series_id         TEXT REFERENCES series(id) ON DELETE SET NULL,
    series_number     INTEGER,
    title             TEXT NOT NULL,
    type              TEXT NOT NULL,
    genre_id          TEXT REFERENCES genres(id) ON DELETE SET NULL,
    status            TEXT NOT NULL DEFAULT 'drafting',
    blurb             TEXT,
    summary           TEXT,
    target_word_count INTEGER DEFAULT 50000,
    total_words       INTEGER NOT NULL DEFAULT 0,
    cover_key         TEXT,
    alt_cover_keys    TEXT NOT NULL DEFAULT '[]',
    pub_type          TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pages (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    page_date  TEXT NOT NULL,
    title      TEXT,
    content    TEXT NOT NULL DEFAULT '',
    word_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (project_id, page_date)
);

CREATE TABLE IF NOT EXISTS characters (
    id                   TEXT PRIMARY KEY,
    project_id           TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id              TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name                 TEXT NOT NULL,
    age                  TEXT,
    physical_description TEXT,
    notes                TEXT,
    sort_order           INTEGER NOT NULL DEFAULT 0,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS character_images (
    id           TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    storage_key  TEXT NOT NULL,
    caption      TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commissions (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    who          TEXT NOT NULL,
    amount_cents INTEGER,
    description  TEXT NOT NULL,
    deadline     TEXT,
    done         INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comp_titles (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    author     TEXT NOT NULL,
    year       INTEGER,
    reason     TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS publishing (
    id                   TEXT PRIMARY KEY,
    project_id           TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    user_id              TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    pub_type             TEXT NOT NULL,
    date_published       TEXT,
    isbn                 TEXT,
    publisher_name       TEXT,
    deal_details         TEXT,
    contract_storage_key TEXT,
    created_at           TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS publishing_sizes (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    size_label TEXT NOT NULL,
    format     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS distribution (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    channel    TEXT NOT NULL,
    label      TEXT NOT NULL,
    url        TEXT,
    inventory  INTEGER NOT NULL DEFAULT 0,
    on_order   INTEGER NOT NULL DEFAULT 0,
    notes      TEXT
);

CREATE TABLE IF NOT EXISTS project_art (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    storage_key TEXT NOT NULL,
    label       TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    date       TEXT,
    location   TEXT,
    notes      TEXT
);

CREATE TABLE IF NOT EXISTS manufacturers (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL,
    contact_info TEXT,
    notes        TEXT
);

CREATE TABLE IF NOT EXISTS social_links (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    platform   TEXT NOT NULL,
    url        TEXT NOT NULL,
    handle     TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_projects_user    ON projects(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_pages_project    ON pages(project_id, page_date);
CREATE INDEX IF NOT EXISTS idx_characters_proj  ON characters(project_id, sort_order);
