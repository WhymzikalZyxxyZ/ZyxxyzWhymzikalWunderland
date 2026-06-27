'use strict';

import { fetchRecentOpinions, fetchOpinionText } from './courtlistener.js';
import { generateReadingMaterials }               from './pipeline.js';
import {
    upsertOpinion, listPending, setOpinionStatus, saveReadingMaterials,
} from './db.js';
import { log } from './logger.js';

// Discovers and processes new SCOTUS opinions in two passes:
//   1. Fetch recent opinion stubs from CourtListener → upsert into D1
//   2. Process all pending opinions: fetch text → generate AI reading materials → cache in KV
export async function runScraper(env) {
    log('info', 'scraper_start');

    // Pass 1 — discover
    let opinions = [];
    try {
        opinions = await fetchRecentOpinions({ limit: 20, apiToken: env.CL_API_TOKEN });
    } catch (e) {
        log('error', 'scraper_discover_failed', { message: String(e) });
        return { fetched: 0, inserted: 0, processed: 0, errors: 0 };
    }

    let inserted = 0;
    for (const op of opinions) {
        try {
            const isNew = await upsertOpinion(env.ELINAL_DB, op);
            if (isNew) inserted++;
        } catch (e) {
            log('error', 'scraper_upsert_failed', { docket: op.docket, message: String(e) });
        }
    }

    // Pass 2 — process pending
    const pending = await listPending(env.ELINAL_DB).catch(() => []);
    let processed = 0;
    let errors    = 0;

    for (const op of pending) {
        try {
            await processOpinion(env, op);
            processed++;
        } catch (e) {
            errors++;
            log('error', 'scraper_process_failed', { docket: op.docket, message: String(e) });
        }
    }

    log('info', 'scraper_done', { fetched: opinions.length, inserted, processed, errors });
    return { fetched: opinions.length, inserted, processed, errors };
}

// Fetches opinion text, generates reading materials, stores in D1 + KV cache
async function processOpinion(env, op) {
    await setOpinionStatus(env.ELINAL_DB, op.docket, 'processing');
    log('info', 'scraper_processing', { docket: op.docket, cl_opinion_id: op.cl_opinion_id });

    let text;
    try {
        text = await fetchOpinionText(op.cl_opinion_id, { apiToken: env.CL_API_TOKEN });
    } catch (e) {
        await setOpinionStatus(env.ELINAL_DB, op.docket, 'error', `text_fetch: ${e.message}`);
        throw e;
    }

    let rm;
    try {
        rm = await generateReadingMaterials(env, { title: op.title, docket: op.docket, text });
    } catch (e) {
        await setOpinionStatus(env.ELINAL_DB, op.docket, 'error', `generate: ${e.message}`);
        throw e;
    }

    await saveReadingMaterials(env.ELINAL_DB, op.docket, rm, env.ELINAL_MODEL, env.PROMPT_VERSION);
    await setOpinionStatus(env.ELINAL_DB, op.docket, 'ready');

    // Cache in KV — reading materials are immutable once generated
    if (env.ELINAL_CACHE) {
        await env.ELINAL_CACHE.put(`rm:${op.docket}`, JSON.stringify({
            docket: op.docket, title: op.title, decided_date: op.decided_date ?? null, ...rm,
        }));
    }

    log('info', 'scraper_ready', { docket: op.docket });
}
