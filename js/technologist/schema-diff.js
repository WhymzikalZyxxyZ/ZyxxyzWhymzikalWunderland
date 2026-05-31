'use strict';

    let currentMode = 'sql';

    function switchTab(name) {
        document.querySelectorAll('.sd-tab').forEach((t, i) => {
            const tabs = ['diff','concepts'];
            t.classList.toggle('active', tabs[i] === name);
        });
        document.querySelectorAll('.sd-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('tab-' + name).classList.add('active');
    }

    function setMode(m) {
        currentMode = m;
        document.getElementById('modeSql').classList.toggle('active', m === 'sql');
        document.getElementById('modeJson').classList.toggle('active', m === 'json');
    }

    function clearAll() {
        document.getElementById('schemaBefore').value = '';
        document.getElementById('schemaAfter').value = '';
        document.getElementById('diffOutput').style.display = 'none';
        document.getElementById('diffEmpty').style.display = 'block';
    }

    // --- SQL Parser ---
    function parseSQL(sql) {
        const tables = {};
        const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(([^;]+)\)/gi;
        let m;
        while ((m = createRe.exec(sql)) !== null) {
            const tname = m[1];
            const body = m[2];
            const cols = {};
            const constraints = [];
            body.split(',').map(s => s.trim()).filter(Boolean).forEach(line => {
                const colMatch = /^["'`]?(\w+)["'`]?\s+([A-Z][A-Z0-9_\(\),\s]*?)(\s+(?:NOT\s+NULL|NULL|DEFAULT\s+\S+|PRIMARY\s+KEY|UNIQUE|REFERENCES\s+\w+(?:\s*\(\w+\))?|AUTO_INCREMENT|AUTOINCREMENT|CHECK\s*\(.+?\)|\w+))*\s*$/i.exec(line);
                const constraintMatch = /^\s*(PRIMARY\s+KEY|UNIQUE|CONSTRAINT|INDEX|KEY|FOREIGN\s+KEY)/i.exec(line);
                if (constraintMatch) {
                    constraints.push(line.trim());
                } else if (colMatch) {
                    const colName = colMatch[1];
                    const rest = line.slice(colName.length).trim();
                    cols[colName] = rest;
                }
            });
            tables[tname] = { cols, constraints };
        }
        return tables;
    }

    // --- JSON Schema Parser ---
    function parseJSONSchema(text) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return null;
        }
    }

    // --- Diff SQL ---
    function diffSQL(before, after) {
        const tbefore = parseSQL(before);
        const tafter  = parseSQL(after);
        const allTables = new Set([...Object.keys(tbefore), ...Object.keys(tafter)]);
        const changes = [];
        const migration = [];

        allTables.forEach(tname => {
            const b = tbefore[tname];
            const a = tafter[tname];

            if (!b && a) {
                changes.push({ type: 'table-added', table: tname, schema: a });
                migration.push(`-- Create new table\n${generateCreateTable(tname, a)}`);
                return;
            }
            if (b && !a) {
                changes.push({ type: 'table-dropped', table: tname });
                migration.push(`-- Drop table (destructive — ensure no dependencies)\nDROP TABLE IF EXISTS "${tname}";`);
                return;
            }

            // Both exist — diff columns
            const allCols = new Set([...Object.keys(b.cols), ...Object.keys(a.cols)]);
            const colChanges = [];
            allCols.forEach(col => {
                if (!b.cols[col] && a.cols[col]) {
                    colChanges.push({ type: 'col-added', col, def: a.cols[col] });
                    migration.push(`ALTER TABLE "${tname}" ADD COLUMN "${col}" ${a.cols[col]};`);
                } else if (b.cols[col] && !a.cols[col]) {
                    colChanges.push({ type: 'col-dropped', col, def: b.cols[col] });
                    migration.push(`ALTER TABLE "${tname}" DROP COLUMN "${col}";`);
                } else if (b.cols[col] !== a.cols[col]) {
                    colChanges.push({ type: 'col-modified', col, before: b.cols[col], after: a.cols[col] });
                    migration.push(`ALTER TABLE "${tname}" ALTER COLUMN "${col}" TYPE ${extractType(a.cols[col])};`);
                }
            });

            // Constraint diff
            const bCons = new Set(b.constraints.map(s => s.toLowerCase().replace(/\s+/g,' ')));
            const aCons = new Set(a.constraints.map(s => s.toLowerCase().replace(/\s+/g,' ')));
            a.constraints.filter(c => !bCons.has(c.toLowerCase().replace(/\s+/g,' '))).forEach(c => {
                colChanges.push({ type: 'constraint-added', def: c });
                migration.push(`ALTER TABLE "${tname}" ADD ${c};`);
            });
            b.constraints.filter(c => !aCons.has(c.toLowerCase().replace(/\s+/g,' '))).forEach(c => {
                colChanges.push({ type: 'constraint-dropped', def: c });
                migration.push(`-- ALTER TABLE "${tname}" DROP CONSTRAINT ... -- (identify constraint name first)`);
            });

            if (colChanges.length) {
                changes.push({ type: 'table-modified', table: tname, colChanges });
            }
        });
        return { changes, migration };
    }

    function extractType(def) {
        return def.split(/\s+/).slice(0,2).join(' ');
    }

    function generateCreateTable(name, schema) {
        const lines = Object.entries(schema.cols).map(([col, def]) => `    "${col}" ${def}`);
        schema.constraints.forEach(c => lines.push('    ' + c));
        return `CREATE TABLE "${name}" (\n${lines.join(',\n')}\n);`;
    }

    // --- Diff JSON Schema ---
    function flattenSchema(schema, prefix) {
        const result = {};
        if (!schema || typeof schema !== 'object') return result;
        const props = schema.properties || {};
        Object.entries(props).forEach(([k, v]) => {
            const key = prefix ? prefix + '.' + k : k;
            const required = (schema.required || []).includes(k);
            result[key] = { type: v.type || '?', required, raw: JSON.stringify(v) };
            if (v.type === 'object' && v.properties) {
                Object.assign(result, flattenSchema(v, key));
            }
        });
        if (schema.required) result['__required__'] = schema.required.join(',');
        if (schema.additionalProperties !== undefined) result['__additionalProperties__'] = String(schema.additionalProperties);
        return result;
    }

    function diffJSONSchema(before, after) {
        const bParsed = parseJSONSchema(before);
        const aParsed = parseJSONSchema(after);
        if (!bParsed || !aParsed) return { changes: [], migration: ['-- Could not parse JSON schema.'], error: true };

        const bFlat = flattenSchema(bParsed, '');
        const aFlat = flattenSchema(aParsed, '');
        const allKeys = new Set([...Object.keys(bFlat), ...Object.keys(aFlat)]);
        const changes = [];
        const migration = [];

        allKeys.forEach(k => {
            if (k.startsWith('__')) return;
            if (!bFlat[k] && aFlat[k]) {
                changes.push({ type: 'field-added', field: k, def: aFlat[k] });
                migration.push(`-- Add field "${k}" (type: ${aFlat[k].type}${aFlat[k].required ? ', required' : ', optional'})`);
            } else if (bFlat[k] && !aFlat[k]) {
                changes.push({ type: 'field-removed', field: k, def: bFlat[k] });
                migration.push(`-- Remove field "${k}" — check all producers/consumers before removing`);
            } else if (bFlat[k] && aFlat[k] && bFlat[k].raw !== aFlat[k].raw) {
                changes.push({ type: 'field-modified', field: k, before: bFlat[k], after: aFlat[k] });
                migration.push(`-- Modify field "${k}": ${bFlat[k].type} → ${aFlat[k].type}`);
            }
        });

        if (bFlat['__required__'] !== aFlat['__required__']) {
            const bReq = new Set((bFlat['__required__'] || '').split(',').filter(Boolean));
            const aReq = new Set((aFlat['__required__'] || '').split(',').filter(Boolean));
            aReq.forEach(f => { if (!bReq.has(f)) migration.push(`-- Field "${f}" is now required — ensure all existing data is backfilled`); });
            bReq.forEach(f => { if (!aReq.has(f)) migration.push(`-- Field "${f}" is no longer required (relaxed)`); });
        }

        if (!migration.length) migration.push('-- No schema changes detected.');
        return { changes, migration };
    }

    // --- Unified diff lines ---
    function lineDiff(before, after) {
        const bl = before.split('\n');
        const al = after.split('\n');
        const result = [];
        let bi = 0, ai = 0;
        while (bi < bl.length || ai < al.length) {
            if (bi < bl.length && ai < al.length && bl[bi] === al[ai]) {
                result.push({ type: 'ctx', text: bl[bi] });
                bi++; ai++;
            } else {
                // Simple: look for matches ahead
                let foundB = -1, foundA = -1;
                for (let d = 1; d <= 4; d++) {
                    if (foundB < 0 && ai < al.length && bi + d < bl.length && bl[bi + d] === al[ai]) { foundB = bi + d; break; }
                    if (foundA < 0 && bi < bl.length && ai + d < al.length && al[ai + d] === bl[bi]) { foundA = ai + d; break; }
                }
                if (foundB >= 0) {
                    for (let i = bi; i < foundB; i++) result.push({ type: 'del', text: bl[i] });
                    bi = foundB;
                } else if (foundA >= 0) {
                    for (let i = ai; i < foundA; i++) result.push({ type: 'add', text: al[i] });
                    ai = foundA;
                } else {
                    if (bi < bl.length) { result.push({ type: 'del', text: bl[bi++] }); }
                    if (ai < al.length) { result.push({ type: 'add', text: al[ai++] }); }
                }
            }
        }
        return result;
    }

    function renderLineDiff(lines) {
        let ln1 = 1, ln2 = 1;
        return lines.map(l => {
            const esc = l.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            if (l.type === 'add') {
                return `<tr class="diff-add"><td class="ln">${ln2++}</td><td>+ ${esc}</td></tr>`;
            } else if (l.type === 'del') {
                return `<tr class="diff-del"><td class="ln">${ln1++}</td><td>- ${esc}</td></tr>`;
            } else {
                ln1++; ln2++;
                return `<tr class="diff-ctx"><td class="ln">${ln1-1}</td><td>  ${esc}</td></tr>`;
            }
        }).join('');
    }

    function renderSQLChanges(changes) {
        if (!changes.length) return '<div class="no-diff">No differences detected.</div>';
        return changes.map(ch => {
            if (ch.type === 'table-added') {
                return `<div class="diff-section"><div class="diff-section-header"><strong>${ch.table}</strong> <span class="sum-badge sum-add">CREATED</span></div><table class="diff-table">${
                    Object.entries(ch.schema.cols).map(([c, d]) => `<tr class="diff-add"><td class="ln">+</td><td>+ ${c} ${d}</td></tr>`).join('')
                }</table></div>`;
            }
            if (ch.type === 'table-dropped') {
                return `<div class="diff-section"><div class="diff-section-header"><strong>${ch.table}</strong> <span class="sum-badge sum-del">DROPPED</span></div></div>`;
            }
            if (ch.type === 'table-modified') {
                const rows = ch.colChanges.map(cc => {
                    if (cc.type === 'col-added') return `<tr class="diff-add"><td class="ln">+</td><td>+ ${cc.col} ${cc.def}</td></tr>`;
                    if (cc.type === 'col-dropped') return `<tr class="diff-del"><td class="ln">-</td><td>- ${cc.col} ${cc.def}</td></tr>`;
                    if (cc.type === 'col-modified') return `<tr class="diff-del"><td class="ln">~</td><td>- ${cc.col} ${cc.before}</td></tr><tr class="diff-add"><td class="ln">~</td><td>+ ${cc.col} ${cc.after}</td></tr>`;
                    if (cc.type === 'constraint-added') return `<tr class="diff-add"><td class="ln">+</td><td>+ [constraint] ${cc.def}</td></tr>`;
                    if (cc.type === 'constraint-dropped') return `<tr class="diff-del"><td class="ln">-</td><td>- [constraint] ${cc.def}</td></tr>`;
                    return '';
                }).join('');
                return `<div class="diff-section"><div class="diff-section-header"><strong>${ch.table}</strong> <span class="sum-badge sum-mod">MODIFIED</span></div><table class="diff-table">${rows}</table></div>`;
            }
            return '';
        }).join('');
    }

    function renderJSONChanges(changes) {
        if (!changes.length) return '<div class="no-diff">No differences detected.</div>';
        return changes.map(ch => {
            if (ch.type === 'field-added') return `<div class="diff-section"><table class="diff-table"><tr class="diff-add"><td class="ln">+</td><td>+ ${ch.field}: ${ch.def.type}${ch.def.required ? ' (required)' : ''}</td></tr></table></div>`;
            if (ch.type === 'field-removed') return `<div class="diff-section"><table class="diff-table"><tr class="diff-del"><td class="ln">-</td><td>- ${ch.field}: ${ch.def.type}${ch.def.required ? ' (required)' : ''}</td></tr></table></div>`;
            if (ch.type === 'field-modified') return `<div class="diff-section"><table class="diff-table"><tr class="diff-del"><td class="ln">~</td><td>- ${ch.field}: ${ch.before.raw}</td></tr><tr class="diff-add"><td class="ln">~</td><td>+ ${ch.field}: ${ch.after.raw}</td></tr></table></div>`;
            return '';
        }).join('');
    }

    function highlightSQL(sql) {
        return sql
            .replace(/\b(ALTER|CREATE|DROP|TABLE|COLUMN|INDEX|ADD|TYPE|REFERENCES|IF|NOT|EXISTS|NULL|DEFAULT|PRIMARY|KEY|UNIQUE|FOREIGN|CONSTRAINT|BEGIN|COMMIT|ROLLBACK)\b/gi, '<span class="sql-keyword">$1</span>')
            .replace(/\b(INT|INTEGER|BIGINT|SMALLINT|VARCHAR|TEXT|BOOLEAN|BOOL|TIMESTAMP|DATE|TIME|FLOAT|DOUBLE|DECIMAL|SERIAL|UUID|JSON|JSONB|ENUM|CHAR|BYTEA)\b/gi, '<span class="sql-type">$1</span>')
            .replace(/'([^']*)'/g, '<span class="sql-string">\'$1\'</span>')
            .replace(/(--[^\n]*)/g, '<span class="sql-comment">$1</span>');
    }

    function runDiff() {
        const before = document.getElementById('schemaBefore').value.trim();
        const after  = document.getElementById('schemaAfter').value.trim();
        if (!before || !after) { alert('Please paste schemas in both fields.'); return; }

        let changes, migration;

        if (currentMode === 'sql') {
            const result = diffSQL(before, after);
            changes = result.changes;
            migration = result.migration;
        } else {
            const result = diffJSONSchema(before, after);
            changes = result.changes;
            migration = result.migration;
        }

        const added   = changes.filter(c => c.type.includes('added') || c.type.includes('table-added')).length;
        const removed = changes.filter(c => c.type.includes('dropped') || c.type.includes('removed')).length;
        const modified = changes.filter(c => c.type.includes('modified')).length;

        const summary = document.getElementById('diffSummary');
        summary.innerHTML = `
            <span class="sum-badge sum-add">+${added} added</span>
            <span class="sum-badge sum-del">-${removed} removed</span>
            <span class="sum-badge sum-mod">~${modified} modified</span>
            ${!changes.length ? '<span class="sum-badge sum-none">No changes</span>' : ''}
        `;

        const vis = document.getElementById('visualDiff');
        if (currentMode === 'sql') {
            vis.innerHTML = renderSQLChanges(changes);
            if (!changes.length) {
                // Fall back to raw line diff
                const lines = lineDiff(before, after);
                vis.innerHTML = `<div class="diff-section"><div class="diff-section-header"><strong>Raw Diff</strong></div><table class="diff-table">${renderLineDiff(lines)}</table></div>`;
            }
        } else {
            vis.innerHTML = renderJSONChanges(changes);
        }

        document.getElementById('migrationScript').innerHTML = highlightSQL(migration.join('\n\n'));
        document.getElementById('diffOutput').style.display = 'block';
        document.getElementById('diffEmpty').style.display = 'none';
    }

    function copyScript() {
        const text = document.getElementById('migrationScript').textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.querySelector('.copy-btn');
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = orig; }, 1500);
        });
    }

    // --- Presets ---
    const PRESETS = {
        'users-add-col': {
            mode: 'sql',
            before: `CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);`,
            after: `CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash TEXT NOT NULL,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);`
        },
        'products-refactor': {
            mode: 'sql',
            before: `CREATE TABLE products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100),
    price FLOAT,
    qty INT,
    category_id INT,
    CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id)
);`,
            after: `CREATE TABLE products (
    id BIGINT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 0,
    sku VARCHAR(50) UNIQUE,
    category_id INT NOT NULL,
    CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT chk_price CHECK (price >= 0)
);`
        },
        'json-schema-evolve': {
            mode: 'json',
            before: `{
  "type": "object",
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "email": { "type": "string" },
    "age": { "type": "integer" }
  },
  "required": ["id", "name"]
}`,
            after: `{
  "type": "object",
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "name": { "type": "string", "minLength": 1, "maxLength": 100 },
    "email": { "type": "string", "format": "email" },
    "phone": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" }
  },
  "required": ["id", "name", "email"],
  "additionalProperties": false
}`
        },
        'orders-v2': {
            mode: 'sql',
            before: `CREATE TABLE orders (
    id INT PRIMARY KEY,
    user_id INT,
    total FLOAT,
    status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP
);`,
            after: `CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id INT NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user_status (user_id, status)
);`
        }
    };

    function loadPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        document.getElementById('schemaBefore').value = p.before;
        document.getElementById('schemaAfter').value = p.after;
        setMode(p.mode);
        runDiff();
    }

    document.getElementById('diffEmpty').style.display = 'block';
