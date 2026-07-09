-- v4.7.0: global events with P&L tracking, per-chapter targets, inventory, sales

-- Phase 2: per-chapter word count target
ALTER TABLE chapters ADD COLUMN target_word_count INTEGER NOT NULL DEFAULT 0;

-- Phase 3: extend events table — recreate to make project_id nullable and add P&L fields
-- (SQLite does not support ALTER COLUMN, so we use the rename+recreate pattern)
CREATE TABLE events_v2 (
    id                    TEXT PRIMARY KEY,
    user_id               TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    project_id            TEXT REFERENCES projects(id) ON DELETE SET NULL,
    name                  TEXT NOT NULL,
    date                  TEXT,
    end_date              TEXT,
    start_time            TEXT,
    end_time              TEXT,
    location              TEXT,
    address               TEXT,
    attendance_expected   INTEGER,
    attendance_actual     INTEGER,
    notes                 TEXT,
    cost_table_cents      INTEGER NOT NULL DEFAULT 0,
    cost_hotel_cents      INTEGER NOT NULL DEFAULT 0,
    cost_gas_cents        INTEGER NOT NULL DEFAULT 0,
    cost_other_cents      INTEGER NOT NULL DEFAULT 0,
    cost_other_description TEXT
);
INSERT INTO events_v2 (id, user_id, project_id, name, date, location, notes)
    SELECT id, user_id, project_id, name, date, location, notes FROM events;
DROP TABLE events;
ALTER TABLE events_v2 RENAME TO events;

CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, date DESC);

-- event sales items: which books were sold at each event
CREATE TABLE IF NOT EXISTS event_sales (
    id               TEXT PRIMARY KEY,
    event_id         TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id          TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    quantity_brought INTEGER NOT NULL DEFAULT 0,
    quantity_sold    INTEGER NOT NULL DEFAULT 0,
    price_cents      INTEGER NOT NULL DEFAULT 0,
    notes            TEXT
);

-- Phase 4: inventory listings per project
CREATE TABLE IF NOT EXISTS inventory (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id        TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    channel        TEXT NOT NULL,
    platform       TEXT,
    label          TEXT NOT NULL,
    cost_cents     INTEGER NOT NULL DEFAULT 0,
    price_cents    INTEGER NOT NULL DEFAULT 0,
    stock_count    INTEGER NOT NULL DEFAULT 0,
    stock_on_order INTEGER NOT NULL DEFAULT 0,
    available      INTEGER NOT NULL DEFAULT 1,
    available_url  TEXT,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inventory_project ON inventory(project_id);

-- Phase 4: sales records
CREATE TABLE IF NOT EXISTS sales_records (
    id            TEXT PRIMARY KEY,
    project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id       TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    inventory_id  TEXT REFERENCES inventory(id) ON DELETE SET NULL,
    channel       TEXT NOT NULL,
    platform      TEXT,
    quantity      INTEGER NOT NULL DEFAULT 1,
    revenue_cents INTEGER NOT NULL DEFAULT 0,
    royalty_cents INTEGER,
    pages_read    INTEGER,
    sale_date     TEXT,
    notes         TEXT,
    source        TEXT NOT NULL DEFAULT 'manual',
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sales_project ON sales_records(project_id, sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_user    ON sales_records(user_id, sale_date DESC);

-- Phase 7 prep: bundles
CREATE TABLE IF NOT EXISTS bundles (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    description TEXT,
    price_cents INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bundle_items (
    id         TEXT PRIMARY KEY,
    bundle_id  TEXT NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    quantity   INTEGER NOT NULL DEFAULT 1
);
