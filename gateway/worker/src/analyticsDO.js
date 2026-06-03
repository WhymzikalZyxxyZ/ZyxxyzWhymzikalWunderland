'use strict';

export class AnalyticsDO {
    constructor(state) {
        this.state = state;
        this.sql   = state.storage.sql;
        this.state.blockConcurrencyWhile(() => this.#init());
    }

    #init() {
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS requests (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                method     TEXT    NOT NULL,
                path       TEXT    NOT NULL,
                status     INTEGER NOT NULL,
                latency_ms INTEGER NOT NULL,
                key_id     TEXT    NOT NULL DEFAULT '',
                ts         INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS req_ts     ON requests(ts);
            CREATE INDEX IF NOT EXISTS req_path   ON requests(path, ts);
            CREATE INDEX IF NOT EXISTS req_status ON requests(status, ts);
        `);
    }

    #purge(retentionDays) {
        const cutoff = Date.now() - retentionDays * 86400_000;
        this.sql.exec(`DELETE FROM requests WHERE ts < ?`, cutoff);
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    async #checkRate(identity, limit) {
        const slot = Math.floor(Date.now() / 60000);
        const key  = `rl:${identity}:${slot}`;
        const prev = (await this.state.storage.get(key)) ?? 0;
        if (prev >= limit) return { allowed: false, count: prev, limit };
        await this.state.storage.put(key, prev + 1);
        // Clean prior slot to keep storage bounded
        this.state.storage.delete(`rl:${identity}:${slot - 1}`);
        return { allowed: true, count: prev + 1, limit };
    }

    async fetch(request) {
        const url  = new URL(request.url);
        const path = url.pathname;

        if (path === '/rate-check' && request.method === 'POST') {
            const { identity, limit } = await request.json();
            const result = await this.#checkRate(identity, limit);
            return Response.json(result);
        }

        if (path === '/record' && request.method === 'POST') {
            const row = await request.json();
            const retention = parseInt(url.searchParams.get('retention') || '7', 10);
            this.sql.exec(
                `INSERT INTO requests (method, path, status, latency_ms, key_id, ts)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                row.method, row.path, row.status, row.latency_ms, row.key_id ?? '', row.ts
            );
            this.#purge(retention);
            return new Response('ok');
        }

        if (path === '/summary') {
            const since = Date.now() - 86400_000; // last 24h
            const total = [...this.sql.exec(
                `SELECT COUNT(*) AS n FROM requests WHERE ts > ?`, since
            )][0]?.n ?? 0;
            const errors = [...this.sql.exec(
                `SELECT COUNT(*) AS n FROM requests WHERE ts > ? AND status >= 400`, since
            )][0]?.n ?? 0;
            const latency = [...this.sql.exec(
                `SELECT AVG(latency_ms) AS avg, MAX(latency_ms) AS peak FROM requests WHERE ts > ?`, since
            )][0] ?? { avg: 0, peak: 0 };
            const topPaths = [...this.sql.exec(
                `SELECT path, COUNT(*) AS hits FROM requests WHERE ts > ?
                 GROUP BY path ORDER BY hits DESC LIMIT 8`, since
            )];
            const keyCount = [...this.sql.exec(
                `SELECT COUNT(DISTINCT key_id) AS n FROM requests WHERE ts > ? AND key_id != ''`, since
            )][0]?.n ?? 0;
            return Response.json({
                total, errors,
                error_rate: total > 0 ? Math.round(errors / total * 1000) / 10 : 0,
                avg_latency: Math.round(latency.avg ?? 0),
                peak_latency: latency.peak ?? 0,
                key_count: keyCount,
                top_paths: topPaths,
            });
        }

        if (path === '/timeseries') {
            const hours = Math.min(parseInt(url.searchParams.get('hours') || '24', 10), 168);
            const since = Date.now() - hours * 3600_000;
            const rows  = [...this.sql.exec(
                `SELECT (ts / 3600000) AS bucket,
                        COUNT(*) AS total,
                        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS errors
                 FROM requests WHERE ts > ?
                 GROUP BY bucket ORDER BY bucket ASC`, since
            )];
            return Response.json(rows);
        }

        if (path === '/recent') {
            const n    = Math.min(parseInt(url.searchParams.get('n') || '20', 10), 100);
            const rows = [...this.sql.exec(
                `SELECT method, path, status, latency_ms, key_id, ts
                 FROM requests ORDER BY ts DESC LIMIT ?`, n
            )];
            return Response.json(rows);
        }

        return new Response('not found', { status: 404 });
    }
}
