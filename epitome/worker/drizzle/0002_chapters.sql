-- v4.5.0: add chapters table (replaces date-based pages) + main cover selection

ALTER TABLE projects ADD COLUMN main_cover_key TEXT;

CREATE TABLE IF NOT EXISTS chapters (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id        TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    chapter_number INTEGER NOT NULL,
    title          TEXT,
    content        TEXT NOT NULL DEFAULT '',
    word_count     INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(project_id, chapter_number)
);

CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_chapters_user    ON chapters(user_id, updated_at DESC);
