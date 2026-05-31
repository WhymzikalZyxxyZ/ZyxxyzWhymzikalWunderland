const EXAMPLES = [
        { label:'Simple SELECT', sql:'SELECT id, name, email\nFROM users\nWHERE status = \'active\'\nORDER BY created_at DESC\nLIMIT 50' },
        { label:'JOIN + GROUP BY', sql:'SELECT u.name, COUNT(o.id) AS orders\nFROM users u\nJOIN orders o ON u.id = o.user_id\nWHERE o.created_at > \'2024-01-01\'\nGROUP BY u.id, u.name\nORDER BY orders DESC' },
        { label:'Subquery', sql:'SELECT p.name, p.price\nFROM products p\nWHERE p.category_id IN (\n  SELECT id FROM categories WHERE active = 1\n)\nAND p.stock > 0\nORDER BY p.price' },
        { label:'Multi-JOIN aggregation', sql:'SELECT u.name, u.email, COUNT(o.id) AS order_count, SUM(o.total) AS revenue\nFROM users u\nJOIN orders o ON u.id = o.user_id\nJOIN order_items oi ON o.id = oi.order_id\nWHERE u.created_at > \'2024-01-01\'\n  AND o.status = \'completed\'\nGROUP BY u.id, u.name, u.email\nHAVING COUNT(o.id) > 5\nORDER BY revenue DESC\nLIMIT 20' },
        { label:'Window function', sql:'SELECT name, department, salary,\n  RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,\n  AVG(salary) OVER (PARTITION BY department) AS dept_avg\nFROM employees\nWHERE active = true' },
    ];

    function buildExamples() {
        const row = document.getElementById('examples-row');
        EXAMPLES.forEach(e => {
            const btn = document.createElement('button');
            btn.className = 'ex-btn';
            btn.textContent = e.label;
            btn.onclick = () => { document.getElementById('sql-input').value = e.sql; analyseQuery(); };
            row.appendChild(btn);
        });
    }

    // ── SQL Parser (simplified) ───────────────────────────────────────────────────
    function parseSQL(sql) {
        const upper  = sql.toUpperCase().replace(/\s+/g,' ').trim();
        const tokens = upper.split(' ');

        const result = {
            type: 'SELECT',
            tables: [], joins: [], conditions: [],
            groupBy: false, having: false, orderBy: false,
            limit: null, subquery: false, aggregate: false,
            window: false, distinct: false,
            columns: [],
        };

        // Detect clauses
        result.groupBy  = /\bGROUP\s+BY\b/.test(upper);
        result.having   = /\bHAVING\b/.test(upper);
        result.orderBy  = /\bORDER\s+BY\b/.test(upper);
        result.subquery = /\bIN\s*\(SELECT|\bEXISTS\s*\(SELECT/i.test(sql);
        result.window   = /\bOVER\s*\(/i.test(sql);
        result.distinct = /\bSELECT\s+DISTINCT\b/i.test(sql);

        const limitM = sql.match(/\bLIMIT\s+(\d+)/i);
        if (limitM) result.limit = parseInt(limitM[1]);

        // Detect aggregates
        result.aggregate = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(sql);

        // Extract table names (FROM and JOIN)
        const fromM = sql.match(/\bFROM\s+([\w]+)(?:\s+(?:AS\s+)?(\w+))?/i);
        if (fromM) result.tables.push({ name: fromM[1], alias: fromM[2] || fromM[1] });

        const joinRegex = /\b(INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|CROSS\s+JOIN|JOIN)\s+([\w]+)(?:\s+(?:AS\s+)?(\w+))?\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi;
        let jm;
        while ((jm = joinRegex.exec(sql)) !== null) {
            result.joins.push({ type: jm[1].replace(/\s+/g,' '), table: jm[2], alias: jm[3] || jm[2], on: `${jm[4]} = ${jm[5]}` });
        }

        // WHERE conditions
        const whereM = sql.match(/\bWHERE\b([\s\S]+?)(?:\bGROUP\b|\bHAVING\b|\bORDER\b|\bLIMIT\b|$)/i);
        if (whereM) {
            result.conditions = whereM[1].trim().split(/\bAND\b|\bOR\b/i).map(c => c.trim()).filter(Boolean);
        }

        return result;
    }

    function buildPlan(parsed) {
        const nodes = [];

        // Build plan bottom-up
        if (parsed.limit) nodes.unshift({ op:'LIMIT', detail:`LIMIT ${parsed.limit}`, cost:1, rows:'↓' });
        if (parsed.orderBy) nodes.unshift({ op:'SORT', detail:'ORDER BY (filesort)', cost:35, rows:'~' });
        if (parsed.having) nodes.unshift({ op:'FILTER', detail:'HAVING predicate', cost:5, rows:'↓' });
        if (parsed.aggregate || parsed.groupBy) nodes.unshift({ op: parsed.window ? 'WINDOW' : 'AGGREGATE', detail: parsed.groupBy ? 'GROUP BY + aggregate' : 'Aggregate functions', cost:20, rows:'↓' });

        if (parsed.joins.length > 0) {
            nodes.unshift({ op:'HASH JOIN', detail:`${parsed.joins.length} join(s) — nested loop if small`, cost: parsed.joins.length * 25, rows:'×' });
        }

        if (parsed.conditions.length > 0) {
            const hasIndex = parsed.conditions.some(c => /\bid\b|\buser_id\b|\bemail\b|\bstatus\b/i.test(c));
            nodes.unshift({ op: hasIndex ? 'INDEX SCAN' : 'SEQ SCAN', detail: parsed.conditions.map(c => c.substring(0,40)).join(', '), cost: hasIndex ? 8 : 45, rows: hasIndex ? '↓↓' : '~' });
        } else {
            nodes.unshift({ op:'SEQ SCAN', detail: parsed.tables.map(t=>t.name).join(', '), cost:40, rows:'all' });
        }

        if (parsed.subquery) nodes.unshift({ op:'SUBQUERY SCAN', detail:'Materialise subquery result', cost:30, rows:'~' });

        return nodes;
    }

    function drawPlan(nodes) {
        const canvas  = document.getElementById('plan-canvas');
        const wrap    = document.getElementById('plan-wrap');
        const W       = wrap.offsetWidth - 40 || 400;
        const nodeH   = 52, nodeW = Math.min(W - 40, 340), gap = 28;
        const totalH  = nodes.length * (nodeH + gap) + 20;

        canvas.width  = (W)       * devicePixelRatio;
        canvas.height = totalH    * devicePixelRatio;
        canvas.style.width  = W + 'px';
        canvas.style.height = totalH + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(devicePixelRatio, devicePixelRatio);
        ctx.clearRect(0, 0, W, totalH);

        const cx = W / 2;

        nodes.forEach((node, i) => {
            const y    = 10 + i * (nodeH + gap);
            const x    = cx - nodeW / 2;
            const cost = node.cost;
            const hue  = cost < 15 ? '#4caf50' : cost < 30 ? '#f4a261' : '#ef5350';

            // Connector line
            if (i > 0) {
                ctx.strokeStyle = 'rgba(180,100,220,0.2)';
                ctx.lineWidth   = 2;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(cx, y - gap);
                ctx.lineTo(cx, y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Arrow
                ctx.fillStyle = 'rgba(180,100,220,0.4)';
                ctx.beginPath();
                ctx.moveTo(cx, y - 2);
                ctx.lineTo(cx - 6, y - 10);
                ctx.lineTo(cx + 6, y - 10);
                ctx.closePath();
                ctx.fill();
            }

            // Node background
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            roundRect(ctx, x, y, nodeW, nodeH, 8);
            ctx.fill();
            ctx.strokeStyle = `${hue}44`;
            ctx.lineWidth   = 1.5;
            roundRect(ctx, x, y, nodeW, nodeH, 8);
            ctx.stroke();

            // Cost bar
            const barW = (cost / 50) * (nodeW - 16);
            ctx.fillStyle = `${hue}22`;
            ctx.fillRect(x + 8, y + nodeH - 10, nodeW - 16, 6);
            ctx.fillStyle = hue + '88';
            ctx.fillRect(x + 8, y + nodeH - 10, barW, 6);

            // Text
            ctx.fillStyle = hue;
            ctx.font       = 'bold 12px Courier New';
            ctx.fillText(node.op, x + 12, y + 19);

            ctx.fillStyle  = '#777';
            ctx.font       = '10px Courier New';
            const detail   = node.detail.length > 48 ? node.detail.substring(0, 48) + '…' : node.detail;
            ctx.fillText(detail, x + 12, y + 33);

            ctx.fillStyle  = '#444';
            ctx.font       = '10px Courier New';
            ctx.fillText(`cost: ${cost}   rows: ${node.rows}`, x + 12, y + 46);
        });
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    function buildAnalysis(parsed, nodes) {
        const wrap = document.getElementById('analysis-wrap');
        wrap.innerHTML = '';

        const totalCost = nodes.reduce((a, n) => a + n.cost, 0);
        addCard(wrap, 'Estimated Total Cost', `<div class="cost-bar-wrap">
            <div class="cost-bar-label"><span>0</span><span>${totalCost}</span><span>100 (max)</span></div>
            <div class="cost-bar-bg"><div class="cost-bar-fill" style="width:${Math.min(100,totalCost)}%"></div></div>
        </div>
        <div style="margin-top:8px;color:${totalCost<30?'#4caf50':totalCost<60?'#f4a261':'#ef5350'};font-family:\'Courier New\',monospace;font-size:13px;font-weight:bold;">${totalCost < 30 ? 'Low cost query' : totalCost < 60 ? 'Moderate cost — review joins' : 'High cost — optimisation needed'}</div>`);

        // Warnings
        const warnings = [];
        const ok = [];
        const hasSeqScan = nodes.some(n => n.op === 'SEQ SCAN');
        if (hasSeqScan) warnings.push('Full table scan detected — add indexes on WHERE/JOIN columns');
        if (nodes.some(n => n.op === 'SORT')) warnings.push('Filesort required — index on ORDER BY column may eliminate this');
        if (parsed.joins.length > 2) warnings.push(`${parsed.joins.length} joins detected — verify join order and index coverage`);
        if (parsed.subquery) warnings.push('Subquery may be evaluated repeatedly — consider JOIN or CTE');
        if (parsed.having && !parsed.groupBy) warnings.push('HAVING without GROUP BY — consider WHERE instead');
        if (parsed.distinct) warnings.push('DISTINCT may indicate missing GROUP BY or data model issue');
        if (!hasSeqScan) ok.push('Index scan detected — good filter coverage');
        if (parsed.limit) ok.push(`LIMIT ${parsed.limit} — result set bounded`);
        if (!parsed.subquery) ok.push('No correlated subqueries');

        let warnHtml = warnings.map(w => `<span class="warning-badge">⚠ ${w}</span>`).join(' ');
        let okHtml   = ok.map(o => `<span class="ok-badge">✓ ${o}</span>`).join(' ');
        addCard(wrap, 'Diagnostics', (warnHtml || okHtml) ? warnHtml + '<br>' + okHtml : '<span style="color:#444">No diagnostics</span>');

        // Index suggestions
        const idxSuggestions = [];
        parsed.conditions.forEach(c => {
            const col = c.match(/(\w+\.\w+|\w+)\s*[=<>]/);
            if (col) idxSuggestions.push(`CREATE INDEX ON ${parsed.tables[0]?.name || 'table'} (${col[1].split('.').pop()})`);
        });
        parsed.joins.forEach(j => {
            const cols = j.on.split('=').map(s => s.trim().split('.').pop());
            idxSuggestions.push(`CREATE INDEX ON ${j.table} (${cols[1]})`);
        });
        if (parsed.orderBy) idxSuggestions.push('Add index on ORDER BY column(s) to avoid filesort');
        if (idxSuggestions.length) {
            addCard(wrap, 'Index Suggestions', `<code style="background:rgba(180,100,220,0.1);border-radius:4px;padding:4px 8px;display:block;margin:3px 0;font-size:11px;color:#c9a0e8;">${[...new Set(idxSuggestions)].join('</code><code style="background:rgba(180,100,220,0.1);border-radius:4px;padding:4px 8px;display:block;margin:3px 0;font-size:11px;color:#c9a0e8;">')}</code>`);
        }

        // Tables found
        const allTables = [parsed.tables[0]?.name, ...parsed.joins.map(j=>j.table)].filter(Boolean);
        addCard(wrap, 'Tables Referenced', `<strong>${allTables.join(', ')}</strong><br><span style="color:#555;font-size:11px;">${parsed.joins.length} join(s) · ${parsed.conditions.length} filter predicate(s)</span>`);
    }

    function addCard(wrap, title, bodyHtml) {
        const d = document.createElement('div');
        d.className = 'analysis-card';
        d.innerHTML = `<div class="analysis-title">${title}</div><div class="analysis-body">${bodyHtml}</div>`;
        wrap.appendChild(d);
    }

    function analyseQuery() {
        const sql = document.getElementById('sql-input').value.trim();
        if (!sql) return;
        document.getElementById('empty-state').style.display = 'none';
        document.getElementById('results').style.display     = 'block';
        const parsed = parseSQL(sql);
        const nodes  = buildPlan(parsed);
        setTimeout(() => { drawPlan(nodes); buildAnalysis(parsed, nodes); }, 30);
    }

    function clearAll() {
        document.getElementById('sql-input').value = '';
        document.getElementById('results').style.display     = 'none';
        document.getElementById('empty-state').style.display = 'block';
    }

    document.addEventListener('DOMContentLoaded', () => {
        buildExamples();
        analyseQuery();
    });
