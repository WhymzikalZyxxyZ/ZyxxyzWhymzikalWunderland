// ─── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('#arch-app .arch-tab').forEach(t => {
    t.addEventListener('click', () => {
        document.querySelectorAll('#arch-app .arch-tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('#arch-app .arch-panel').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        document.getElementById('tab-' + t.dataset.tab).classList.add('active');
    });
});

// ─── Glossary accordion ────────────────────────────────────────────────────────
document.querySelectorAll('#arch-app .gl-q').forEach(q => {
    q.addEventListener('click', () => {
        q.classList.toggle('open');
        q.nextElementSibling.classList.toggle('open');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DIAGRAM ENGINE
// ═══════════════════════════════════════════════════════════════════════════════
const SVG_NS = 'http://www.w3.org/2000/svg';
const VB_W = 960, VB_H = 600;

const NODE_DIMS = {
    process:  {w:140, h:50},
    decision: {w:140, h:72},
    terminal: {w:120, h:48},
    database: {w:110, h:62},
    io:       {w:140, h:50},
};

let nodes = [], edges = [], nextId = 1;
let selected = null;          // {kind:'node'|'edge', id}
let mode = 'select';          // 'select' | 'place:type' | 'connect'
let connSrc = null;           // node id when connecting
let dragging = null;          // {id, ox, oy, mx, my}
let history = [];             // undo stack (snapshots)

const archSVG     = document.getElementById('arch-svg');
const statusEl    = document.getElementById('arch-status');
const labelIn     = document.getElementById('label-input');
const sidebarInp  = document.getElementById('sidebar-lbl-inp');
const sidebarWrap = document.getElementById('sidebar-label-wrap');
const sidebarHead = document.getElementById('lbl-sec-head');

// ── Sidebar label sync ────────────────────────────────────────────────────────
function syncSidebarLabel() {
    if (selected?.kind === 'node') {
        const node = nodes.find(n => n.id === selected.id);
        if (node) {
            sidebarWrap.style.display = 'block';
            sidebarHead.style.display = 'block';
            // Only update value if the input isn't actively being edited
            if (document.activeElement !== sidebarInp) sidebarInp.value = node.label;
            return;
        }
    }
    sidebarWrap.style.display = 'none';
    sidebarHead.style.display = 'none';
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
function svgE(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
}

function svgPt(e) {
    const rect = archSVG.getBoundingClientRect();
    return [
        (e.clientX - rect.left) / rect.width  * VB_W,
        (e.clientY - rect.top)  / rect.height * VB_H,
    ];
}

// ── Connection point: nearest border point of node toward (tx, ty) ────────────
function connPt(node, tx, ty) {
    const cx = node.x + node.w / 2, cy = node.y + node.h / 2;
    const dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];

    if (node.type === 'terminal') {
        const rx = node.w / 2, ry = node.h / 2;
        const ang = Math.atan2(dy * rx, dx * ry);
        return [cx + rx * Math.cos(ang), cy + ry * Math.sin(ang)];
    }
    if (node.type === 'decision') {
        const hw = node.w / 2, hh = node.h / 2;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        const t = 1 / (adx / hw + ady / hh + 1e-9);
        return [cx + dx * t, cy + dy * t];
    }
    // rect / database / io: bounding box
    const hw = node.w / 2, hh = node.h / 2;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx * hh >= ady * hw) {
        return [cx + Math.sign(dx) * hw, cy + dy * (hw / (adx + 1e-9))];
    }
    return [cx + dx * (hh / (ady + 1e-9)), cy + Math.sign(dy) * hh];
}

// ── Build SVG shape for a node ─────────────────────────────────────────────────
function buildNodeShapes(node, fill, stroke, sw) {
    const {x, y, w, h, type} = node;
    const cx = x + w / 2, cy = y + h / 2;
    const els = [];

    if (type === 'process') {
        els.push(svgE('rect', {x, y, width:w, height:h, rx:4, fill, stroke, 'stroke-width':sw}));
    } else if (type === 'decision') {
        els.push(svgE('polygon', {
            points: `${cx},${y} ${x+w},${cy} ${cx},${y+h} ${x},${cy}`,
            fill, stroke, 'stroke-width':sw,
        }));
    } else if (type === 'terminal') {
        els.push(svgE('ellipse', {cx, cy, rx:w/2, ry:h/2, fill, stroke, 'stroke-width':sw}));
    } else if (type === 'database') {
        const ery = 10;
        els.push(svgE('rect',    {x, y:y+ery, width:w, height:h-ery, fill, stroke, 'stroke-width':sw}));
        els.push(svgE('ellipse', {cx, cy:y+ery, rx:w/2, ry:ery, fill, stroke, 'stroke-width':sw}));
        // bottom arc to close cylinder
        const arc = svgE('path', {
            d: `M ${x} ${y+h-ery} A ${w/2} ${ery} 0 0 0 ${x+w} ${y+h-ery}`,
            fill:'none', stroke, 'stroke-width':sw,
        });
        els.push(arc);
    } else if (type === 'io') {
        const off = 14;
        els.push(svgE('polygon', {
            points: `${x+off},${y} ${x+w},${y} ${x+w-off},${y+h} ${x},${y+h}`,
            fill, stroke, 'stroke-width':sw,
        }));
    }
    return els;
}

// ── Full render ────────────────────────────────────────────────────────────────
function render() {
    // Remove all children except <defs> and background rect
    const children = Array.from(archSVG.children);
    children.forEach(c => {
        if (c.tagName !== 'defs' && c.id !== 'arch-bg') archSVG.removeChild(c);
    });

    // Edges first (underneath nodes)
    edges.forEach(edge => {
        const src = nodes.find(n => n.id === edge.src);
        const dst = nodes.find(n => n.id === edge.dst);
        if (!src || !dst) return;

        const scx = src.x + src.w / 2, scy = src.y + src.h / 2;
        const dcx = dst.x + dst.w / 2, dcy = dst.y + dst.h / 2;
        const [x1, y1] = connPt(src, dcx, dcy);
        const [x2, y2] = connPt(dst, scx, scy);

        const isSel = selected?.kind === 'edge' && selected.id === edge.id;
        const edgePath = svgE('path', {
            d: `M ${x1} ${y1} L ${x2} ${y2}`,
            stroke: isSel ? '#f59e0b' : '#60a5fa',
            'stroke-width': isSel ? 2.5 : 1.8,
            fill: 'none',
            'marker-end': isSel ? 'url(#arch-arrow-sel)' : 'url(#arch-arrow)',
            'stroke-dasharray': isSel ? '6 3' : 'none',
            'data-edge-id': edge.id,
            style: 'cursor:pointer',
        });
        edgePath.dataset.edgeId = edge.id;
        archSVG.appendChild(edgePath);
    });

    // Nodes on top
    nodes.forEach(node => {
        const isSel     = selected?.kind === 'node' && selected.id === node.id;
        const isConnSrc = connSrc === node.id;
        const stroke    = isConnSrc ? '#10b981' : isSel ? '#f59e0b' : '#2563eb';
        const sw        = isSel || isConnSrc ? '2.5' : '1.8';
        const fill      = '#1a1a26';

        const g = svgE('g', {style:'cursor:grab'});
        g.dataset.nodeId = node.id;

        buildNodeShapes(node, fill, stroke, sw).forEach(s => g.appendChild(s));

        if (isSel) {
            // subtle glow highlight
            const halo = svgE('rect', {
                x: node.x - 4, y: node.y - 4,
                width: node.w + 8, height: node.h + 8,
                rx: 6, fill: 'none',
                stroke: '#f59e0b', 'stroke-width': '1', opacity: '0.35',
            });
            g.insertBefore(halo, g.firstChild);
        }

        const cx = node.x + node.w / 2, cy = node.y + node.h / 2;
        const text = svgE('text', {
            x: cx, y: cy,
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            'font-family': 'Courier New, monospace',
            'font-size': '12',
            fill: '#e2e8f0',
            style: 'pointer-events:none; user-select:none;',
        });
        text.textContent = node.label;
        g.appendChild(text);

        archSVG.appendChild(g);
    });

    // SVG cursor
    archSVG.className = mode.startsWith('place') ? 'placing' : mode === 'connect' ? 'connecting' : '';

    syncSidebarLabel();
}

// ── Mode management ───────────────────────────────────────────────────────────
function setMode(m) {
    mode = m;
    connSrc = null;
    document.querySelectorAll('#arch-app .shape-item, #arch-app .arch-btn').forEach(el => el.classList.remove('active'));
    if (m.startsWith('place:')) {
        document.querySelector(`[data-type="${m.slice(6)}"]`)?.classList.add('active');
        statusEl.textContent = `Click on the canvas to place a ${m.slice(6)} node. Press Escape to cancel.`;
    } else if (m === 'connect') {
        document.getElementById('btn-connect').classList.add('active');
        statusEl.textContent = 'Click the source node, then the destination node to draw an arrow. Press Escape to cancel.';
    } else {
        statusEl.textContent = 'Click a shape to place it, or click existing nodes to select and move them. Double-click a node to rename it.';
    }
    render();
}

// ── Snapshot for undo ─────────────────────────────────────────────────────────
function snapshot() {
    history.push({
        nodes: nodes.map(n => ({...n})),
        edges: edges.map(e => ({...e})),
    });
    if (history.length > 40) history.shift();
}

// ── Place a node ──────────────────────────────────────────────────────────────
function placeNode(e, type) {
    const [px, py] = svgPt(e);
    const {w, h} = NODE_DIMS[type];
    const labels = {process:'Process', decision:'Decision', terminal:'Start/End', database:'Database', io:'Input/Output'};
    snapshot();
    const newNode = {id: 'n'+(nextId++), type, x: px - w/2, y: py - h/2, w, h, label: labels[type]};
    nodes.push(newNode);
    selected = {kind:'node', id: newNode.id};
    setMode('select');
    render();
    // Auto-focus sidebar label input so the user can immediately type the label
    sidebarInp.focus();
    sidebarInp.select();
}

// ── Mouse events ──────────────────────────────────────────────────────────────
archSVG.addEventListener('mousedown', e => {
    if (e.target === labelIn) return;
    commitLabel();

    const nodeEl = e.target.closest('[data-node-id]');
    const edgeEl = e.target.closest('[data-edge-id]');

    if (nodeEl) {
        const id = nodeEl.dataset.nodeId;
        if (mode === 'connect') {
            if (!connSrc) {
                connSrc = id;
                statusEl.textContent = 'Now click the destination node.';
                render();
            } else if (connSrc === id) {
                connSrc = null;
                statusEl.textContent = 'Click the source node, then the destination node to draw an arrow.';
                render();
            } else {
                snapshot();
                edges.push({id:'e'+(nextId++), src:connSrc, dst:id});
                connSrc = null;
                statusEl.textContent = 'Arrow created. Click another source node to continue, or press Escape.';
                render();
            }
        } else if (mode === 'select') {
            selected = {kind:'node', id};
            const [mx, my] = svgPt(e);
            const node = nodes.find(n => n.id === id);
            dragging = {id, ox:node.x, oy:node.y, mx, my};
            render();
        }
        e.stopPropagation();

    } else if (edgeEl) {
        if (mode === 'select') {
            selected = {kind:'edge', id: edgeEl.dataset.edgeId};
            render();
        }
        e.stopPropagation();

    } else {
        // background click
        if (mode.startsWith('place:')) {
            placeNode(e, mode.slice(6));
        } else {
            selected = null;
            render();
        }
    }
});

document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const [mx, my] = svgPt(e);
    const node = nodes.find(n => n.id === dragging.id);
    if (!node) return;
    node.x = Math.max(0, Math.min(VB_W - node.w, dragging.ox + mx - dragging.mx));
    node.y = Math.max(0, Math.min(VB_H - node.h, dragging.oy + my - dragging.my));
    render();
});

document.addEventListener('mouseup', () => {
    if (dragging) { snapshot(); dragging = null; }
});

// ── Double-click: edit label ──────────────────────────────────────────────────
archSVG.addEventListener('dblclick', e => {
    const nodeEl = e.target.closest('[data-node-id]');
    if (!nodeEl) return;
    const node = nodes.find(n => n.id === nodeEl.dataset.nodeId);
    if (!node) return;
    startEdit(node);
});

function startEdit(node) {
    const rect = archSVG.getBoundingClientRect();
    const sx = rect.left + (node.x + node.w / 2) / VB_W * rect.width;
    const sy = rect.top  + (node.y + node.h / 2) / VB_H * rect.height;
    labelIn.dataset.nodeId = node.id;
    labelIn.value = node.label;
    labelIn.style.left = sx + 'px';
    labelIn.style.top  = sy + 'px';
    labelIn.style.display = 'block';
    labelIn.style.width = Math.max(80, node.w * rect.width / VB_W - 16) + 'px';
    labelIn.focus();
    labelIn.select();
}

function commitLabel() {
    if (labelIn.style.display === 'none') return;
    const id = labelIn.dataset.nodeId;
    const node = nodes.find(n => n.id === id);
    if (node && labelIn.value.trim()) {
        snapshot();
        node.label = labelIn.value.trim();
        render();
    }
    labelIn.style.display = 'none';
}

labelIn.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commitLabel(); }
    if (e.key === 'Escape') { labelIn.style.display = 'none'; }
});
labelIn.addEventListener('blur', commitLabel);

// ── Sidebar label input ───────────────────────────────────────────────────────
sidebarInp.addEventListener('input', () => {
    if (!selected || selected.kind !== 'node') return;
    const node = nodes.find(n => n.id === selected.id);
    if (!node) return;
    node.label = sidebarInp.value;
    render();
});

sidebarInp.addEventListener('keydown', e => {
    // Prevent canvas-level shortcuts (Delete, Escape) while editing label
    e.stopPropagation();
    if (e.key === 'Enter') {
        snapshot();
        sidebarInp.blur();
        archSVG.focus();
    }
});

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    const active = document.activeElement;
    const inInput = active === labelIn || active === sidebarInp || active.tagName === 'INPUT';
    if (inInput) return;

    if (e.key === 'Escape') { setMode('select'); return; }

    if ((e.key === 'Delete' || e.key === 'Backspace') && selected) {
        e.preventDefault(); deleteSelected(); return;
    }

    // Any printable character while a node is selected → redirect to sidebar input
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && selected?.kind === 'node') {
        sidebarInp.focus();
        // The character will land naturally in the now-focused input
    }
});

// ── Toolbar buttons ───────────────────────────────────────────────────────────
document.querySelectorAll('#arch-app .shape-item').forEach(item => {
    item.addEventListener('click', () => setMode('place:' + item.dataset.type));
});

document.getElementById('btn-connect').addEventListener('click', () => {
    setMode(mode === 'connect' ? 'select' : 'connect');
});

document.getElementById('btn-delete').addEventListener('click', deleteSelected);

function deleteSelected() {
    if (!selected) { statusEl.textContent = 'Nothing selected to delete.'; return; }
    snapshot();
    if (selected.kind === 'node') {
        const id = selected.id;
        nodes = nodes.filter(n => n.id !== id);
        edges = edges.filter(e => e.src !== id && e.dst !== id);
    } else {
        edges = edges.filter(e => e.id !== selected.id);
    }
    selected = null;
    render();
}

document.getElementById('btn-undo').addEventListener('click', () => {
    if (!history.length) { statusEl.textContent = 'Nothing to undo.'; return; }
    const prev = history.pop();
    nodes = prev.nodes; edges = prev.edges;
    selected = null; render();
});

document.getElementById('btn-clear').addEventListener('click', () => {
    if (!nodes.length && !edges.length) return;
    snapshot(); nodes = []; edges = []; selected = null; render();
    statusEl.textContent = 'Canvas cleared.';
});

// ── Export ────────────────────────────────────────────────────────────────────
function exportSVG() {
    const clone = archSVG.cloneNode(true);
    clone.setAttribute('xmlns', SVG_NS);
    // embed font hint
    const style = svgE('style');
    style.textContent = 'text{font-family:"Courier New",monospace;}';
    clone.insertBefore(style, clone.firstChild);
    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], {type:'image/svg+xml'});
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {download:'diagram.svg', href:url});
    a.click();
    URL.revokeObjectURL(url);
}

function exportPNG() {
    const clone = archSVG.cloneNode(true);
    clone.setAttribute('xmlns', SVG_NS);
    // add background fill for PNG
    const bg = clone.querySelector('#arch-bg');
    if (bg) bg.setAttribute('fill', '#09090f');
    // remove dot pattern for clean export
    const pat = clone.querySelector('#arch-dots');
    if (pat) pat.parentNode.removeChild(pat);

    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], {type:'image/svg+xml;charset=utf-8'});
    const url  = URL.createObjectURL(blob);
    const img  = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = VB_W * 2; canvas.height = VB_H * 2;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#09090f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        const a = Object.assign(document.createElement('a'), {download:'diagram.png', href:canvas.toDataURL('image/png')});
        a.click();
    };
    img.onerror = () => {
        // fallback to SVG if PNG fails (cross-origin font restriction)
        URL.revokeObjectURL(url);
        exportSVG();
        statusEl.textContent = 'PNG export not available in this browser — downloaded SVG instead.';
    };
    img.src = url;
}

document.getElementById('btn-export-svg').addEventListener('click', exportSVG);
document.getElementById('btn-export-png').addEventListener('click', exportPNG);

// ─── Init ──────────────────────────────────────────────────────────────────────
render();
