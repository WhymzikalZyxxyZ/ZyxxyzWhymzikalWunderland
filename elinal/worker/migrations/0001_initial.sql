-- ELINAL Phase 2 — initial schema
-- All statements use IF NOT EXISTS so this file is safe to re-run on every deploy.

CREATE TABLE IF NOT EXISTS opinions (
    docket        TEXT    PRIMARY KEY,
    term          TEXT    NOT NULL,
    title         TEXT    NOT NULL,
    decided_date  TEXT,                                    -- ISO-8601 date string
    cl_opinion_id INTEGER,                                 -- CourtListener opinion pk
    cl_cluster_id INTEGER,                                 -- CourtListener cluster pk
    status        TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processing', 'ready', 'error')),
    error_msg     TEXT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Fast listing by term, newest first
CREATE INDEX IF NOT EXISTS idx_opinions_term_date
    ON opinions (term, decided_date DESC);

-- Fast queue scan for unprocessed opinions
CREATE INDEX IF NOT EXISTS idx_opinions_status
    ON opinions (status)
    WHERE status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS reading_materials (
    docket          TEXT PRIMARY KEY
                         REFERENCES opinions (docket) ON DELETE CASCADE,
    prompt_version  TEXT NOT NULL,
    model           TEXT NOT NULL,
    generated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    sections        TEXT NOT NULL,      -- JSON: Section[]
    glossary        TEXT NOT NULL,      -- JSON: GlossaryEntry[]
    discussion      TEXT NOT NULL,      -- JSON: string[]
    further_reading TEXT NOT NULL       -- JSON: FurtherReadingEntry[]
);
