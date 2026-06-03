'use strict';

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
const MIN_W = 40, MIN_H = 28;

const NODE_DIMS = {
    process:  {w:140, h:50},
    decision: {w:140, h:72},
    terminal: {w:120, h:48},
    database: {w:110, h:62},
    io:       {w:140, h:50},
    actor:    {w:60,  h:80},
    note:     {w:130, h:70},
};

const NODE_LABELS = {
    process:'Process', decision:'Decision', terminal:'Start/End',
    database:'Database', io:'Input/Output', actor:'Actor', note:'Note',
};

// ── State ─────────────────────────────────────────────────────────────────────
let nodes = [], edges = [], nextId = 1;
let selectedIds   = new Set();
let selKind       = null;        // 'node' | 'edge' | null
let mode          = 'select';
let connSrc       = null;
let dragging      = null;        // {starts:[{id,ox,oy}], smx, smy, moved}
let resizing      = null;        // {id,handle,ox,oy,ow,oh,smx,smy}
let drawing       = null;        // {type,sx,sy,ex,ey}
let sidebarDrag   = null;        // type string
let connectDrag   = null;        // {srcId,x1,y1,ex,ey} – drag-to-connect
let marquee       = null;        // {x1,y1,x2,y2}
let panning       = null;        // {startClientX,startClientY,startVbX,startVbY}
let hoveredNodeId = null;        // node under cursor (for anchor display)
let spaceDown     = false;
let lastPlacedId  = null;
let clipboard     = null;
let _history      = [];
let _redo         = [];

// ViewBox
let vbX = 0, vbY = 0, vbW = VB_W, vbH = VB_H;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const archSVG       = document.getElementById('arch-svg');
const statusEl      = document.getElementById('arch-status');
const labelIn       = document.getElementById('label-input');
const sidebarInp    = document.getElementById('sidebar-lbl-inp');
const sidebarWrap   = document.getElementById('sidebar-label-wrap');
const sidebarHead   = document.getElementById('lbl-sec-head');
const stylePanel    = document.getElementById('sidebar-style-wrap');
const styleHead     = document.getElementById('style-sec-head');
const edgeStyleHead = document.getElementById('edge-style-head');
const edgeStyleWrap = document.getElementById('sidebar-edge-wrap');
const zoomLabel     = document.getElementById('zoom-label');
const ctxMenu       = document.getElementById('ctx-menu');
const shapeGhost    = document.getElementById('shape-ghost');

// ── ViewBox / zoom / pan ──────────────────────────────────────────────────────
function applyVb() {
    archSVG.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
    if (zoomLabel) zoomLabel.textContent = Math.round(VB_W / vbW * 100) + '%';
}

function svgPt(clientX, clientY) {
    const r = archSVG.getBoundingClientRect();
    return [
        vbX + (clientX - r.left) / r.width  * vbW,
        vbY + (clientY - r.top)  / r.height * vbH,
    ];
}

function zoomAt(clientX, clientY, factor) {
    const r  = archSVG.getBoundingClientRect();
    const cx = vbX + (clientX - r.left) / r.width  * vbW;
    const cy = vbY + (clientY - r.top)  / r.height * vbH;
    vbW = Math.max(240, Math.min(VB_W * 6, vbW * factor));
    vbH = vbW * (VB_H / VB_W);
    vbX = cx - (clientX - r.left) / r.width  * vbW;
    vbY = cy - (clientY - r.top)  / r.height * vbH;
    applyVb();
}

function fitView() { vbX = 0; vbY = 0; vbW = VB_W; vbH = VB_H; applyVb(); }

// ── Ghost ─────────────────────────────────────────────────────────────────────
const GHOST_ICONS = {process:'▭',decision:'◇',terminal:'◯',database:'⌗',io:'▱',actor:'⚇',note:'⌐'};
function showGhost(cx, cy, type) {
    shapeGhost.textContent    = GHOST_ICONS[type] || '◻';
    shapeGhost.style.left     = cx + 'px';
    shapeGhost.style.top      = cy + 'px';
    shapeGhost.style.display  = 'block';
}
function hideGhost() { shapeGhost.style.display = 'none'; }
function moveGhost(cx, cy) {
    if (shapeGhost.style.display !== 'none') {
        shapeGhost.style.left = cx + 'px';
        shapeGhost.style.top  = cy + 'px';
    }
}

// ── SVG helpers ───────────────────────────────────────────────────────────────
function svgE(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
}

// ── Connection point ──────────────────────────────────────────────────────────
function connPt(node, tx, ty) {
    const cx = node.x + node.w / 2, cy = node.y + node.h / 2;
    const dx = tx - cx, dy = ty - cy;
    if (!dx && !dy) return [cx, cy];
    if (node.type === 'terminal' || node.type === 'actor') {
        const rx = node.w / 2, ry = node.h / 2;
        const a = Math.atan2(dy * rx, dx * ry);
        return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
    }
    if (node.type === 'decision') {
        const hw = node.w / 2, hh = node.h / 2;
        const t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh + 1e-9);
        return [cx + dx * t, cy + dy * t];
    }
    const hw = node.w / 2, hh = node.h / 2;
    const adx = Math.abs(dx), ady = Math.abs(dy);
    if (adx * hh >= ady * hw) return [cx + Math.sign(dx) * hw, cy + dy * (hw / (adx + 1e-9))];
    return [cx + dx * (hh / (ady + 1e-9)), cy + Math.sign(dy) * hh];
}

// ── Edge path (orthogonal routing) ────────────────────────────────────────────
function buildEdgePath(src, dst) {
    const scx = src.x + src.w / 2, scy = src.y + src.h / 2;
    const dcx = dst.x + dst.w / 2, dcy = dst.y + dst.h / 2;
    const [x1, y1] = connPt(src, dcx, dcy);
    const [x2, y2] = connPt(dst, scx, scy);
    if (Math.abs(x2 - x1) < 8 || Math.abs(y2 - y1) < 8) return `M${x1} ${y1} L${x2} ${y2}`;
    const mx = (x1 + x2) / 2;
    return `M${x1} ${y1} L${mx} ${y1} L${mx} ${y2} L${x2} ${y2}`;
}

// ── Edge style helpers ────────────────────────────────────────────────────────
function edgeDash(edge) {
    switch (edge.style || 'solid') {
        case 'dashed': return '9 5';
        case 'dotted': return '2 5';
        default:       return 'none';
    }
}

function edgeMarkers(edge, isSel) {
    const s     = isSel ? '-sel' : '';
    const arrow = edge.arrow || 'forward';
    const attrs = {};
    if (arrow === 'forward')  { attrs['marker-end']   = `url(#arch-arrow${s})`; }
    if (arrow === 'back')     { attrs['marker-start']  = `url(#arch-arrow-rev${s})`; }
    if (arrow === 'both')     { attrs['marker-end'] = `url(#arch-arrow${s})`; attrs['marker-start'] = `url(#arch-arrow-rev${s})`; }
    if (arrow === 'diamond')  { attrs['marker-end']   = `url(#arch-diamond${s})`; }
    if (arrow === 'circle')   { attrs['marker-end']   = `url(#arch-circle${s})`; }
    // 'none': no markers
    return attrs;
}

// ── Node shape builders ───────────────────────────────────────────────────────
function buildNodeShapes(node, fill, stroke, sw) {
    const {x, y, w, h, type} = node;
    const cx = x + w / 2, cy = y + h / 2;
    const els = [];

    if (type === 'process') {
        els.push(svgE('rect', {x, y, width:w, height:h, rx:4, fill, stroke, 'stroke-width':sw}));
    } else if (type === 'decision') {
        els.push(svgE('polygon', {
            points:`${cx},${y} ${x+w},${cy} ${cx},${y+h} ${x},${cy}`,
            fill, stroke, 'stroke-width':sw,
        }));
    } else if (type === 'terminal') {
        els.push(svgE('ellipse', {cx, cy, rx:w/2, ry:h/2, fill, stroke, 'stroke-width':sw}));
    } else if (type === 'database') {
        const ery = Math.min(10, h / 4);
        els.push(svgE('rect',    {x, y:y+ery, width:w, height:h-ery, fill, stroke, 'stroke-width':sw}));
        els.push(svgE('ellipse', {cx, cy:y+ery, rx:w/2, ry:ery, fill, stroke, 'stroke-width':sw}));
        els.push(svgE('path',    {d:`M${x} ${y+h-ery} A${w/2} ${ery} 0 0 0 ${x+w} ${y+h-ery}`, fill:'none', stroke, 'stroke-width':sw}));
    } else if (type === 'io') {
        const off = Math.min(14, w / 5);
        els.push(svgE('polygon', {
            points:`${x+off},${y} ${x+w},${y} ${x+w-off},${y+h} ${x},${y+h}`,
            fill, stroke, 'stroke-width':sw,
        }));
    } else if (type === 'actor') {
        const hr = Math.min(w * 0.28, h * 0.18, 14);
        const hcy = y + hr + 2, bt = hcy + hr + 3;
        const bh = (h - hr * 2 - 5) * 0.52, bx = cx;
        els.push(svgE('circle', {cx:bx, cy:hcy, r:hr, fill, stroke, 'stroke-width':sw}));
        els.push(svgE('rect',   {x:x+w*0.22, y:bt, width:w*0.56, height:bh, rx:3, fill, stroke, 'stroke-width':sw}));
        els.push(svgE('line',   {x1:x+3, y1:bt+4, x2:x+w-3, y2:bt+4, stroke, 'stroke-width':sw}));
        els.push(svgE('line',   {x1:bx, y1:bt+bh, x2:x+w*0.2, y2:y+h-2, stroke, 'stroke-width':sw}));
        els.push(svgE('line',   {x1:bx, y1:bt+bh, x2:x+w*0.8, y2:y+h-2, stroke, 'stroke-width':sw}));
        els.push(svgE('rect',   {x, y, width:w, height:h, fill:'transparent', stroke:'none'}));
    } else if (type === 'note') {
        const fold = Math.min(16, w / 4, h / 3);
        els.push(svgE('polygon',  {
            points:`${x},${y} ${x+w-fold},${y} ${x+w},${y+fold} ${x+w},${y+h} ${x},${y+h}`,
            fill, stroke, 'stroke-width':sw,
        }));
        els.push(svgE('polyline', {
            points:`${x+w-fold},${y} ${x+w-fold},${y+fold} ${x+w},${y+fold}`,
            fill:'none', stroke, 'stroke-width':sw,
        }));
    }
    return els;
}

// ── Resize handles ────────────────────────────────────────────────────────────
const HANDLE_CURSORS = {nw:'nw-resize',n:'n-resize',ne:'ne-resize',e:'e-resize',
                        se:'se-resize',s:'s-resize',sw:'sw-resize',w:'w-resize'};

function getHandles(node) {
    const {x, y, w, h} = node;
    return [
        {id:'nw',cx:x,    cy:y},    {id:'n',cx:x+w/2,cy:y},    {id:'ne',cx:x+w,cy:y},
        {id:'e', cx:x+w,  cy:y+h/2},{id:'se',cx:x+w, cy:y+h},
        {id:'s', cx:x+w/2,cy:y+h}, {id:'sw',cx:x,    cy:y+h},  {id:'w', cx:x,  cy:y+h/2},
    ];
}

// ── Anchor points for a node ──────────────────────────────────────────────────
function getAnchors(node) {
    return [
        {x:node.x+node.w/2, y:node.y},
        {x:node.x+node.w,   y:node.y+node.h/2},
        {x:node.x+node.w/2, y:node.y+node.h},
        {x:node.x,          y:node.y+node.h/2},
    ];
}

// ── Sidebar sync ──────────────────────────────────────────────────────────────
function syncSidebar() {
    const singleNode = selKind === 'node' && selectedIds.size === 1
        ? nodes.find(n => n.id === [...selectedIds][0]) : null;
    const singleEdge = selKind === 'edge' && selectedIds.size === 1
        ? edges.find(e => e.id === [...selectedIds][0]) : null;

    if (singleNode) {
        sidebarWrap.style.display = 'block';
        sidebarHead.style.display = 'block';
        if (document.activeElement !== sidebarInp) sidebarInp.value = singleNode.label;
        styleHead.style.display  = 'block';
        stylePanel.style.display = 'block';
        edgeStyleHead.style.display = 'none';
        edgeStyleWrap.style.display = 'none';
        const nf = singleNode.fill   || '#1a1a26';
        const ns = singleNode.stroke || '#2563eb';
        document.querySelectorAll('#sidebar-fill-swatches .swatch').forEach(sw =>
            sw.classList.toggle('active', sw.dataset.color === nf));
        document.querySelectorAll('#sidebar-stroke-swatches .swatch').forEach(sw =>
            sw.classList.toggle('active', sw.dataset.color === ns));
    } else if (singleEdge) {
        sidebarWrap.style.display   = 'none';
        sidebarHead.style.display   = 'none';
        styleHead.style.display     = 'none';
        stylePanel.style.display    = 'none';
        edgeStyleHead.style.display = 'block';
        edgeStyleWrap.style.display = 'block';
        const es = singleEdge.style || 'solid';
        const ea = singleEdge.arrow || 'forward';
        document.querySelectorAll('.edge-btn[data-line]').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.line === es));
        document.querySelectorAll('.edge-btn[data-arrow]').forEach(btn =>
            btn.classList.toggle('active', btn.dataset.arrow === ea));
    } else {
        sidebarWrap.style.display   = 'none';
        sidebarHead.style.display   = 'none';
        styleHead.style.display     = 'none';
        stylePanel.style.display    = 'none';
        edgeStyleHead.style.display = 'none';
        edgeStyleWrap.style.display = 'none';
    }
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
    Array.from(archSVG.children).forEach(c => {
        if (c.tagName !== 'defs' && c.id !== 'arch-bg') archSVG.removeChild(c);
    });

    // Marquee
    if (marquee) {
        archSVG.appendChild(svgE('rect', {
            x:Math.min(marquee.x1,marquee.x2), y:Math.min(marquee.y1,marquee.y2),
            width:Math.abs(marquee.x2-marquee.x1), height:Math.abs(marquee.y2-marquee.y1),
            fill:'rgba(37,99,235,0.08)', stroke:'#2563eb',
            'stroke-width':'1', 'stroke-dasharray':'4 3',
        }));
    }

    // Click-and-draw preview
    if (drawing) {
        const px = Math.min(drawing.sx,drawing.ex), py = Math.min(drawing.sy,drawing.ey);
        const pw = Math.max(4,Math.abs(drawing.ex-drawing.sx));
        const ph = Math.max(4,Math.abs(drawing.ey-drawing.sy));
        buildNodeShapes({type:drawing.type,x:px,y:py,w:pw,h:ph}, 'rgba(37,99,235,0.12)', '#2563eb', '1.5')
            .forEach(s => { s.setAttribute('stroke-dasharray','5 3'); archSVG.appendChild(s); });
    }

    // Connect-drag preview line
    if (connectDrag) {
        archSVG.appendChild(svgE('line', {
            x1:connectDrag.x1, y1:connectDrag.y1,
            x2:connectDrag.ex, y2:connectDrag.ey,
            stroke:'#10b981', 'stroke-width':'1.8',
            'stroke-dasharray':'5 3',
            'marker-end':'url(#arch-arrow)',
        }));
    }

    // Edges
    edges.forEach(edge => {
        const src = nodes.find(n => n.id === edge.src);
        const dst = nodes.find(n => n.id === edge.dst);
        if (!src || !dst) return;
        const isSel    = selectedIds.has(edge.id);
        const markers  = edgeMarkers(edge, isSel);
        const path = svgE('path', {
            d:              buildEdgePath(src, dst),
            fill:           'none',
            stroke:         isSel ? '#f59e0b' : '#60a5fa',
            'stroke-width': isSel ? 2.5 : 1.8,
            'stroke-dasharray': edgeDash(edge),
            style:          'cursor:pointer',
            ...markers,
        });
        path.dataset.edgeId = edge.id;
        archSVG.appendChild(path);

        // Wide invisible hit area so the edge is easier to click
        const hitPath = svgE('path', {
            d:              buildEdgePath(src, dst),
            fill:           'none',
            stroke:         'transparent',
            'stroke-width': '10',
            style:          'cursor:pointer',
        });
        hitPath.dataset.edgeId = edge.id;
        archSVG.appendChild(hitPath);

        if (edge.label) {
            const scx = src.x+src.w/2, scy = src.y+src.h/2;
            const dcx = dst.x+dst.w/2, dcy = dst.y+dst.h/2;
            const [x1,y1] = connPt(src,dcx,dcy);
            const [x2,y2] = connPt(dst,scx,scy);
            const lx=(x1+x2)/2, ly=(y1+y2)/2;
            const tw = edge.label.length*7+8;
            archSVG.appendChild(svgE('rect',{x:lx-tw/2,y:ly-9,width:tw,height:14,fill:'#111118',rx:3}));
            const t = svgE('text',{x:lx,y:ly,'text-anchor':'middle','dominant-baseline':'central',
                'font-family':'Courier New,monospace','font-size':'10',fill:'#94a3b8',
                style:'pointer-events:none;user-select:none;'});
            t.textContent = edge.label;
            archSVG.appendChild(t);
        }
    });

    // Nodes
    nodes.forEach(node => {
        const isSel     = selectedIds.has(node.id);
        const isConnSrc = connSrc === node.id;
        const isLast    = lastPlacedId === node.id;
        const fill   = node.fill   || '#1a1a26';
        const stroke = isConnSrc ? '#10b981' : isSel ? '#f59e0b' : isLast ? '#a78bfa' : (node.stroke || '#2563eb');
        const sw     = isSel || isConnSrc || isLast ? '2.5' : '1.8';

        const g = svgE('g', {style:'cursor:grab'});
        g.dataset.nodeId = node.id;

        if (isSel) {
            g.appendChild(svgE('rect',{
                x:node.x-4,y:node.y-4,width:node.w+8,height:node.h+8,
                rx:6,fill:'none',stroke:'#f59e0b','stroke-width':'1',opacity:'0.35',
            }));
        }
        buildNodeShapes(node, fill, stroke, sw).forEach(s => g.appendChild(s));

        const lblY = node.type === 'actor' ? node.y+node.h+10 : node.y+node.h/2;
        const t = svgE('text',{
            x:node.x+node.w/2, y:lblY,
            'text-anchor':'middle','dominant-baseline':'central',
            'font-family':'Courier New,monospace','font-size':'12',fill:'#e2e8f0',
            style:'pointer-events:none;user-select:none;',
        });
        t.textContent = node.label;
        g.appendChild(t);
        archSVG.appendChild(g);
    });

    // Resize handles (single-node selection)
    if (selKind === 'node' && selectedIds.size === 1) {
        const node = nodes.find(n => n.id === [...selectedIds][0]);
        if (node) {
            getHandles(node).forEach(h => {
                const el = svgE('rect',{
                    x:h.cx-4,y:h.cy-4,width:8,height:8,
                    fill:'#09090f',stroke:'#f59e0b','stroke-width':'1.5',rx:1,
                    style:`cursor:${HANDLE_CURSORS[h.id]}`,
                });
                el.dataset.resizeHandle = h.id;
                el.dataset.nodeId = node.id;
                archSVG.appendChild(el);
            });
        }
    }

    // Connection anchors — only shown in connect mode
    const anchorTargets = mode === 'connect' ? nodes : [];

    anchorTargets.forEach(node => {
        getAnchors(node).forEach(a => {
            const isDragSrc = connectDrag?.srcId === node.id;
            const dot = svgE('circle', {
                cx:a.x, cy:a.y, r:6,
                fill:    isDragSrc ? '#f59e0b' : '#10b981',
                stroke:  '#fff', 'stroke-width':'1.5',
                opacity: '0.9',
                style:   'cursor:crosshair',
            });
            dot.dataset.anchorNode = node.id;
            archSVG.appendChild(dot);
        });
    });

    archSVG.className = mode.startsWith('place') ? 'placing'
        : mode === 'connect' ? 'connecting'
        : connectDrag ? 'connecting'
        : dragging ? 'dragging'
        : (spaceDown || panning) ? 'panning' : '';
    syncSidebar();
}

// ── Mode management ───────────────────────────────────────────────────────────
function setMode(m) {
    if (!m.startsWith('place:')) { lastPlacedId = null; hideGhost(); }
    mode = m; connSrc = null;
    document.querySelectorAll('#arch-app .shape-item, #arch-app .arch-btn').forEach(el => el.classList.remove('active'));
    if (m.startsWith('place:')) {
        document.querySelector(`[data-type="${m.slice(6)}"]`)?.classList.add('active');
        statusEl.textContent = `Placing ${m.slice(6)} — drag canvas to draw or click to place. Esc to finish.`;
    } else if (m === 'connect') {
        document.getElementById('btn-connect').classList.add('active');
        statusEl.textContent = 'Click or drag from an anchor point to connect nodes. Esc to cancel.';
    } else {
        statusEl.textContent = 'Click & drag to move · Shift+click multi-select · Scroll to zoom · Use Connect mode to draw edges · Ctrl+C/V/D';
    }
    render();
}

// ── Snapshot / undo / redo ────────────────────────────────────────────────────
function snapshot() {
    _history.push({nodes:nodes.map(n=>({...n})), edges:edges.map(e=>({...e}))});
    if (_history.length > 60) _history.shift();
    _redo = [];
}

function undo() {
    if (!_history.length) { statusEl.textContent='Nothing to undo.'; return; }
    _redo.push({nodes:nodes.map(n=>({...n})), edges:edges.map(e=>({...e}))});
    const p = _history.pop();
    nodes=p.nodes; edges=p.edges;
    selectedIds.clear(); selKind=null; lastPlacedId=null; render();
}

function redo() {
    if (!_redo.length) { statusEl.textContent='Nothing to redo.'; return; }
    _history.push({nodes:nodes.map(n=>({...n})), edges:edges.map(e=>({...e}))});
    const n = _redo.pop();
    nodes=n.nodes; edges=n.edges;
    selectedIds.clear(); selKind=null; render();
}

// ── Finalize placement ────────────────────────────────────────────────────────
function finalizePlace(type, x, y, w, h) {
    snapshot();
    const node = {id:'n'+(nextId++), type, x, y, w, h,
                  label:NODE_LABELS[type], fill:'#1a1a26', stroke:'#2563eb'};
    nodes.push(node);
    if (lastPlacedId && nodes.find(n => n.id === lastPlacedId)) {
        edges.push({id:'e'+(nextId++), src:lastPlacedId, dst:node.id, label:'', style:'solid', arrow:'forward'});
    }
    lastPlacedId = node.id;
    selectedIds  = new Set([node.id]);
    selKind      = 'node';
    mode = 'place:' + type;
    document.querySelector(`[data-type="${type}"]`)?.classList.add('active');
    statusEl.textContent = `${NODE_LABELS[type]} placed. Drag or click to place next. Esc to finish.`;
    render();
    sidebarInp.focus(); sidebarInp.select();
}

// ── Delete ────────────────────────────────────────────────────────────────────
function deleteSelected() {
    if (!selectedIds.size) { statusEl.textContent='Nothing selected.'; return; }
    snapshot();
    if (selKind === 'node') {
        nodes = nodes.filter(n => !selectedIds.has(n.id));
        edges = edges.filter(e => !selectedIds.has(e.src) && !selectedIds.has(e.dst));
    } else {
        edges = edges.filter(e => !selectedIds.has(e.id));
    }
    selectedIds.clear(); selKind=null; render();
}

// ── Copy / paste / select all / duplicate / clear ─────────────────────────────
function copySelected() {
    if (selKind !== 'node' || !selectedIds.size) return;
    const copied = nodes.filter(n => selectedIds.has(n.id));
    const ids    = new Set(copied.map(n => n.id));
    clipboard    = {nodes:copied.map(n=>({...n})), edges:edges.filter(e=>ids.has(e.src)&&ids.has(e.dst)).map(e=>({...e}))};
    statusEl.textContent = `Copied ${copied.length} node(s).`;
}

function pasteClipboard() {
    if (!clipboard?.nodes.length) return;
    snapshot();
    const idMap = {};
    const newNodes = clipboard.nodes.map(n => { const id='n'+(nextId++); idMap[n.id]=id; return {...n,id,x:n.x+20,y:n.y+20}; });
    const newEdges = clipboard.edges.map(e => ({...e,id:'e'+(nextId++),src:idMap[e.src],dst:idMap[e.dst]}));
    nodes.push(...newNodes); edges.push(...newEdges);
    selectedIds=new Set(newNodes.map(n=>n.id)); selKind='node'; render();
}

function selectAll() {
    if (!nodes.length) return;
    selectedIds=new Set(nodes.map(n=>n.id)); selKind='node'; render();
}

function duplicateSelected() { copySelected(); pasteClipboard(); }

function clearAll() {
    if (!nodes.length && !edges.length) return;
    snapshot(); nodes=[]; edges=[];
    selectedIds.clear(); selKind=null; lastPlacedId=null; render();
    statusEl.textContent='Canvas cleared.';
}

// ── Z-order ───────────────────────────────────────────────────────────────────
function bringForward(id) {
    const i = nodes.findIndex(n=>n.id===id);
    if (i < nodes.length-1) { snapshot(); [nodes[i],nodes[i+1]]=[nodes[i+1],nodes[i]]; render(); }
}
function sendBackward(id) {
    const i = nodes.findIndex(n=>n.id===id);
    if (i > 0) { snapshot(); [nodes[i-1],nodes[i]]=[nodes[i],nodes[i-1]]; render(); }
}

// ── Zoom wheel ────────────────────────────────────────────────────────────────
archSVG.addEventListener('wheel', e => {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.12 : 1/1.12);
}, {passive:false});

// ── Hover tracking for anchor display (connect mode only) ─────────────────────
archSVG.addEventListener('mousemove', e => {
    if (mode !== 'connect') return;
    if (connectDrag || drawing || dragging || resizing || panning) return;
    const nodeEl = e.target.closest('[data-node-id]');
    const newHover = nodeEl?.dataset.nodeId || null;
    if (newHover !== hoveredNodeId) { hoveredNodeId = newHover; render(); }
});

archSVG.addEventListener('mouseleave', () => {
    if (hoveredNodeId !== null) { hoveredNodeId = null; render(); }
});

// ── Sidebar drag-to-canvas ────────────────────────────────────────────────────
document.querySelectorAll('#arch-app .shape-item').forEach(item => {
    item.addEventListener('mousedown', e => {
        e.preventDefault();
        const type = item.dataset.type;
        setMode('place:' + type);
        sidebarDrag = type;
        showGhost(e.clientX, e.clientY, type);
    });
});

// ── Canvas mousedown ──────────────────────────────────────────────────────────
archSVG.addEventListener('mousedown', e => {
    if (e.target === labelIn) return;
    commitLabel();

    if (e.button === 1 || (e.button === 0 && spaceDown)) {
        if (e.button === 1) e.preventDefault();
        panning = {startClientX:e.clientX,startClientY:e.clientY,startVbX:vbX,startVbY:vbY};
        return;
    }
    if (e.button !== 0) return;

    // Anchor click/drag → start connect drag (connect mode only)
    if (e.target.dataset.anchorNode && mode === 'connect') {
        const srcId = e.target.dataset.anchorNode;
        const [x1, y1] = svgPt(e.clientX, e.clientY);
        connectDrag = {srcId, x1, y1, ex:x1, ey:y1};
        e.stopPropagation(); return;
    }

    const resizeEl = e.target.closest('[data-resize-handle]');
    const nodeEl   = !resizeEl && e.target.closest('[data-node-id]');
    const edgeEl   = !resizeEl && !nodeEl && e.target.closest('[data-edge-id]');

    if (resizeEl) {
        const node = nodes.find(n => n.id === resizeEl.dataset.nodeId);
        if (!node) return;
        snapshot();
        const [smx,smy] = svgPt(e.clientX, e.clientY);
        resizing = {id:node.id, handle:resizeEl.dataset.resizeHandle,
                    ox:node.x, oy:node.y, ow:node.w, oh:node.h, smx, smy};
        e.stopPropagation(); return;
    }

    if (nodeEl) {
        const id = nodeEl.dataset.nodeId;
        if (mode === 'connect') {
            if (!connSrc) { connSrc=id; statusEl.textContent='Now click the destination node.'; render(); }
            else if (connSrc===id) { connSrc=null; render(); }
            else {
                snapshot();
                edges.push({id:'e'+(nextId++),src:connSrc,dst:id,label:'',style:'solid',arrow:'forward'});
                connSrc=null; statusEl.textContent='Connected. Click another source, or Esc.'; render();
            }
        } else if (!mode.startsWith('place:')) {
            const additive = e.shiftKey || e.ctrlKey || e.metaKey;
            if (!additive && !selectedIds.has(id)) { selectedIds=new Set([id]); selKind='node'; }
            else if (additive) {
                if (selectedIds.has(id)) { selectedIds.delete(id); if (!selectedIds.size) selKind=null; }
                else { selectedIds.add(id); selKind='node'; }
            }
            const [smx,smy] = svgPt(e.clientX, e.clientY);
            snapshot();
            const starts = [...selectedIds].map(sid=>nodes.find(n=>n.id===sid)).filter(Boolean).map(n=>({id:n.id,ox:n.x,oy:n.y}));
            dragging = {starts, smx, smy, moved:false};
            render();
        }
        if (!mode.startsWith('place:')) { e.stopPropagation(); return; }
    }

    if (edgeEl && !mode.startsWith('place:')) {
        selectedIds=new Set([edgeEl.dataset.edgeId]); selKind='edge';
        render(); e.stopPropagation(); return;
    }

    // Place mode: start click-and-draw
    if (mode.startsWith('place:')) {
        sidebarDrag=null; hideGhost();
        const [sx,sy] = svgPt(e.clientX, e.clientY);
        drawing = {type:mode.slice(6), sx, sy, ex:sx, ey:sy};
        return;
    }

    // Background: marquee
    if (!e.shiftKey) { selectedIds.clear(); selKind=null; }
    const [sx,sy] = svgPt(e.clientX, e.clientY);
    marquee = {x1:sx,y1:sy,x2:sx,y2:sy};
    render();
});

// ── Document mousemove ────────────────────────────────────────────────────────
document.addEventListener('mousemove', e => {
    if (mode.startsWith('place:')) moveGhost(e.clientX, e.clientY);

    if (connectDrag) {
        const [mx,my] = svgPt(e.clientX, e.clientY);
        connectDrag.ex=mx; connectDrag.ey=my;
        // Highlight target node on hover during drag
        const nodeEl = e.target.closest('[data-node-id]');
        const hov = nodeEl?.dataset.nodeId || null;
        if (hov !== hoveredNodeId) hoveredNodeId = hov;
        render(); return;
    }

    if (panning) {
        const r = archSVG.getBoundingClientRect();
        vbX = panning.startVbX-(e.clientX-panning.startClientX)*(vbW/r.width);
        vbY = panning.startVbY-(e.clientY-panning.startClientY)*(vbH/r.height);
        applyVb(); return;
    }

    if (resizing) {
        const [mx,my] = svgPt(e.clientX, e.clientY);
        const dx=mx-resizing.smx, dy=my-resizing.smy;
        const node=nodes.find(n=>n.id===resizing.id);
        if (!node) return;
        const {handle,ox,oy,ow,oh} = resizing;
        let nx=ox,ny=oy,nw=ow,nh=oh;
        if (handle.includes('e')) nw=Math.max(MIN_W,ow+dx);
        if (handle.includes('s')) nh=Math.max(MIN_H,oh+dy);
        if (handle.includes('w')) { nw=Math.max(MIN_W,ow-dx); if(nw>MIN_W) nx=ox+dx; }
        if (handle.includes('n')) { nh=Math.max(MIN_H,oh-dy); if(nh>MIN_H) ny=oy+dy; }
        node.x=nx; node.y=ny; node.w=nw; node.h=nh;
        render(); return;
    }

    if (drawing) {
        const [mx,my] = svgPt(e.clientX, e.clientY);
        drawing.ex=mx; drawing.ey=my;
        render(); return;
    }

    if (dragging) {
        const [mx,my] = svgPt(e.clientX, e.clientY);
        const ddx=mx-dragging.smx, ddy=my-dragging.smy;
        dragging.starts.forEach(s => {
            const n=nodes.find(n=>n.id===s.id);
            if(n) { n.x=s.ox+ddx; n.y=s.oy+ddy; }
        });
        dragging.moved=true; render(); return;
    }

    if (marquee) {
        const [mx,my] = svgPt(e.clientX, e.clientY);
        marquee.x2=mx; marquee.y2=my; render();
    }
});

// ── Document mouseup ──────────────────────────────────────────────────────────
document.addEventListener('mouseup', e => {
    // Finalize a drag-to-connect
    if (connectDrag) {
        const [ex,ey] = svgPt(e.clientX, e.clientY);
        const dstNode = nodes.find(n =>
            ex>=n.x && ex<=n.x+n.w && ey>=n.y && ey<=n.y+n.h && n.id!==connectDrag.srcId);
        if (dstNode) {
            snapshot();
            edges.push({id:'e'+(nextId++),src:connectDrag.srcId,dst:dstNode.id,label:'',style:'solid',arrow:'forward'});
        }
        connectDrag=null; hoveredNodeId=null; render(); return;
    }

    // Sidebar drag dropped on canvas
    if (sidebarDrag) {
        hideGhost();
        const r = archSVG.getBoundingClientRect();
        const overCanvas = e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom;
        if (overCanvas) {
            const type=sidebarDrag; sidebarDrag=null;
            const [sx,sy] = svgPt(e.clientX, e.clientY);
            const {w,h}   = NODE_DIMS[type];
            finalizePlace(type, sx-w/2, sy-h/2, w, h);
            showGhost(e.clientX, e.clientY, type);
        } else {
            sidebarDrag=null;
        }
        return;
    }

    if (panning) { panning=null; render(); return; }
    if (resizing) { resizing=null; render(); return; }

    if (drawing) {
        const {type,sx,sy,ex,ey} = drawing; drawing=null;
        const dx=Math.abs(ex-sx), dy=Math.abs(ey-sy);
        if (dx<6 && dy<6) {
            const {w,h}=NODE_DIMS[type];
            finalizePlace(type, sx-w/2, sy-h/2, w, h);
        } else {
            finalizePlace(type, Math.min(sx,ex), Math.min(sy,ey), Math.max(MIN_W,dx), Math.max(MIN_H,dy));
        }
        showGhost(e.clientX, e.clientY, type);
        return;
    }

    if (dragging) {
        if (!dragging.moved) _history.pop();
        dragging=null; render(); return;
    }

    if (marquee) {
        const mx1=Math.min(marquee.x1,marquee.x2), my1=Math.min(marquee.y1,marquee.y2);
        const mx2=Math.max(marquee.x1,marquee.x2), my2=Math.max(marquee.y1,marquee.y2);
        if (mx2-mx1>4||my2-my1>4) {
            nodes.filter(n=>n.x<mx2&&n.x+n.w>mx1&&n.y<my2&&n.y+n.h>my1)
                .forEach(n=>{selectedIds.add(n.id); selKind='node';});
        }
        marquee=null; render();
    }
});

// ── Double-click: label editing ───────────────────────────────────────────────
archSVG.addEventListener('dblclick', e => {
    const nodeEl = e.target.closest('[data-node-id]');
    const edgeEl = !nodeEl && e.target.closest('[data-edge-id]');
    if (nodeEl) {
        const node=nodes.find(n=>n.id===nodeEl.dataset.nodeId);
        if (node) startNodeEdit(node);
    } else if (edgeEl) {
        const edge=edges.find(ed=>ed.id===edgeEl.dataset.edgeId);
        if (edge) startEdgeEdit(edge);
    }
});

function startNodeEdit(node) {
    const r=archSVG.getBoundingClientRect();
    const sx=r.left+(node.x+node.w/2-vbX)/vbW*r.width;
    const sy=r.top +(node.y+node.h/2-vbY)/vbH*r.height;
    labelIn.dataset.nodeId=node.id; labelIn.dataset.edgeId='';
    labelIn.value=node.label;
    labelIn.style.left=sx+'px'; labelIn.style.top=sy+'px';
    labelIn.style.width=Math.max(80,node.w/vbW*r.width-16)+'px';
    labelIn.style.display='block';
    labelIn.focus(); labelIn.select();
}

function startEdgeEdit(edge) {
    const src=nodes.find(n=>n.id===edge.src), dst=nodes.find(n=>n.id===edge.dst);
    if (!src||!dst) return;
    const [x1,y1]=connPt(src,dst.x+dst.w/2,dst.y+dst.h/2);
    const [x2,y2]=connPt(dst,src.x+src.w/2,src.y+src.h/2);
    const r=archSVG.getBoundingClientRect();
    const sx=r.left+((x1+x2)/2-vbX)/vbW*r.width;
    const sy=r.top +((y1+y2)/2-vbY)/vbH*r.height;
    labelIn.dataset.nodeId=''; labelIn.dataset.edgeId=edge.id;
    labelIn.value=edge.label||'';
    labelIn.style.left=sx+'px'; labelIn.style.top=sy+'px';
    labelIn.style.width='100px'; labelIn.style.display='block';
    labelIn.focus(); labelIn.select();
}

function commitLabel() {
    if (labelIn.style.display==='none') return;
    const nid=labelIn.dataset.nodeId, eid=labelIn.dataset.edgeId;
    if (nid) {
        const node=nodes.find(n=>n.id===nid);
        if(node){snapshot(); node.label=labelIn.value.trim()||node.label; render();}
    } else if (eid) {
        const edge=edges.find(e=>e.id===eid);
        if(edge){snapshot(); edge.label=labelIn.value.trim(); render();}
    }
    labelIn.style.display='none';
}

labelIn.addEventListener('keydown', e => {
    if (e.key==='Enter'){e.preventDefault();commitLabel();}
    if (e.key==='Escape') labelIn.style.display='none';
});
labelIn.addEventListener('blur', commitLabel);

// ── Sidebar label input ───────────────────────────────────────────────────────
sidebarInp.addEventListener('input', () => {
    if (selKind!=='node'||selectedIds.size!==1) return;
    const node=nodes.find(n=>n.id===[...selectedIds][0]);
    if(node){node.label=sidebarInp.value; render();}
});
sidebarInp.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key==='Enter'){snapshot(); sidebarInp.blur(); archSVG.focus();}
});

// ── Edge style buttons ────────────────────────────────────────────────────────
document.querySelectorAll('.edge-btn[data-line]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (selKind !== 'edge') return;
        snapshot();
        [...selectedIds].forEach(id => { const e=edges.find(e=>e.id===id); if(e) e.style=btn.dataset.line; });
        render();
    });
});

document.querySelectorAll('.edge-btn[data-arrow]').forEach(btn => {
    btn.addEventListener('click', () => {
        if (selKind !== 'edge') return;
        snapshot();
        [...selectedIds].forEach(id => { const e=edges.find(e=>e.id===id); if(e) e.arrow=btn.dataset.arrow; });
        render();
    });
});

// ── Context menu ──────────────────────────────────────────────────────────────
function showCtx(x, y, items) {
    ctxMenu.innerHTML='';
    items.forEach(item => {
        if (item==='-') { ctxMenu.appendChild(Object.assign(document.createElement('div'),{className:'ctx-sep'})); return; }
        const el=Object.assign(document.createElement('div'),{className:'ctx-item',textContent:item.label});
        el.addEventListener('mousedown',ev=>ev.stopPropagation());
        el.addEventListener('click',()=>{hideCtx();item.action();});
        ctxMenu.appendChild(el);
    });
    ctxMenu.style.left=x+'px'; ctxMenu.style.top=y+'px'; ctxMenu.style.display='block';
}
function hideCtx() { ctxMenu.style.display='none'; }

archSVG.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (e.target.closest('[data-resize-handle]')) return;
    const nodeEl=e.target.closest('[data-node-id]');
    const edgeEl=!nodeEl&&e.target.closest('[data-edge-id]');
    if (nodeEl) {
        const id=nodeEl.dataset.nodeId;
        if(!selectedIds.has(id)){selectedIds=new Set([id]);selKind='node';render();}
        showCtx(e.clientX,e.clientY,[
            {label:'✕  Delete',        action:deleteSelected},
            {label:'⧉  Duplicate',     action:duplicateSelected},'-',
            {label:'↑  Bring Forward', action:()=>bringForward(id)},
            {label:'↓  Send Backward', action:()=>sendBackward(id)},
        ]);
    } else if (edgeEl) {
        const id=edgeEl.dataset.edgeId;
        selectedIds=new Set([id]); selKind='edge'; render();
        showCtx(e.clientX,e.clientY,[
            {label:'✕  Delete',     action:deleteSelected},
            {label:'✏  Edit Label', action:()=>{const edge=edges.find(ed=>ed.id===id); if(edge)startEdgeEdit(edge);}},
        ]);
    } else {
        showCtx(e.clientX,e.clientY,[
            {label:'⧉  Paste',      action:pasteClipboard},
            {label:'⊡  Select All', action:selectAll},'-',
            {label:'⊘  Clear All',  action:clearAll},
            {label:'⊡  Fit View',   action:fitView},
        ]);
    }
});
document.addEventListener('click',()=>hideCtx());

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
    const active=document.activeElement;
    const inInput=active===labelIn||active===sidebarInp||active.tagName==='INPUT'||active.tagName==='TEXTAREA';
    if (e.key===' '&&!inInput) { e.preventDefault(); spaceDown=true; if(!panning)archSVG.classList.add('panning'); return; }
    if (inInput) return;
    if (e.key==='Escape') { setMode('select'); return; }
    if (e.ctrlKey||e.metaKey) {
        switch(e.key.toLowerCase()) {
            case 'z': e.preventDefault(); e.shiftKey?redo():undo(); return;
            case 'y': e.preventDefault(); redo(); return;
            case 'c': e.preventDefault(); copySelected(); return;
            case 'v': e.preventDefault(); pasteClipboard(); return;
            case 'a': e.preventDefault(); selectAll(); return;
            case 'd': e.preventDefault(); duplicateSelected(); return;
        }
    }
    if (e.key==='F2'&&selKind==='node'&&selectedIds.size===1) {
        const node=nodes.find(n=>n.id===[...selectedIds][0]);
        if(node){e.preventDefault();startNodeEdit(node);} return;
    }
    if (e.key==='Delete'||e.key==='Backspace'){e.preventDefault();deleteSelected();return;}
    if (e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&selKind==='node'&&selectedIds.size===1) sidebarInp.focus();
});
document.addEventListener('keyup', e => {
    if (e.key===' ') { spaceDown=false; if(!panning) archSVG.classList.remove('panning'); }
});

// ── Toolbar buttons ───────────────────────────────────────────────────────────
document.getElementById('btn-connect').addEventListener('click', ()=>setMode(mode==='connect'?'select':'connect'));
document.getElementById('btn-delete').addEventListener('click', deleteSelected);
document.getElementById('btn-undo').addEventListener('click', undo);
document.getElementById('btn-redo').addEventListener('click', redo);
document.getElementById('btn-clear').addEventListener('click', clearAll);
document.getElementById('btn-fit').addEventListener('click', fitView);

// ── Node style swatches ───────────────────────────────────────────────────────
document.querySelectorAll('#sidebar-fill-swatches .swatch').forEach(sw => {
    sw.addEventListener('click', () => {
        if (selKind!=='node') return; snapshot();
        [...selectedIds].forEach(id=>{const n=nodes.find(n=>n.id===id);if(n)n.fill=sw.dataset.color;}); render();
    });
});
document.querySelectorAll('#sidebar-stroke-swatches .swatch').forEach(sw => {
    sw.addEventListener('click', () => {
        if (selKind!=='node') return; snapshot();
        [...selectedIds].forEach(id=>{const n=nodes.find(n=>n.id===id);if(n)n.stroke=sw.dataset.color;}); render();
    });
});

// ── Export ────────────────────────────────────────────────────────────────────
function exportSVG() {
    const clone=archSVG.cloneNode(true);
    clone.setAttribute('xmlns',SVG_NS); clone.setAttribute('viewBox',`0 0 ${VB_W} ${VB_H}`);
    const style=svgE('style'); style.textContent='text{font-family:"Courier New",monospace;}';
    clone.insertBefore(style,clone.firstChild);
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
    Object.assign(document.createElement('a'),{download:'diagram.svg',href:url}).click();
    URL.revokeObjectURL(url);
}

function exportPNG() {
    const saved=[vbX,vbY,vbW,vbH];
    vbX=0;vbY=0;vbW=VB_W;vbH=VB_H;applyVb();render();
    const clone=archSVG.cloneNode(true);
    clone.setAttribute('xmlns',SVG_NS);
    const bg=clone.querySelector('#arch-bg'); if(bg)bg.setAttribute('fill','#09090f');
    const pat=clone.querySelector('#arch-dots'); if(pat)pat.parentNode.removeChild(pat);
    [vbX,vbY,vbW,vbH]=saved;applyVb();render();
    const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml;charset=utf-8'}));
    const img=new Image();
    img.onload=()=>{
        const canvas=document.createElement('canvas');
        canvas.width=VB_W*2;canvas.height=VB_H*2;
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#09090f';ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        URL.revokeObjectURL(url);
        Object.assign(document.createElement('a'),{download:'diagram.png',href:canvas.toDataURL('image/png')}).click();
    };
    img.onerror=()=>{URL.revokeObjectURL(url);exportSVG();statusEl.textContent='PNG failed — SVG downloaded instead.';};
    img.src=url;
}

document.getElementById('btn-export-svg').addEventListener('click', exportSVG);
document.getElementById('btn-export-png').addEventListener('click', exportPNG);

// ─── Init ──────────────────────────────────────────────────────────────────────
render();
