'use strict';

export class StatusDO {
    constructor(state) {
        this.state = state;
        this.sql   = state.storage.sql;
        this.state.blockConcurrencyWhile(() => this.#init());
    }

    #init() {
        this.sql.exec(`
            CREATE TABLE IF NOT EXISTS checks (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                service_id TEXT    NOT NULL,
                ok         INTEGER NOT NULL,
                latency_ms INTEGER NOT NULL,
                ts         INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS checks_svc_ts ON checks(service_id, ts);
        `);
    }

    #purge(retentionDays) {
        const cutoff = Date.now() - retentionDays * 86400_000;
        this.sql.exec(`DELETE FROM checks WHERE ts < ?`, cutoff);
    }

    async fetch(request) {
        const url  = new URL(request.url);
        const path = url.pathname;

        if (path === '/record' && request.method === 'POST') {
            const rows = await request.json();
            const retentionDays = parseInt(url.searchParams.get('retention') || '90', 10);
            const stmt = this.sql.prepare(
                `INSERT INTO checks (service_id, ok, latency_ms, ts) VALUES (?, ?, ?, ?)`
            );
            for (const row of rows) {
                stmt.run(row.id, row.ok ? 1 : 0, row.latency_ms, row.ts);
            }
            this.#purge(retentionDays);
            return new Response('ok');
        }

        if (path === '/current') {
            const services = JSON.parse(url.searchParams.get('services') || '[]');
            const result = [];
            for (const svc of services) {
                const rows = [...this.sql.exec(
                    `SELECT ok, latency_ms, ts FROM checks WHERE service_id = ? ORDER BY ts DESC LIMIT 1`,
                    svc.id
                )];
                const latest = rows[0] ?? null;

                const total = [...this.sql.exec(
                    `SELECT COUNT(*) AS n FROM checks WHERE service_id = ?`, svc.id
                )][0]?.n ?? 0;
                const up = [...this.sql.exec(
                    `SELECT COUNT(*) AS n FROM checks WHERE service_id = ? AND ok = 1`, svc.id
                )][0]?.n ?? 0;

                result.push({
                    id:       svc.id,
                    label:    svc.label,
                    ok:       latest ? latest.ok === 1 : null,
                    latency:  latest?.latency_ms ?? null,
                    ts:       latest?.ts ?? null,
                    uptime:   total > 0 ? Math.round((up / total) * 1000) / 10 : null,
                });
            }
            return Response.json(result);
        }

        if (path === '/sparkline') {
            const svcId = url.searchParams.get('svc');
            const n     = Math.min(parseInt(url.searchParams.get('n') || '90', 10), 360);
            const rows  = [...this.sql.exec(
                `SELECT ok, ts FROM checks WHERE service_id = ? ORDER BY ts DESC LIMIT ?`,
                svcId, n
            )].reverse();
            return Response.json(rows.map(r => ({ ok: r.ok === 1, ts: r.ts })));
        }

        return new Response('not found', { status: 404 });
    }
}
