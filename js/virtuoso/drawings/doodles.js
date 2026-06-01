'use strict';

// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
const CANVAS_W = 800, CANVAS_H = 600;

let tool       = 'pencil';
let primaryCol = '#000000';    // left-click color
let secondCol  = '#ffffff';    // right-click color
let brushSz    = 6;
let brushHard  = 100;          // 0–100 hardness
let fillShapes = false;
let isDrawing  = false;
let startX = 0, startY = 0;
let startSnap  = null;
let zoomLevel  = 1.0;
let activeRight = false;       // drawing with right button

// Selection rect {x,y,w,h} or null
let sel = null;
let selMoving = false;
let selSnap = null;
let selMoveOrigin = null;

// Clipboard
let clipboard = null;

// Text tool
let textInput = null;

// Zoom tool
let lastZoomDir = 1;

// Pan tool
let panStart = null, panScrollStart = null;

const ZOOM_STEPS = [0.1, 0.15, 0.2, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 6, 8];

// ═══════════════════════════════════════════════════════════
//  CANVAS ELEMENTS
// ═══════════════════════════════════════════════════════════
const checkerCanvas  = document.getElementById('canvas-checker');
const selOverlay     = document.getElementById('sel-overlay');
const overlayCanvas  = document.getElementById('overlay-canvas');
const wrap           = document.getElementById('canvas-wrap');

let displayCanvas = document.getElementById('main-canvas');
let displayCtx    = displayCanvas.getContext('2d');

// ═══════════════════════════════════════════════════════════
//  LAYERS
// ═══════════════════════════════════════════════════════════
let layers = [];
let activeLayerIdx = 0;

function makeLayer(name) {
    const c = document.createElement('canvas');
    c.width  = CANVAS_W;
    c.height = CANVAS_H;
    const ctx = c.getContext('2d');
    return { canvas: c, ctx, name, opacity: 100, visible: true };
}

function initLayers() {
    layers = [makeLayer('Background')];
    activeLayerIdx = 0;
    const ctx = layers[0].ctx;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    composite();
    renderLayerPanel();
}

function composite() {
    displayCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    for (const l of layers) {
        if (!l.visible) continue;
        displayCtx.globalAlpha = l.opacity / 100;
        displayCtx.drawImage(l.canvas, 0, 0);
    }
    displayCtx.globalAlpha = 1;
}

function activeCtx() { return layers[activeLayerIdx].ctx; }

// ═══════════════════════════════════════════════════════════
//  CANVAS SIZING
// ═══════════════════════════════════════════════════════════
function initCanvases(w, h) {
    [checkerCanvas, displayCanvas, selOverlay, overlayCanvas].forEach(c => {
        c.width = w; c.height = h;
    });
    drawChecker(checkerCanvas.getContext('2d'), w, h);
    document.getElementById('status-size').textContent = `${w} × ${h} px`;
    applyZoom();
}

function drawChecker(ctx, w, h) {
    const sz = 8;
    for (let y = 0; y < h; y += sz) {
        for (let x = 0; x < w; x += sz) {
            ctx.fillStyle = ((x/sz + y/sz) % 2 === 0) ? '#aaaaaa' : '#888888';
            ctx.fillRect(x, y, sz, sz);
        }
    }
}

function applyZoom() {
    wrap.style.transform = `scale(${zoomLevel})`;
    const w = displayCanvas.width * zoomLevel;
    const h = displayCanvas.height * zoomLevel;
    wrap.style.width  = displayCanvas.width  + 'px';
    wrap.style.height = displayCanvas.height + 'px';
    // The outer margin of the wrap div gives space around the canvas
    const vp = document.getElementById('pdn-viewport');
    // Set minimum viewport inner size so scroll appears
    wrap.parentElement && (wrap.style.marginBottom = Math.max(20, (vp.clientHeight - h) / 2) + 'px');
    document.getElementById('status-zoom').textContent = Math.round(zoomLevel * 100) + '%';
}

// ═══════════════════════════════════════════════════════════
//  HISTORY
// ═══════════════════════════════════════════════════════════
const MAX_HISTORY = 50;
let _history     = [];  // [{label, layerIdx, snap: ImageData[]}]
let historyPos  = -1;  // points to current state

function historySnapshot(label) {
    // Truncate future
    _history = _history.slice(0, historyPos + 1);
    const snaps = layers.map(l => l.ctx.getImageData(0, 0, l.canvas.width, l.canvas.height));
    _history.push({ label, layerIdx: activeLayerIdx, snaps });
    if (_history.length > MAX_HISTORY) _history.shift();
    historyPos = _history.length - 1;
    renderHistoryPanel();
    updateMenuStates();
}

function undo() {
    if (historyPos <= 0) return;
    historyPos--;
    restoreHistory(historyPos);
}

function redo() {
    if (historyPos >= _history.length - 1) return;
    historyPos++;
    restoreHistory(historyPos);
}

function restoreHistory(idx) {
    const entry = _history[idx];
    // Rebuild layers to match snapshot count
    while (layers.length < entry.snaps.length) layers.push(makeLayer('Layer ' + layers.length));
    while (layers.length > entry.snaps.length) layers.pop();
    entry.snaps.forEach((snap, i) => layers[i].ctx.putImageData(snap, 0, 0));
    activeLayerIdx = Math.min(entry.layerIdx, layers.length - 1);
    composite();
    renderLayerPanel();
    renderHistoryPanel();
    updateMenuStates();
}

function updateMenuStates() {
    const canUndo = historyPos > 0;
    const canRedo = historyPos < _history.length - 1;
    document.getElementById('mi-undo').classList.toggle('disabled', !canUndo);
    document.getElementById('mi-redo').classList.toggle('disabled', !canRedo);
}

// ═══════════════════════════════════════════════════════════
//  COORDINATE HELPERS
// ═══════════════════════════════════════════════════════════
function getPos(e) {
    const rect = overlayCanvas.getBoundingClientRect();
    return {
        x: Math.round((e.clientX - rect.left) / zoomLevel),
        y: Math.round((e.clientY - rect.top)  / zoomLevel),
    };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ═══════════════════════════════════════════════════════════
//  COLOUR HELPERS
// ═══════════════════════════════════════════════════════════
function hexToRgba(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 255 };
}

function rgbaToHex(r, g, b) {
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function colorWithAlpha(hex, alpha) {
    const { r, g, b } = hexToRgba(hex);
    return `rgba(${r},${g},${b},${alpha / 255})`;
}

function currentColor() { return activeRight ? secondCol : primaryCol; }

// ═══════════════════════════════════════════════════════════
//  DRAWING PRIMITIVES
// ═══════════════════════════════════════════════════════════
function applyBrushStyle(ctx, col) {
    const a = parseInt(document.getElementById('num-a').value, 10);
    ctx.globalAlpha = a / 255;
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = col;
    ctx.fillStyle   = col;
    ctx.lineWidth   = brushSz;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
}

function applyEraseStyle(ctx) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = brushSz;
    ctx.lineCap   = 'round';
    ctx.lineJoin  = 'round';
}

function resetCtxState(ctx) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
}

function drawShape(ctx, sx, sy, ex, ey, col) {
    applyBrushStyle(ctx, col);
    ctx.beginPath();
    if (tool === 'line') {
        ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    } else if (tool === 'rect') {
        if (fillShapes) ctx.fillRect(sx, sy, ex-sx, ey-sy);
        ctx.strokeRect(sx, sy, ex-sx, ey-sy);
    } else if (tool === 'ellipse') {
        const rx = (ex-sx)/2, ry = (ey-sy)/2;
        ctx.ellipse(sx+rx, sy+ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI*2);
        if (fillShapes) ctx.fill();
        ctx.stroke();
    } else if (tool === 'rrect') {
        const r = Math.min(Math.abs(ex-sx), Math.abs(ey-sy)) * 0.18;
        ctx.roundRect(sx, sy, ex-sx, ey-sy, r);
        if (fillShapes) ctx.fill();
        ctx.stroke();
    } else if (tool === 'triangle') {
        ctx.moveTo((sx+ex)/2, sy); ctx.lineTo(ex, ey); ctx.lineTo(sx, ey); ctx.closePath();
        if (fillShapes) ctx.fill();
        ctx.stroke();
    }
    resetCtxState(ctx);
}

// ═══════════════════════════════════════════════════════════
//  FLOOD FILL
// ═══════════════════════════════════════════════════════════
function floodFill(ctx, startX, startY, fillHex) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const img   = ctx.getImageData(0, 0, w, h);
    const data  = img.data;
    const idx   = (startY * w + startX) * 4;
    const tr = data[idx], tg = data[idx+1], tb = data[idx+2], ta = data[idx+3];
    const { r: fr, g: fg, b: fb } = hexToRgba(fillHex);
    const fa = parseInt(document.getElementById('num-a').value, 10);

    if (tr === fr && tg === fg && tb === fb && ta === fa) return;

    const tolerance = 32;
    function matches(i) {
        return Math.abs(data[i]-tr) + Math.abs(data[i+1]-tg) + Math.abs(data[i+2]-tb) + Math.abs(data[i+3]-ta) <= tolerance * 4;
    }

    const visited = new Uint8Array(w * h);
    const stack = [startX + startY * w];
    visited[startX + startY * w] = 1;

    while (stack.length) {
        const p = stack.pop();
        const px = p % w, py = Math.floor(p / w);
        const i = p * 4;
        data[i] = fr; data[i+1] = fg; data[i+2] = fb; data[i+3] = fa;

        const neighbors = [px-1+py*w, px+1+py*w, px+(py-1)*w, px+(py+1)*w];
        const check     = [px>0,       px<w-1,     py>0,         py<h-1];
        for (let n = 0; n < 4; n++) {
            if (check[n] && !visited[neighbors[n]] && matches(neighbors[n]*4)) {
                visited[neighbors[n]] = 1;
                stack.push(neighbors[n]);
            }
        }
    }
    ctx.putImageData(img, 0, 0);
}

// ═══════════════════════════════════════════════════════════
//  POINTER EVENTS
// ═══════════════════════════════════════════════════════════
const ov = overlayCanvas;
const ovCtx = ov.getContext('2d');

ov.addEventListener('pointerdown',   onDown);
ov.addEventListener('pointermove',   onMove);
ov.addEventListener('pointerup',     onUp);
ov.addEventListener('pointercancel', onUp);
ov.addEventListener('contextmenu',   e => e.preventDefault());

function onDown(e) {
    e.preventDefault();
    if (e.button === 1) return; // middle button pan handled separately
    ov.setPointerCapture(e.pointerId);
    activeRight = e.button === 2;
    const { x, y } = getPos(e);
    const col = currentColor();

    if (tool === 'zoom') {
        const dir = activeRight ? -1 : 1;
        doZoom(dir, e.clientX, e.clientY);
        return;
    }
    if (tool === 'pan') {
        panStart = { x: e.clientX, y: e.clientY };
        const vp = document.getElementById('pdn-viewport');
        panScrollStart = { x: vp.scrollLeft, y: vp.scrollTop };
        ov.style.cursor = 'grabbing';
        return;
    }
    if (tool === 'picker') {
        pickColor(x, y, activeRight);
        return;
    }
    if (tool === 'fill') {
        historySnapshot('Fill');
        floodFill(activeCtx(), clamp(x,0,CANVAS_W-1), clamp(y,0,CANVAS_H-1), col);
        composite();
        return;
    }
    if (tool === 'text') {
        placeTextInput(x, y, col);
        return;
    }
    if (tool === 'select') {
        // If click inside existing selection, start move
        if (sel && x >= sel.x && x <= sel.x+sel.w && y >= sel.y && y <= sel.y+sel.h) {
            selMoving = true;
            selMoveOrigin = { mx: x, my: y, sx: sel.x, sy: sel.y };
            selSnap = activeCtx().getImageData(0, 0, CANVAS_W, CANVAS_H);
        } else {
            sel = null; selMoving = false;
            isDrawing = true;
            startX = x; startY = y;
        }
        drawSelOverlay();
        return;
    }

    isDrawing = true;
    startX = x; startY = y;
    startSnap = activeCtx().getImageData(0, 0, CANVAS_W, CANVAS_H);

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
        historySnapshot(tool === 'eraser' ? 'Erase' : 'Paint');
        const ctx = activeCtx();
        if (tool === 'eraser') applyEraseStyle(ctx);
        else applyBrushStyle(ctx, col);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x+0.1, y);
        ctx.stroke();
        resetCtxState(ctx);
        composite();
    }
}

function onMove(e) {
    e.preventDefault();
    const { x, y } = getPos(e);
    updateStatusBar(x, y);

    if (tool === 'pan' && panStart) {
        const vp = document.getElementById('pdn-viewport');
        vp.scrollLeft = panScrollStart.x - (e.clientX - panStart.x);
        vp.scrollTop  = panScrollStart.y - (e.clientY - panStart.y);
        return;
    }
    if (!isDrawing && !selMoving) return;

    const col = currentColor();

    if (tool === 'select') {
        if (selMoving) {
            const dx = x - selMoveOrigin.mx, dy = y - selMoveOrigin.my;
            // Move selection pixels
            activeCtx().putImageData(selSnap, 0, 0);
            const tmp = document.createElement('canvas');
            tmp.width = CANVAS_W; tmp.height = CANVAS_H;
            const tCtx = tmp.getContext('2d');
            tCtx.drawImage(activeCtx().canvas, 0, 0);
            // Clear original and paste at new position
            const ctx = activeCtx();
            ctx.putImageData(selSnap, 0, 0);
            ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
            ctx.drawImage(tmp, sel.x, sel.y, sel.w, sel.h,
                          sel.x+dx, sel.y+dy, sel.w, sel.h);
            composite();
            sel = { x: sel.x+dx, y: sel.y+dy, w: sel.w, h: sel.h };
            sel.x = clamp(sel.x, 0, CANVAS_W); sel.y = clamp(sel.y, 0, CANVAS_H);
            selMoveOrigin = { mx: x, my: y, sx: sel.x, sy: sel.y };
            selSnap = activeCtx().getImageData(0, 0, CANVAS_W, CANVAS_H);
        } else {
            sel = { x: Math.min(startX, x), y: Math.min(startY, y),
                    w: Math.abs(x-startX), h: Math.abs(y-startY) };
        }
        drawSelOverlay();
        return;
    }

    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
        const ctx = activeCtx();
        if (tool === 'eraser') applyEraseStyle(ctx);
        else applyBrushStyle(ctx, col);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
        resetCtxState(ctx);
        composite();
        return;
    }

    // Shape preview on overlay
    ovCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawShape(ovCtx, startX, startY, x, y, col);
}

function onUp(e) {
    const { x, y } = getPos(e);
    const col = currentColor();

    if (tool === 'pan') {
        panStart = null;
        ov.style.cursor = 'grab';
        return;
    }
    if (tool === 'select') {
        if (!selMoving && isDrawing) {
            sel = { x: Math.min(startX,x), y: Math.min(startY,y),
                    w: Math.abs(x-startX),  h: Math.abs(y-startY) };
            if (sel.w < 2 && sel.h < 2) sel = null;
        }
        selMoving = false;
        isDrawing = false;
        drawSelOverlay();
        return;
    }

    if (isDrawing && ['line','rect','ellipse','rrect','triangle'].includes(tool)) {
        activeCtx().putImageData(startSnap, 0, 0);
        historySnapshot(tool.charAt(0).toUpperCase() + tool.slice(1));
        drawShape(activeCtx(), startX, startY, x, y, col);
        composite();
    }

    ovCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    isDrawing = false;
    activeRight = false;
    if (tool !== 'pencil' && tool !== 'brush' && tool !== 'eraser') {
        resetCtxState(activeCtx());
    }
}

// ═══════════════════════════════════════════════════════════
//  SELECTION OVERLAY
// ═══════════════════════════════════════════════════════════
let selDashOffset = 0;
let selAnimId = null;

function drawSelOverlay() {
    const ctx = selOverlay.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (!sel || sel.w < 1 || sel.h < 1) return;
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1;
    ctx.setLineDash([5, 5]);
    ctx.lineDashOffset = -selDashOffset;
    ctx.strokeRect(sel.x + 0.5, sel.y + 0.5, sel.w, sel.h);
    ctx.strokeStyle = '#000';
    ctx.lineDashOffset = -(selDashOffset + 5);
    ctx.strokeRect(sel.x + 0.5, sel.y + 0.5, sel.w, sel.h);
    ctx.restore();
}

function animateSel() {
    selDashOffset = (selDashOffset + 0.5) % 10;
    drawSelOverlay();
    selAnimId = requestAnimationFrame(animateSel);
}
animateSel();

// ═══════════════════════════════════════════════════════════
//  COLOUR PICKER TOOL
// ═══════════════════════════════════════════════════════════
function pickColor(x, y, asSecondary) {
    const px = displayCtx.getImageData(clamp(x,0,CANVAS_W-1), clamp(y,0,CANVAS_H-1), 1, 1).data;
    const hex = rgbaToHex(px[0], px[1], px[2]);
    if (asSecondary) setSecondaryColor(hex);
    else setPrimaryColor(hex);
}

// ═══════════════════════════════════════════════════════════
//  TEXT TOOL
// ═══════════════════════════════════════════════════════════
function placeTextInput(x, y, col) {
    if (textInput) commitText();
    const fontSz = parseInt(document.getElementById('opt-text-size')?.value || '24', 10);
    const fontFam = document.getElementById('opt-text-font')?.value || 'Arial';
    const bold    = document.getElementById('opt-text-bold')?.checked ? 'bold ' : '';
    const italic  = document.getElementById('opt-text-italic')?.checked ? 'italic ' : '';

    const inp = document.createElement('textarea');
    inp.id = 'text-inp-overlay';
    inp.rows = 1;
    Object.assign(inp.style, {
        position: 'absolute',
        left: (x * zoomLevel) + 'px',
        top:  (y * zoomLevel) + 'px',
        background: 'transparent',
        border: '1px dashed #0078d4',
        color: col,
        font: `${italic}${bold}${fontSz}px ${fontFam}`,
        outline: 'none',
        resize: 'none',
        overflow: 'hidden',
        minWidth: '120px',
        minHeight: fontSz + 'px',
        padding: '2px',
        zIndex: '100',
        lineHeight: '1.2',
    });
    inp.addEventListener('keydown', e => {
        if (e.key === 'Escape') { removeTextInput(); return; }
        if (e.key === 'Enter' && !e.shiftKey) { commitText(); e.preventDefault(); }
    });
    wrap.appendChild(inp);
    inp.focus();
    textInput = { el: inp, x, y, col, fontSz, fontFam, bold: bold.trim(), italic: italic.trim() };
}

function commitText() {
    if (!textInput) return;
    const { el, x, y, col, fontSz, fontFam, bold, italic } = textInput;
    const text = el.value.trim();
    if (text) {
        historySnapshot('Text');
        const ctx = activeCtx();
        ctx.globalAlpha = parseInt(document.getElementById('num-a').value, 10) / 255;
        ctx.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${fontSz}px ${fontFam}`;
        ctx.fillStyle = col;
        ctx.textBaseline = 'top';
        text.split('\n').forEach((line, i) => ctx.fillText(line, x, y + i * fontSz * 1.2));
        ctx.globalAlpha = 1;
        composite();
    }
    removeTextInput();
}

function removeTextInput() {
    if (textInput) { textInput.el.remove(); textInput = null; }
}

// ═══════════════════════════════════════════════════════════
//  ZOOM
// ═══════════════════════════════════════════════════════════
function doZoom(dir, clientX, clientY) {
    const vp = document.getElementById('pdn-viewport');
    const rect = vp.getBoundingClientRect();
    const cx = clientX - rect.left, cy = clientY - rect.top;
    const oldZ = zoomLevel;

    let idx = ZOOM_STEPS.indexOf(zoomLevel);
    if (idx === -1) idx = ZOOM_STEPS.findIndex(z => z >= zoomLevel);
    idx = clamp(idx + dir, 0, ZOOM_STEPS.length - 1);
    zoomLevel = ZOOM_STEPS[idx];

    // Adjust scroll to keep point under cursor
    const ratio = zoomLevel / oldZ;
    vp.scrollLeft = (vp.scrollLeft + cx) * ratio - cx;
    vp.scrollTop  = (vp.scrollTop  + cy) * ratio - cy;
    applyZoom();
}

function zoomFit() {
    const vp = document.getElementById('pdn-viewport');
    const zx = (vp.clientWidth  - 40) / CANVAS_W;
    const zy = (vp.clientHeight - 40) / CANVAS_H;
    const z  = Math.min(zx, zy);
    let best = ZOOM_STEPS[0];
    for (const s of ZOOM_STEPS) { if (s <= z) best = s; }
    zoomLevel = best;
    applyZoom();
    vp.scrollLeft = 0; vp.scrollTop = 0;
}

// ═══════════════════════════════════════════════════════════
//  LAYER PANEL
// ═══════════════════════════════════════════════════════════
function renderLayerPanel() {
    const list = document.getElementById('layer-list');
    list.innerHTML = '';
    // Render in reverse (top layer first)
    for (let i = layers.length - 1; i >= 0; i--) {
        const l = layers[i];
        const div = document.createElement('div');
        div.className = 'layer-item' + (i === activeLayerIdx ? ' active' : '');
        div.dataset.idx = i;

        const visBtn = document.createElement('button');
        visBtn.className = 'layer-vis';
        visBtn.textContent = l.visible ? '👁' : '○';
        visBtn.title = l.visible ? 'Hide' : 'Show';
        visBtn.addEventListener('click', e => { e.stopPropagation(); toggleLayerVis(i); });

        const thumb = document.createElement('canvas');
        thumb.className = 'layer-thumb';
        thumb.width = 28; thumb.height = 28;
        thumb.getContext('2d').drawImage(l.canvas, 0, 0, 28, 28);

        const info = document.createElement('div');
        info.className = 'layer-info';
        const nameEl = document.createElement('div');
        nameEl.className = 'layer-name';
        nameEl.textContent = l.name;
        nameEl.addEventListener('dblclick', () => startRenameLayer(i, nameEl));
        const opEl = document.createElement('div');
        opEl.className = 'layer-op';
        opEl.textContent = l.opacity + '%';
        info.appendChild(nameEl);
        info.appendChild(opEl);

        div.appendChild(visBtn);
        div.appendChild(thumb);
        div.appendChild(info);
        div.addEventListener('click', () => setActiveLayer(i));
        list.appendChild(div);
    }
    // Update opacity slider
    const lay = layers[activeLayerIdx];
    document.getElementById('layer-opacity').value     = lay.opacity;
    document.getElementById('layer-opacity-num').value = lay.opacity;
}

function startRenameLayer(i, el) {
    const inp = document.createElement('input');
    inp.className = 'layer-name-input';
    inp.value = layers[i].name;
    el.replaceWith(inp);
    inp.focus(); inp.select();
    const commit = () => {
        layers[i].name = inp.value.trim() || layers[i].name;
        renderLayerPanel();
    };
    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { inp.value = layers[i].name; inp.blur(); } });
}

function setActiveLayer(i) {
    activeLayerIdx = i;
    renderLayerPanel();
}

function toggleLayerVis(i) {
    layers[i].visible = !layers[i].visible;
    composite();
    renderLayerPanel();
}

document.getElementById('layer-opacity').addEventListener('input', function () {
    layers[activeLayerIdx].opacity = +this.value;
    document.getElementById('layer-opacity-num').value = this.value;
    composite();
});
document.getElementById('layer-opacity-num').addEventListener('input', function () {
    const v = clamp(+this.value, 0, 100);
    layers[activeLayerIdx].opacity = v;
    document.getElementById('layer-opacity').value = v;
    composite();
});

document.getElementById('btn-add-layer').addEventListener('click', () => {
    const l = makeLayer('Layer ' + (layers.length + 1));
    layers.splice(activeLayerIdx + 1, 0, l);
    activeLayerIdx++;
    historySnapshot('Add Layer');
    composite(); renderLayerPanel();
});
document.getElementById('btn-del-layer').addEventListener('click', () => {
    if (layers.length <= 1) return;
    layers.splice(activeLayerIdx, 1);
    activeLayerIdx = clamp(activeLayerIdx, 0, layers.length - 1);
    historySnapshot('Delete Layer');
    composite(); renderLayerPanel();
});
document.getElementById('btn-dup-layer').addEventListener('click', () => {
    const l = makeLayer(layers[activeLayerIdx].name + ' copy');
    l.ctx.drawImage(layers[activeLayerIdx].canvas, 0, 0);
    l.opacity = layers[activeLayerIdx].opacity;
    layers.splice(activeLayerIdx + 1, 0, l);
    activeLayerIdx++;
    historySnapshot('Duplicate Layer');
    composite(); renderLayerPanel();
});
document.getElementById('btn-merge-down').addEventListener('click', () => {
    if (activeLayerIdx === 0) return;
    const upper = layers[activeLayerIdx];
    const lower = layers[activeLayerIdx - 1];
    lower.ctx.globalAlpha = upper.opacity / 100;
    lower.ctx.drawImage(upper.canvas, 0, 0);
    lower.ctx.globalAlpha = 1;
    layers.splice(activeLayerIdx, 1);
    activeLayerIdx--;
    historySnapshot('Merge Down');
    composite(); renderLayerPanel();
});
document.getElementById('btn-layer-up').addEventListener('click', () => {
    if (activeLayerIdx >= layers.length - 1) return;
    [layers[activeLayerIdx], layers[activeLayerIdx+1]] = [layers[activeLayerIdx+1], layers[activeLayerIdx]];
    activeLayerIdx++;
    composite(); renderLayerPanel();
});
document.getElementById('btn-layer-down').addEventListener('click', () => {
    if (activeLayerIdx <= 0) return;
    [layers[activeLayerIdx], layers[activeLayerIdx-1]] = [layers[activeLayerIdx-1], layers[activeLayerIdx]];
    activeLayerIdx--;
    composite(); renderLayerPanel();
});

// ═══════════════════════════════════════════════════════════
//  HISTORY PANEL
// ═══════════════════════════════════════════════════════════
function renderHistoryPanel() {
    const list = document.getElementById('_history-list');
    list.innerHTML = '';
    _history.forEach((entry, i) => {
        const div = document.createElement('div');
        div.className = 'hist-item' +
            (i === historyPos ? ' current' : '') +
            (i > historyPos  ? ' future'  : '');
        div.textContent = (i === 0 ? '⬤ ' : '· ') + entry.label;
        div.addEventListener('click', () => {
            historyPos = i;
            restoreHistory(i);
        });
        list.appendChild(div);
    });
    list.scrollTop = list.scrollHeight;
}

// ═══════════════════════════════════════════════════════════
//  COLOUR PANEL
// ═══════════════════════════════════════════════════════════
const PALETTE = [
    '#000000','#404040','#808080','#c0c0c0','#ffffff','#800000','#ff0000','#ff8000','#ffff00','#00ff00',
    '#008000','#00ffff','#0080ff','#0000ff','#800080','#ff00ff','#804000','#ff8080','#ffe0b2','#c8e6c9',
    '#b3e5fc','#e1bee7','#fce4ec','#f3e5f5','#e8eaf6','#e0f2f1','#f9fbe7','#fffde7','#fbe9e7','#efebe9',
];

function setPrimaryColor(hex) {
    primaryCol = hex;
    document.getElementById('swatch-primary').style.background = hex;
    updateColorSliders(hex);
}
function setSecondaryColor(hex) {
    secondCol = hex;
    document.getElementById('swatch-secondary').style.background = hex;
}

function updateColorSliders(hex) {
    const { r, g, b } = hexToRgba(hex);
    document.getElementById('sl-r').value = r; document.getElementById('num-r').value = r;
    document.getElementById('sl-g').value = g; document.getElementById('num-g').value = g;
    document.getElementById('sl-b').value = b; document.getElementById('num-b').value = b;
    document.getElementById('hex-input').value = hex;
    document.getElementById('hex-input').style.color = '#d0d0d0';
}

function sliderToColor() {
    const r = +document.getElementById('sl-r').value;
    const g = +document.getElementById('sl-g').value;
    const b = +document.getElementById('sl-b').value;
    const hex = rgbaToHex(r, g, b);
    primaryCol = hex;
    document.getElementById('swatch-primary').style.background = hex;
    document.getElementById('hex-input').value = hex;
}

['r','g','b'].forEach(ch => {
    document.getElementById('sl-'  + ch).addEventListener('input', function() { document.getElementById('num-' + ch).value = this.value; sliderToColor(); });
    document.getElementById('num-' + ch).addEventListener('input', function() { document.getElementById('sl-'  + ch).value = this.value; sliderToColor(); });
});

document.getElementById('hex-input').addEventListener('input', function() {
    const v = this.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) setPrimaryColor(v);
});

document.getElementById('swatch-primary').addEventListener('click', () => {
    const nc = document.getElementById('native-color');
    nc.value = primaryCol;
    nc.onchange = () => setPrimaryColor(nc.value);
    nc.click();
});
document.getElementById('swatch-secondary').addEventListener('click', () => {
    const nc = document.getElementById('native-color');
    nc.value = secondCol;
    nc.onchange = () => setSecondaryColor(nc.value);
    nc.click();
});
document.getElementById('colors-swap').addEventListener('click', () => {
    [primaryCol, secondCol] = [secondCol, primaryCol];
    document.getElementById('swatch-primary').style.background   = primaryCol;
    document.getElementById('swatch-secondary').style.background = secondCol;
    updateColorSliders(primaryCol);
});

// Build palette
(function buildPalette() {
    const grid = document.getElementById('palette-grid');
    PALETTE.forEach(c => {
        const sw = document.createElement('div');
        sw.className = 'pal2';
        sw.style.background = c;
        sw.title = c;
        sw.addEventListener('click',       () => setPrimaryColor(c));
        sw.addEventListener('contextmenu', e => { e.preventDefault(); setSecondaryColor(c); });
        grid.appendChild(sw);
    });
})();

// ═══════════════════════════════════════════════════════════
//  TOOL SELECTION + OPTIONS BAR
// ═══════════════════════════════════════════════════════════
const TOOL_CURSORS = {
    select: 'crosshair', pencil: 'crosshair', brush: 'crosshair', eraser: 'cell',
    fill: 'cell', picker: 'copy', text: 'text', line: 'crosshair',
    rect: 'crosshair', ellipse: 'crosshair', rrect: 'crosshair', triangle: 'crosshair',
    zoom: 'zoom-in', pan: 'grab',
};

function setTool(name) {
    if (textInput) commitText();
    sel = null; drawSelOverlay();
    tool = name;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === name));
    ov.style.cursor = TOOL_CURSORS[name] || 'crosshair';
    renderOptionsBar();
}

document.querySelectorAll('.tool-btn').forEach(b => {
    b.addEventListener('click', () => setTool(b.dataset.tool));
});

function renderOptionsBar() {
    const bar = document.getElementById('pdn-optbar');
    bar.innerHTML = '';

    function addLabel(text) {
        const s = document.createElement('span');
        s.className = 'opt-label'; s.textContent = text;
        bar.appendChild(s);
    }
    function addSep() {
        const s = document.createElement('div'); s.className = 'opt-sep';
        bar.appendChild(s);
    }
    function addRange(id, min, max, val, label, onInput) {
        addLabel(label);
        const r = document.createElement('input');
        r.type = 'range'; r.className = 'opt-range'; r.id = id;
        r.min = min; r.max = max; r.value = val; r.style.width = '80px';
        const num = document.createElement('input');
        num.type = 'number'; num.className = 'opt-input'; num.value = val;
        num.min = min; num.max = max; num.style.width = '44px';
        r.addEventListener('input', function() { num.value = this.value; onInput(+this.value); });
        num.addEventListener('input', function() { r.value = this.value; onInput(+this.value); });
        bar.appendChild(r); bar.appendChild(num);
    }
    function addToggle(id, label, checked, onChange) {
        const l = document.createElement('label'); l.className = 'opt-check-label';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = checked;
        cb.addEventListener('change', () => onChange(cb.checked));
        l.appendChild(cb); l.appendChild(document.createTextNode(' ' + label));
        bar.appendChild(l);
    }
    function addSelect(id, options, val, onChange) {
        const sel = document.createElement('select'); sel.className = 'opt-select'; sel.id = id;
        options.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; if (v === val) o.selected = true; sel.appendChild(o); });
        sel.addEventListener('change', function() { onChange(this.value); });
        bar.appendChild(sel);
    }

    if (['pencil','brush','eraser'].includes(tool)) {
        addRange('opt-size', 1, 100, brushSz, 'Size:', v => brushSz = v);
        if (tool === 'brush') {
            addSep();
            addRange('opt-hard', 0, 100, brushHard, 'Hardness:', v => brushHard = v);
        }
    }
    if (['rect','ellipse','rrect','line','triangle'].includes(tool)) {
        addRange('opt-size', 1, 60, brushSz, 'Width:', v => brushSz = v);
        addSep();
        addToggle('opt-fill', 'Fill', fillShapes, v => fillShapes = v);
    }
    if (tool === 'fill') {
        addLabel('Tolerance:');
        addRange('opt-tol', 0, 128, 32, '', () => {});
    }
    if (tool === 'text') {
        addSelect('opt-text-font', [
            ['Arial','Arial'], ['Verdana','Verdana'], ['Georgia','Georgia'],
            ['Courier New','Courier New'], ['Times New Roman','Times New Roman'],
            ['Comic Sans MS','Comic Sans'], ['Impact','Impact'],
        ], 'Arial', () => {});
        addSep();
        addRange('opt-text-size', 8, 120, 24, 'Size:', () => {});
        addSep();
        addToggle('opt-text-bold',   'Bold',   false, () => {});
        addToggle('opt-text-italic', 'Italic', false, () => {});
    }
    if (tool === 'zoom') {
        addLabel('Click: zoom in  ·  Right-click: zoom out');
    }
    if (tool === 'pan') {
        addLabel('Click and drag to pan canvas');
    }
}

// ═══════════════════════════════════════════════════════════
//  MENU BAR
// ═══════════════════════════════════════════════════════════
document.querySelectorAll('.pdn-mb').forEach(mb => {
    mb.querySelector('.pdn-mb-btn').addEventListener('click', e => {
        const isOpen = mb.classList.contains('open');
        document.querySelectorAll('.pdn-mb.open').forEach(m => m.classList.remove('open'));
        if (!isOpen) mb.classList.add('open');
        e.stopPropagation();
    });
});
document.addEventListener('click', () => {
    document.querySelectorAll('.pdn-mb.open').forEach(m => m.classList.remove('open'));
});

document.querySelectorAll('.pdn-mi:not(.sep):not(.disabled)').forEach(mi => {
    mi.addEventListener('click', () => {
        document.querySelectorAll('.pdn-mb.open').forEach(m => m.classList.remove('open'));
        handleMenuAction(mi.dataset.action);
    });
});

function handleMenuAction(action) {
    switch (action) {
        case 'new':     newCanvas(); break;
        case 'open':    document.getElementById('img-upload').click(); break;
        case 'save-png':  downloadCanvas('png'); break;
        case 'save-jpeg': downloadCanvas('jpeg'); break;
        case 'undo':    undo(); break;
        case 'redo':    redo(); break;
        case 'cut':     cutSelection(); break;
        case 'copy':    copySelection(); break;
        case 'paste':   pasteClipboard(); break;
        case 'select-all': selectAll(); break;
        case 'deselect': sel = null; drawSelOverlay(); break;
        case 'zoom-in':  doZoom(1, window.innerWidth/2, window.innerHeight/2); break;
        case 'zoom-out': doZoom(-1, window.innerWidth/2, window.innerHeight/2); break;
        case 'zoom-fit': zoomFit(); break;
        case 'zoom-100': zoomLevel = 1; applyZoom(); break;
        case 'resize':   showResizeDialog(); break;
        case 'rot90cw':  rotateCanvas(90); break;
        case 'rot90ccw': rotateCanvas(-90); break;
        case 'rot180':   rotateCanvas(180); break;
        case 'flip-h':   flipCanvas('h'); break;
        case 'flip-v':   flipCanvas('v'); break;
        case 'flatten':  flattenLayers(); break;
    }
}

// ═══════════════════════════════════════════════════════════
//  PANEL COLLAPSE
// ═══════════════════════════════════════════════════════════
document.querySelectorAll('.pdn-panel-hdr').forEach(hdr => {
    hdr.addEventListener('click', () => {
        hdr.closest('.pdn-panel').classList.toggle('collapsed');
        hdr.querySelector('span').textContent = hdr.closest('.pdn-panel').classList.contains('collapsed') ? '▸' : '▾';
    });
});

// ═══════════════════════════════════════════════════════════
//  IMAGE ACTIONS
// ═══════════════════════════════════════════════════════════
function newCanvas() {
    if (!confirm('Start a new canvas? All unsaved work will be lost.')) return;
    layers = [makeLayer('Background')];
    activeLayerIdx = 0;
    layers[0].ctx.fillStyle = '#ffffff';
    layers[0].ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    _history = []; historyPos = -1;
    historySnapshot('New');
    composite(); renderLayerPanel(); renderHistoryPanel();
}

function downloadCanvas(fmt) {
    // Flatten to a temp canvas
    const tmp = document.createElement('canvas');
    tmp.width = CANVAS_W; tmp.height = CANVAS_H;
    const tCtx = tmp.getContext('2d');
    tCtx.fillStyle = '#ffffff'; tCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (const l of layers) {
        if (!l.visible) continue;
        tCtx.globalAlpha = l.opacity / 100;
        tCtx.drawImage(l.canvas, 0, 0);
    }
    tCtx.globalAlpha = 1;
    const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    const a  = document.createElement('a');
    a.download = 'doodle-' + ts + '.' + fmt;
    a.href = tmp.toDataURL('image/' + (fmt === 'jpeg' ? 'jpeg' : 'png'), 0.92);
    a.click();
}

document.getElementById('img-upload').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            historySnapshot('Open Image');
            const ctx = activeCtx();
            ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            const scale = Math.min(CANVAS_W / img.width, CANVAS_H / img.height);
            const w = img.width * scale, h = img.height * scale;
            ctx.drawImage(img, (CANVAS_W-w)/2, (CANVAS_H-h)/2, w, h);
            composite(); renderLayerPanel();
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    this.value = '';
});

function rotateCanvas(deg) {
    historySnapshot('Rotate ' + deg + '°');
    layers.forEach(l => {
        const tmp = document.createElement('canvas');
        const sw = (Math.abs(deg) === 90) ? CANVAS_H : CANVAS_W;
        const sh = (Math.abs(deg) === 90) ? CANVAS_W : CANVAS_H;
        tmp.width = sw; tmp.height = sh;
        const tCtx = tmp.getContext('2d');
        tCtx.translate(sw/2, sh/2);
        tCtx.rotate(deg * Math.PI / 180);
        tCtx.drawImage(l.canvas, -CANVAS_W/2, -CANVAS_H/2);
        l.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        l.ctx.drawImage(tmp, 0, 0, CANVAS_W, CANVAS_H);
    });
    composite(); renderLayerPanel();
}

function flipCanvas(dir) {
    historySnapshot('Flip ' + (dir === 'h' ? 'Horizontal' : 'Vertical'));
    layers.forEach(l => {
        const tmp = document.createElement('canvas');
        tmp.width = CANVAS_W; tmp.height = CANVAS_H;
        const tCtx = tmp.getContext('2d');
        tCtx.translate(dir === 'h' ? CANVAS_W : 0, dir === 'v' ? CANVAS_H : 0);
        tCtx.scale(dir === 'h' ? -1 : 1, dir === 'v' ? -1 : 1);
        tCtx.drawImage(l.canvas, 0, 0);
        l.ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        l.ctx.drawImage(tmp, 0, 0);
    });
    composite(); renderLayerPanel();
}

function flattenLayers() {
    historySnapshot('Flatten');
    const flat = makeLayer('Background');
    flat.ctx.fillStyle = '#ffffff'; flat.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    for (const l of layers) {
        if (!l.visible) continue;
        flat.ctx.globalAlpha = l.opacity / 100;
        flat.ctx.drawImage(l.canvas, 0, 0);
    }
    flat.ctx.globalAlpha = 1;
    layers = [flat];
    activeLayerIdx = 0;
    composite(); renderLayerPanel();
}

// ═══════════════════════════════════════════════════════════
//  SELECTION OPERATIONS
// ═══════════════════════════════════════════════════════════
function selectAll() {
    sel = { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H };
    setTool('select');
    drawSelOverlay();
}

function copySelection() {
    const r = sel || { x:0, y:0, w: CANVAS_W, h: CANVAS_H };
    clipboard = displayCtx.getImageData(r.x, r.y, r.w, r.h);
}

function cutSelection() {
    if (!sel) return;
    copySelection();
    historySnapshot('Cut');
    activeCtx().clearRect(sel.x, sel.y, sel.w, sel.h);
    composite(); renderLayerPanel();
}

function pasteClipboard() {
    if (!clipboard) return;
    historySnapshot('Paste');
    const ctx = activeCtx();
    const tmp = document.createElement('canvas');
    tmp.width = clipboard.width; tmp.height = clipboard.height;
    tmp.getContext('2d').putImageData(clipboard, 0, 0);
    ctx.drawImage(tmp, 0, 0);
    sel = { x: 0, y: 0, w: clipboard.width, h: clipboard.height };
    setTool('select');
    composite(); renderLayerPanel(); drawSelOverlay();
}

// ═══════════════════════════════════════════════════════════
//  RESIZE DIALOG
// ═══════════════════════════════════════════════════════════
function showResizeDialog() {
    document.getElementById('dlg-w').value = CANVAS_W;
    document.getElementById('dlg-h').value = CANVAS_H;
    document.getElementById('dlg-resize').classList.add('open');
}
document.getElementById('dlg-resize-cancel').addEventListener('click', () => {
    document.getElementById('dlg-resize').classList.remove('open');
});
document.getElementById('dlg-resize-ok').addEventListener('click', () => {
    const nw = clamp(parseInt(document.getElementById('dlg-w').value, 10) || CANVAS_W, 1, 4096);
    const nh = clamp(parseInt(document.getElementById('dlg-h').value, 10) || CANVAS_H, 1, 4096);
    document.getElementById('dlg-resize').classList.remove('open');
    resizeAllLayers(nw, nh);
});

function resizeAllLayers(nw, nh) {
    historySnapshot('Resize Canvas');
    layers.forEach(l => {
        const tmp = document.createElement('canvas');
        tmp.width = nw; tmp.height = nh;
        const tCtx = tmp.getContext('2d');
        tCtx.drawImage(l.canvas, 0, 0);
        l.canvas.width  = nw; l.canvas.height = nh;
        l.ctx.drawImage(tmp, 0, 0);
    });
    // Resize display and overlays
    [displayCanvas, checkerCanvas, selOverlay, overlayCanvas].forEach(c => {
        const prev = document.createElement('canvas');
        prev.width = c.width; prev.height = c.height;
        prev.getContext('2d').drawImage(c, 0, 0);
        c.width = nw; c.height = nh;
        c.getContext('2d').drawImage(prev, 0, 0);
    });
    drawChecker(checkerCanvas.getContext('2d'), nw, nh);
    document.getElementById('status-size').textContent = `${nw} × ${nh} px`;
    composite(); applyZoom(); renderLayerPanel();
}

// ═══════════════════════════════════════════════════════════
//  STATUS BAR
// ═══════════════════════════════════════════════════════════
function updateStatusBar(x, y) {
    const cx = clamp(x, 0, CANVAS_W-1), cy = clamp(y, 0, CANVAS_H-1);
    document.getElementById('status-pos').textContent = `${x}, ${y}`;
    try {
        const px = displayCtx.getImageData(cx, cy, 1, 1).data;
        document.getElementById('status-color').textContent = `rgb(${px[0]}, ${px[1]}, ${px[2]})`;
    } catch (_) { /* getImageData can fail on cross-origin canvas */ }
}

// ═══════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════
document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'z': e.preventDefault(); e.shiftKey ? redo() : undo(); break;
            case 'y': e.preventDefault(); redo(); break;
            case 's': e.preventDefault(); downloadCanvas('png'); break;
            case 'n': e.preventDefault(); newCanvas(); break;
            case 'o': e.preventDefault(); document.getElementById('img-upload').click(); break;
            case 'a': e.preventDefault(); selectAll(); break;
            case 'd': e.preventDefault(); sel = null; drawSelOverlay(); break;
            case 'c': copySelection(); break;
            case 'x': cutSelection(); break;
            case 'v': pasteClipboard(); break;
            case '+': case '=': e.preventDefault(); doZoom(1, window.innerWidth/2, window.innerHeight/2); break;
            case '-': e.preventDefault(); doZoom(-1, window.innerWidth/2, window.innerHeight/2); break;
        }
        return;
    }
    switch (e.key.toLowerCase()) {
        case 's': setTool('select');  break;
        case 'p': setTool('pencil');  break;
        case 'b': setTool('brush');   break;
        case 'e': setTool('eraser');  break;
        case 'f': setTool('fill');    break;
        case 'k': setTool('picker');  break;
        case 't': setTool('text');    break;
        case 'l': setTool('line');    break;
        case 'r': setTool('rect');    break;
        case 'o': setTool('ellipse'); break;
        case 'z': setTool('zoom');    break;
        case 'h': setTool('pan');     break;
        case 'x': [primaryCol, secondCol] = [secondCol, primaryCol];
                  document.getElementById('swatch-primary').style.background   = primaryCol;
                  document.getElementById('swatch-secondary').style.background = secondCol;
                  updateColorSliders(primaryCol); break;
        case 'escape': if (textInput) removeTextInput(); sel = null; drawSelOverlay(); break;
        case '[': brushSz = Math.max(1, brushSz - 2);
                  if (document.getElementById('opt-size')) document.getElementById('opt-size').value = brushSz; break;
        case ']': brushSz = Math.min(200, brushSz + 2);
                  if (document.getElementById('opt-size')) document.getElementById('opt-size').value = brushSz; break;
    }
});

// Mouse wheel zoom
document.getElementById('pdn-viewport').addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    doZoom(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
}, { passive: false });

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
(function init() {
    initCanvases(CANVAS_W, CANVAS_H);
    initLayers();
    historySnapshot('New Canvas');
    setTool('pencil');
    setPrimaryColor('#000000');
    setSecondaryColor('#ffffff');
    renderOptionsBar();
    renderHistoryPanel();
    updateMenuStates();
    document.getElementById('status-size').textContent = `${CANVAS_W} × ${CANVAS_H} px`;

    // Initial zoom fit after layout settles
    requestAnimationFrame(() => {
        requestAnimationFrame(() => zoomFit());
    });
})();
