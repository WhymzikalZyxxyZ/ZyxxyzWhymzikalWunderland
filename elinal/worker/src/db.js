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

    const stmt = params.length
        ? db.prepare(sql).bind(...params)
        : db.prepare(sql);
    const { results } = await stmt.all();
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

export async function listPending(db, limit = 5) {
    const { results } = await db.prepare(
        `SELECT docket, term, title, cl_opinion_id FROM opinions
         WHERE status = 'pending' ORDER BY decided_date DESC LIMIT ?`,
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

export async function setOpinionStatus(db, docket, status, error_msg = null) {
    await db.prepare(
        `UPDATE opinions SET status = ?, error_msg = ?, updated_at = datetime('now')
         WHERE docket = ?`,
    ).bind(status, error_msg, docket).run();
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
