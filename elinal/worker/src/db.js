'use strict';

// ── D1 query helpers ─────────────────────────────────────────────────────────
// All functions accept a D1Database binding as first arg so they can be called
// from any handler with env.ELINAL_DB without reaching into env themselves.
// All functions are intentionally thin — no caching, no retries — callers own that.

export async function listOpinions(db, { term, limit = 20, offset = 0 } = {}) {
    let sql = `SELECT docket, term, title, decided_date, status
               FROM opinions WHERE status = 'ready'`;
    const params = [];
    if (term) {
        sql += ` AND term = ?`;
        params.push(term);
    }
    sql += ` ORDER BY decided_date DESC NULLS LAST, docket ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await db.prepare(sql).bind(...params).all();
    return results;
}

export async function countOpinions(db, { term } = {}) {
    let sql = `SELECT COUNT(*) AS total FROM opinions WHERE status = 'ready'`;
    const params = [];
    if (term) {
        sql += ` AND term = ?`;
        params.push(term);
    }
    const stmt = params.length ? db.prepare(sql).bind(...params) : db.prepare(sql);
    const row = await stmt.first();
    return row?.total ?? 0;
}

export async function getOpinion(db, docket) {
    return db.prepare(
        `SELECT docket, term, title, decided_date, status, error_msg, created_at, updated_at
         FROM opinions WHERE docket = ?`,
    ).bind(docket).first();
}

export async function getReadingMaterials(db, docket) {
    return db.prepare(
        `SELECT docket, prompt_version, model, generated_at,
                sections, glossary, discussion, further_reading
         FROM reading_materials WHERE docket = ?`,
    ).bind(docket).first();
}

// Processes at most 4 opinions per cron run to stay within the CourtListener
// 5 req/min rate limit (1 slot used by the discovery search call leaves 4 for text fetches).
// A fresh deploy with a large backlog will take multiple cron cycles to clear.
// Trigger POST /api/admin/ingest manually to drain the queue faster.
export async function listPending(db, limit = 4) {
    const { results } = await db.prepare(
        // Also recovers opinions stuck in 'processing' for > 1 hour (crash mid-pipeline).
        `SELECT docket, term, title, cl_opinion_id FROM opinions
         WHERE status = 'pending'
            OR (status = 'processing' AND updated_at < datetime('now', '-1 hour'))
         ORDER BY decided_date DESC NULLS LAST LIMIT ?`,
    ).bind(limit).all();
    return results;
}

// Returns true if a new row was inserted, false if the docket already existed.
export async function upsertOpinion(db, opinion) {
    const result = await db.prepare(`
        INSERT INTO opinions (docket, term, title, decided_date, cl_opinion_id, cl_cluster_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
        ON CONFLICT(docket) DO NOTHING
    `).bind(
        opinion.docket, opinion.term, opinion.title,
        opinion.decided_date ?? null,
        opinion.cl_opinion_id ?? null,
        opinion.cl_cluster_id ?? null,
    ).run();
    return result.meta.changes === 1;
}

// Resets all errored opinions back to pending so the next ingest can retry them.
export async function resetErrors(db) {
    const result = await db.prepare(
        `UPDATE opinions SET status = 'pending', error_msg = NULL, updated_at = datetime('now')
         WHERE status = 'error'`,
    ).run();
    return result.meta.changes;
}

export async function setOpinionStatus(db, docket, status, error_msg = null) {
    await db.prepare(
        `UPDATE opinions SET status = ?, error_msg = ?, updated_at = datetime('now')
         WHERE docket = ?`,
    ).bind(status, error_msg, docket).run();
}

// Escapes SQLite LIKE wildcard characters so a literal search for "%" or "_"
// doesn't accidentally match everything. Uses backslash as the escape character.
function likeEscape(s) {
    return s.replace(/[\\%_]/g, '\\$&');
}

// Full-text search across opinion titles/dockets and glossary term definitions.
// Uses SQLite LIKE (case-insensitive) and json_each for glossary.
export async function searchOpinions(db, query, limit = 15) {
    const like = `%${likeEscape(query)}%`;
    const { results } = await db.prepare(`
        SELECT docket, term, title, decided_date, status
        FROM opinions
        WHERE status = 'ready'
          AND (title LIKE ? ESCAPE '\\' OR docket LIKE ? ESCAPE '\\')
        ORDER BY decided_date DESC NULLS LAST
        LIMIT ?
    `).bind(like, like, limit).all();
    return results;
}

export async function searchGlossary(db, query, limit = 10) {
    const like = `%${likeEscape(query)}%`;
    const { results } = await db.prepare(`
        SELECT o.docket,
               o.title,
               json_extract(j.value, '$.term')       AS term,
               json_extract(j.value, '$.definition') AS definition
        FROM reading_materials rm
        JOIN opinions o ON o.docket = rm.docket
        CROSS JOIN json_each(rm.glossary) j
        WHERE o.status = 'ready'
          AND (
            json_extract(j.value, '$.term')       LIKE ? ESCAPE '\'
            OR json_extract(j.value, '$.definition') LIKE ? ESCAPE '\'
          )
        ORDER BY o.decided_date DESC NULLS LAST
        LIMIT ?
    `).bind(like, like, limit).all();
    return results;
}

export async function saveReadingMaterials(db, docket, rm, model, promptVersion) {
    await db.prepare(`
        INSERT INTO reading_materials
            (docket, prompt_version, model, sections, glossary, discussion, further_reading)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(docket) DO UPDATE SET
            prompt_version  = excluded.prompt_version,
            model           = excluded.model,
            generated_at    = datetime('now'),
            sections        = excluded.sections,
            glossary        = excluded.glossary,
            discussion      = excluded.discussion,
            further_reading = excluded.further_reading
    `).bind(
        docket,
        promptVersion,
        model,
        JSON.stringify(rm.sections),
        JSON.stringify(rm.glossary),
        JSON.stringify(rm.discussion_questions),
        JSON.stringify(rm.further_reading),
    ).run();
}
