// ════════════════════════════════════════════════════════════════════════
        //  PUBLISHED ANIMATIONS — paste generated snippets into this array
        // ════════════════════════════════════════════════════════════════════════

        const ANIMATIONS = [
            // ── Add published animations above this line ────────────────────
        ];

        // ── Constants ────────────────────────────────────────────────────────
        const CANVAS_W    = 480;
        const CANVAS_H    = 480;
        const MAX_FRAMES  = 48;
        const THUMB_W     = 72;
        const THUMB_H     = 72;
        const ARCHIVE_MS  = 30 * 24 * 60 * 60 * 1000;

        // ── Editor state ─────────────────────────────────────────────────────
        let edFrames     = [];
        let edIdx        = 0;
        let edPlaying    = false;
        let edPlayTimer  = null;

        let tool       = 'pen';
        let color      = '#000000';
        let brushSz    = 4;
        let fillShapes = false;
        let isDrawing  = false;
        let startX = 0, startY = 0, startSnap = null;
        const undoStack = [];

        const canvas  = document.getElementById('anim-canvas');
        const ctx     = canvas.getContext('2d');
        const overlay = document.getElementById('anim-overlay');
        const ovCtx   = overlay.getContext('2d');

        // ── Frame helpers ────────────────────────────────────────────────────

        function makeBlankImageData() {
            const id = ctx.createImageData(CANVAS_W, CANVAS_H);
            for (let i = 0; i < id.data.length; i += 4) {
                id.data[i] = id.data[i+1] = id.data[i+2] = 255;
                id.data[i+3] = 255;
            }
            return id;
        }

        function saveCurrentFrame() {
            if (edFrames.length) {
                edFrames[edIdx] = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
            }
        }

        function loadFrame(idx) {
            undoStack.length = 0;
            document.getElementById('undo-btn').disabled = true;
            ctx.putImageData(edFrames[idx], 0, 0);
            edIdx = idx;
            updateToolbar();
            renderOnionSkin();
            renderStrip();
        }

        function addFrame() {
            if (edFrames.length >= MAX_FRAMES) { alert('Max ' + MAX_FRAMES + ' frames.'); return; }
            saveCurrentFrame();
            edFrames.splice(edIdx + 1, 0, makeBlankImageData());
            loadFrame(edIdx + 1);
        }

        function duplicateFrame() {
            if (edFrames.length >= MAX_FRAMES) { alert('Max ' + MAX_FRAMES + ' frames.'); return; }
            saveCurrentFrame();
            const src = edFrames[edIdx].data;
            const copy = new ImageData(new Uint8ClampedArray(src), CANVAS_W, CANVAS_H);
            edFrames.splice(edIdx + 1, 0, copy);
            loadFrame(edIdx + 1);
        }

        function deleteFrame() {
            if (edFrames.length === 1) {
                if (!confirm('Clear this frame?')) return;
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                edFrames[0] = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
                renderStrip();
                return;
            }
            edFrames.splice(edIdx, 1);
            loadFrame(Math.min(edIdx, edFrames.length - 1));
        }

        function prevFrame() {
            if (edIdx > 0) { saveCurrentFrame(); loadFrame(edIdx - 1); }
        }

        function nextFrame() {
            if (edIdx < edFrames.length - 1) { saveCurrentFrame(); loadFrame(edIdx + 1); }
        }

        // ── Onion skinning ───────────────────────────────────────────────────

        function renderOnionSkin() {
            ovCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            const on = document.getElementById('onion-toggle').checked;
            if (!on || edIdx === 0) return;
            const tmp = document.createElement('canvas');
            tmp.width = CANVAS_W; tmp.height = CANVAS_H;
            tmp.getContext('2d').putImageData(edFrames[edIdx - 1], 0, 0);
            ovCtx.globalAlpha = 0.3;
            ovCtx.drawImage(tmp, 0, 0);
            ovCtx.globalAlpha = 1;
        }

        // ── Toolbar ──────────────────────────────────────────────────────────

        function updateToolbar() {
            document.getElementById('frame-counter').textContent =
                (edIdx + 1) + ' / ' + edFrames.length;
            document.getElementById('btn-prev-frame').disabled = edIdx === 0;
            document.getElementById('btn-next-frame').disabled = edIdx === edFrames.length - 1;
        }

        // ── Frame strip ──────────────────────────────────────────────────────

        function renderStrip() {
            const strip = document.getElementById('frame-strip');
            strip.innerHTML = '';
            edFrames.forEach((frame, i) => {
                const wrap = document.createElement('div');
                wrap.className = 'thumb-wrap' + (i === edIdx ? ' active' : '');

                const c = document.createElement('canvas');
                c.width = THUMB_W; c.height = THUMB_H;
                const tmp = document.createElement('canvas');
                tmp.width = CANVAS_W; tmp.height = CANVAS_H;
                tmp.getContext('2d').putImageData(frame, 0, 0);
                c.getContext('2d').drawImage(tmp, 0, 0, THUMB_W, THUMB_H);

                const num = document.createElement('div');
                num.className = 'thumb-num';
                num.textContent = i + 1;

                wrap.appendChild(c);
                wrap.appendChild(num);
                wrap.addEventListener('click', () => {
                    if (edPlaying) stopAnimation();
                    saveCurrentFrame();
                    loadFrame(i);
                });
                strip.appendChild(wrap);
            });
            const active = strip.querySelector('.active');
            if (active) active.scrollIntoView({ block: 'nearest', inline: 'center' });
        }

        // ── Playback ─────────────────────────────────────────────────────────

        function playAnimation() {
            if (edPlaying) return;
            saveCurrentFrame();
            edPlaying = true;
            document.getElementById('btn-play').disabled = true;
            document.getElementById('btn-stop').disabled = false;
            let pi = 0;
            const fps = Math.max(1, Math.min(24, parseInt(document.getElementById('fps-input').value) || 8));
            edPlayTimer = setInterval(() => {
                ctx.putImageData(edFrames[pi], 0, 0);
                pi = (pi + 1) % edFrames.length;
            }, 1000 / fps);
        }

        function stopAnimation() {
            if (!edPlaying) return;
            clearInterval(edPlayTimer);
            edPlaying = false;
            document.getElementById('btn-play').disabled = false;
            document.getElementById('btn-stop').disabled = true;
            loadFrame(edIdx);
        }

        // ── Drawing utilities ────────────────────────────────────────────────

        function getPos(e) {
            const r = canvas.getBoundingClientRect();
            return {
                x: (e.clientX - r.left) * (CANVAS_W / r.width),
                y: (e.clientY - r.top)  * (CANVAS_H / r.height)
            };
        }

        function pushUndo(snap) {
            undoStack.push(snap !== undefined ? snap : ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
            if (undoStack.length > 20) undoStack.shift();
            document.getElementById('undo-btn').disabled = false;
        }

        function undoLast() {
            if (!undoStack.length) return;
            ctx.putImageData(undoStack.pop(), 0, 0);
            document.getElementById('undo-btn').disabled = undoStack.length === 0;
        }

        function applyPenStyle() {
            ctx.lineWidth   = brushSz;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
            ctx.fillStyle   = color;
        }

        function drawShape(cx, sx, sy, ex, ey) {
            cx.lineWidth = brushSz; cx.lineCap = 'round'; cx.lineJoin = 'round';
            cx.strokeStyle = color; cx.fillStyle = color;
            cx.beginPath();
            switch (tool) {
                case 'line':
                    cx.moveTo(sx, sy); cx.lineTo(ex, ey); cx.stroke(); break;
                case 'rect':
                    if (fillShapes) cx.fillRect(sx, sy, ex - sx, ey - sy);
                    cx.strokeRect(sx, sy, ex - sx, ey - sy); break;
                case 'circle': {
                    const rx = (ex - sx) / 2, ry = (ey - sy) / 2;
                    cx.ellipse(sx + rx, sy + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
                    if (fillShapes) cx.fill(); cx.stroke(); break;
                }
                case 'triangle':
                    cx.moveTo((sx + ex) / 2, sy); cx.lineTo(ex, ey);
                    cx.lineTo(sx, ey); cx.closePath();
                    if (fillShapes) cx.fill(); cx.stroke(); break;
            }
        }

        // ── Mouse / touch events ─────────────────────────────────────────────

        function onDown(e) {
            e.preventDefault();
            if (edPlaying) return;
            overlay.setPointerCapture(e.pointerId);
            const { x, y } = getPos(e);
            isDrawing = true; startX = x; startY = y;
            startSnap = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H);
            if (tool === 'pen' || tool === 'eraser') {
                pushUndo(startSnap); applyPenStyle();
                ctx.beginPath(); ctx.moveTo(x, y);
            } else {
                ovCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
            }
        }

        function onMove(e) {
            e.preventDefault();
            if (!isDrawing || edPlaying) return;
            const { x, y } = getPos(e);
            if (tool === 'pen' || tool === 'eraser') {
                applyPenStyle(); ctx.lineTo(x, y); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x, y);
            } else {
                ovCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
                drawShape(ovCtx, startX, startY, x, y);
            }
        }

        function onUp(e) {
            if (!isDrawing || edPlaying) return;
            isDrawing = false;
            if (tool !== 'pen' && tool !== 'eraser') {
                const { x, y } = getPos(e);
                ovCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
                pushUndo(startSnap);
                ctx.putImageData(startSnap, 0, 0);
                drawShape(ctx, startX, startY, x, y);
                renderOnionSkin();
            }
            ctx.beginPath();
        }

        overlay.addEventListener('pointerdown',   onDown);
        overlay.addEventListener('pointermove',   onMove);
        overlay.addEventListener('pointerup',     onUp);
        overlay.addEventListener('pointercancel', onUp);

        // ── Tool selection ───────────────────────────────────────────────────

        const ALL_TOOLS = ['pen', 'eraser', 'line', 'rect', 'circle', 'triangle'];

        function setTool(t) {
            tool = t;
            ALL_TOOLS.forEach(id =>
                document.getElementById('btn-' + id).classList.toggle('active', id === t)
            );
            overlay.style.cursor = t === 'eraser' ? 'cell' : 'crosshair';
        }

        document.getElementById('size-slider').addEventListener('input', function () {
            brushSz = +this.value;
            document.getElementById('size-label').textContent = brushSz + ' px';
        });

        document.getElementById('fill-check').addEventListener('change', function () {
            fillShapes = this.checked;
        });

        document.getElementById('onion-toggle').addEventListener('change', renderOnionSkin);

        // ── Colour palette ───────────────────────────────────────────────────

        const PALETTE = [
            '#000000','#222222','#555555','#888888','#bbbbbb','#ffffff',
            '#7b0000','#cc0000','#e85d04','#f4c21c','#a8d5a2','#23a55a',
            '#006d77','#1565c0','#4527a0','#ad1457','#6d4c41','#bcaaa4',
            '#ffcdd2','#ffe0b2','#fff9c4','#dcedc8','#b3e5fc','#e1bee7',
        ];

        const paletteGrid = document.getElementById('ed-palette-grid');
        let selectedSwatch = null;

        function setColor(c) {
            color = c;
            document.getElementById('ed-active-swatch').style.background = c;
            document.getElementById('ed-custom-color').value = c;
        }

        PALETTE.forEach((c, i) => {
            const sw = document.createElement('div');
            sw.className = 'pal-swatch'; sw.style.background = c; sw.title = c;
            sw.addEventListener('click', () => {
                if (selectedSwatch) selectedSwatch.classList.remove('selected');
                sw.classList.add('selected'); selectedSwatch = sw; setColor(c);
            });
            paletteGrid.appendChild(sw);
            if (i === 0) { sw.classList.add('selected'); selectedSwatch = sw; }
        });

        document.getElementById('ed-custom-color').addEventListener('input', function () {
            if (selectedSwatch) selectedSwatch.classList.remove('selected');
            selectedSwatch = null; setColor(this.value);
        });

        document.getElementById('ed-active-swatch').style.background = color;

        // ── Clear / export ───────────────────────────────────────────────────

        function clearFrame() {
            if (!confirm('Clear this frame?')) return;
            pushUndo();
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        function frameDataURL() {
            const tmp = document.createElement('canvas');
            tmp.width = CANVAS_W; tmp.height = CANVAS_H;
            tmp.getContext('2d').putImageData(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H), 0, 0);
            return tmp.toDataURL('image/png');
        }

        function downloadFrame() {
            const a = document.createElement('a');
            const n = String(edIdx + 1).padStart(3, '0');
            a.download = 'frame-' + n + '.png';
            a.href = frameDataURL(); a.click();
        }

        function downloadAllFrames() {
            saveCurrentFrame();
            const tmp = document.createElement('canvas');
            tmp.width = CANVAS_W; tmp.height = CANVAS_H;
            const tc = tmp.getContext('2d');
            edFrames.forEach((frame, i) => {
                tc.putImageData(frame, 0, 0);
                const a = document.createElement('a');
                a.download = 'frame-' + String(i + 1).padStart(3, '0') + '.png';
                a.href = tmp.toDataURL('image/png'); a.click();
            });
        }

        // ── Publish snippet ──────────────────────────────────────────────────

        function generateSnippet() {
            saveCurrentFrame();
            const title = document.getElementById('anim-title-input').value.trim() || 'Untitled';
            const fps   = Math.max(1, Math.min(24, parseInt(document.getElementById('fps-input').value) || 8));
            const today = new Date().toISOString().split('T')[0];

            const tmp = document.createElement('canvas');
            tmp.width = CANVAS_W; tmp.height = CANVAS_H;
            const tc = tmp.getContext('2d');

            const frameUrls = edFrames.map(frame => {
                tc.putImageData(frame, 0, 0);
                return tmp.toDataURL('image/png');
            });

            const snippet =
                '    {\n' +
                '        title:  "' + title + '",\n' +
                '        date:   "' + today + '",\n' +
                '        fps:    ' + fps + ',\n' +
                '        frames: [\n' +
                frameUrls.map(u => '            "' + u + '",').join('\n') + '\n' +
                '        ]\n' +
                '    },';

            const ta = document.getElementById('snippet-output');
            ta.value = snippet; ta.style.display = 'block';
            ta.select(); document.execCommand('copy');
            document.getElementById('snippet-status').textContent = '✓ Copied to clipboard!';
            setTimeout(() => { document.getElementById('snippet-status').textContent = ''; }, 2500);
        }

        // ════════════════════════════════════════════════════════════════════
        //  VIEWER
        // ════════════════════════════════════════════════════════════════════

        const ARCHIVE_CUTOFF = Date.now() - ARCHIVE_MS;
        const published = ANIMATIONS.filter(a => new Date(a.date).getTime() >= ARCHIVE_CUTOFF);
        const archived  = ANIMATIONS.filter(a => new Date(a.date).getTime() <  ARCHIVE_CUTOFF);

        const viewerCanvas = document.getElementById('viewer-canvas');
        const vCtx         = viewerCanvas.getContext('2d');
        let viewerIdx       = 0;
        let viewerFrameIdx  = 0;
        let viewerTimer     = null;
        let viewerPlaying   = false;

        function showAnimation(idx) {
            viewerStop();
            viewerIdx = idx;
            viewerFrameIdx = 0;
            const anim = published[idx];
            document.getElementById('viewer-title').textContent = anim.title;
            document.getElementById('viewer-meta').textContent  =
                anim.date + ' · ' + anim.fps + ' fps · ' + anim.frames.length + ' frames';

            renderViewerFrame(0);
            document.getElementById('viewer-bar').style.width = '0%';
            document.getElementById('viewer-frame-label').textContent = '1 / ' + anim.frames.length;

            document.querySelectorAll('#viewer-toc-grid .toc-card').forEach((c, i) => {
                c.classList.toggle('active', i === idx);
            });
        }

        function renderViewerFrame(frameIdx) {
            const anim = published[viewerIdx];
            if (!anim || !anim.frames[frameIdx]) return;
            const img = new Image();
            img.onload = () => { vCtx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H); };
            img.src = anim.frames[frameIdx];

            const pct = anim.frames.length > 1
                ? (frameIdx / (anim.frames.length - 1)) * 100
                : 100;
            document.getElementById('viewer-bar').style.width = pct + '%';
            document.getElementById('viewer-frame-label').textContent =
                (frameIdx + 1) + ' / ' + anim.frames.length;
        }

        function viewerPlay() {
            if (viewerPlaying || !published[viewerIdx]) return;
            viewerPlaying = true;
            document.getElementById('vbtn-play').disabled = true;
            document.getElementById('vbtn-stop').disabled = false;
            const anim = published[viewerIdx];
            const fps  = Math.max(1, anim.fps);
            viewerTimer = setInterval(() => {
                renderViewerFrame(viewerFrameIdx);
                viewerFrameIdx = (viewerFrameIdx + 1) % anim.frames.length;
            }, 1000 / fps);
        }

        function viewerStop() {
            if (!viewerPlaying) return;
            clearInterval(viewerTimer);
            viewerPlaying = false;
            document.getElementById('vbtn-play').disabled = false;
            document.getElementById('vbtn-stop').disabled = true;
        }

        function buildTocCard(anim, idx, container, isArchive) {
            const card = document.createElement('div');
            card.className = 'toc-card';
            if (!isArchive) card.addEventListener('click', () => showAnimation(idx));

            const thumb = document.createElement('div');
            thumb.className = 'toc-thumb';

            if (anim.frames.length) {
                const tc = document.createElement('canvas');
                tc.width = 60; tc.height = 60;
                const img = new Image();
                img.onload = () => tc.getContext('2d').drawImage(img, 0, 0, 60, 60);
                img.src = anim.frames[0];
                thumb.appendChild(tc);
            }

            const label = document.createElement('div');
            label.className = 'toc-label';
            const dateSpan = document.createElement('span');
            dateSpan.className = 'toc-date';
            dateSpan.textContent = '#' + (idx + 1) + ' · ' + anim.date;
            label.appendChild(dateSpan);
            label.appendChild(document.createTextNode(anim.title));

            card.appendChild(thumb);
            card.appendChild(label);
            container.appendChild(card);
        }

        function initViewer() {
            const tocGrid = document.getElementById('viewer-toc-grid');
            const archiveGrid = document.getElementById('archive-grid');

            if (!published.length) {
                document.getElementById('viewer-empty').style.display = 'block';
                document.getElementById('anim-viewer-wrap').style.display = 'none';
            } else {
                published.forEach((a, i) => buildTocCard(a, i, tocGrid, false));
                showAnimation(0);
            }

            if (!archived.length) {
                document.getElementById('archive-details').style.display = 'none';
            } else {
                archived.forEach((a, i) => buildTocCard(a, i, archiveGrid, true));
            }
        }

        // ════════════════════════════════════════════════════════════════════
        //  INIT — Frame Editor
        // ════════════════════════════════════════════════════════════════════

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        edFrames.push(ctx.getImageData(0, 0, CANVAS_W, CANVAS_H));
        document.getElementById('undo-btn').disabled = true;
        updateToolbar();
        renderOnionSkin();
        renderStrip();
        initViewer();

        // ════════════════════════════════════════════════════════════════════
        //  TABS
        // ════════════════════════════════════════════════════════════════════

        function showTab(tab) {
            document.querySelectorAll('.mp-tab-panel').forEach(p => p.style.display = 'none');
            document.querySelectorAll('.mp-tab').forEach(b => b.classList.remove('active'));
            document.getElementById('tab-' + tab).style.display = '';
            document.querySelector('.mp-tab[data-tab="' + tab + '"]').classList.add('active');
            if (tab === 'video') initVedLibrary();
        }

        // ════════════════════════════════════════════════════════════════════
        //  VIDEO EDITOR
        // ════════════════════════════════════════════════════════════════════

        let vedTl         = [];
        let vedPlaying    = false;
        let vedTimer      = null;
        let vedFi         = 0;
        let vedFlatFrames = [];

        const vedCanvas = document.getElementById('ved-canvas');
        const vedVCtx   = vedCanvas.getContext('2d');
        vedVCtx.fillStyle = '#111';
        vedVCtx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        function fmtSec(s) {
            const m = Math.floor(s / 60);
            return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
        }

        function getClipFrameCount(clip) {
            return clip.type === 'editor' ? edFrames.length : ANIMATIONS[clip.animIdx].frames.length;
        }

        function getClipFps(clip) {
            if (clip.type === 'editor')
                return Math.max(1, Math.min(24, parseInt(document.getElementById('fps-input').value) || 8));
            return Math.max(1, ANIMATIONS[clip.animIdx].fps);
        }

        function updateVedDuration() {
            if (!vedTl.length) {
                document.getElementById('ved-duration').textContent = 'Duration: —';
                return;
            }
            let total = 0;
            vedTl.forEach(c => { total += getClipFrameCount(c) / getClipFps(c); });
            document.getElementById('ved-duration').textContent = 'Duration: ' + fmtSec(total);
        }

        function vedAddClip(type, animIdx, label) {
            vedTl.push({ type, animIdx, label });
            renderVedTimeline();
            updateVedDuration();
        }

        function vedRemoveClip(i) {
            vedTl.splice(i, 1);
            renderVedTimeline();
            updateVedDuration();
        }

        function vedMoveClip(i, dir) {
            const j = i + dir;
            if (j < 0 || j >= vedTl.length) return;
            [vedTl[i], vedTl[j]] = [vedTl[j], vedTl[i]];
            renderVedTimeline();
        }

        function vedClearTimeline() {
            if (!vedTl.length) return;
            if (!confirm('Clear the timeline?')) return;
            vedStop();
            vedTl = [];
            renderVedTimeline();
            updateVedDuration();
        }

        function renderVedTimeline() {
            const list = document.getElementById('ved-timeline');
            if (!vedTl.length) {
                list.innerHTML = '<div class="empty-notice">Add clips from the library above</div>';
                return;
            }
            list.innerHTML = '';
            vedTl.forEach((clip, i) => {
                const item = document.createElement('div');
                item.className = 'ved-tl-item';

                const name = document.createElement('div');
                name.className = 'ved-tl-item-name';
                name.textContent = (i + 1) + '. ' + clip.label;
                item.appendChild(name);

                if (i > 0) {
                    const upBtn = document.createElement('button');
                    upBtn.className = 'ved-tl-btn';
                    upBtn.textContent = '↑';
                    upBtn.addEventListener('click', () => vedMoveClip(i, -1));
                    item.appendChild(upBtn);
                }
                if (i < vedTl.length - 1) {
                    const downBtn = document.createElement('button');
                    downBtn.className = 'ved-tl-btn';
                    downBtn.textContent = '↓';
                    downBtn.addEventListener('click', () => vedMoveClip(i, 1));
                    item.appendChild(downBtn);
                }

                const rmBtn = document.createElement('button');
                rmBtn.className = 'ved-tl-btn remove';
                rmBtn.textContent = '×';
                rmBtn.addEventListener('click', () => vedRemoveClip(i));
                item.appendChild(rmBtn);

                list.appendChild(item);
            });
        }

        function vedBuildFlatFrames() {
            vedFlatFrames = [];
            const tmp = document.createElement('canvas');
            tmp.width = CANVAS_W; tmp.height = CANVAS_H;
            const tc = tmp.getContext('2d');

            vedTl.forEach(clip => {
                const fps = getClipFps(clip);
                if (clip.type === 'editor') {
                    saveCurrentFrame();
                    edFrames.forEach(f => {
                        tc.putImageData(f, 0, 0);
                        vedFlatFrames.push({ dataUrl: tmp.toDataURL('image/png'), fps });
                    });
                } else {
                    ANIMATIONS[clip.animIdx].frames.forEach(f => {
                        vedFlatFrames.push({ dataUrl: f, fps });
                    });
                }
            });
        }

        function vedShowFrame(fi) {
            if (!vedFlatFrames.length) return;
            const frame = vedFlatFrames[fi];
            const img = new Image();
            img.onload = () => vedVCtx.drawImage(img, 0, 0, CANVAS_W, CANVAS_H);
            img.src = frame.dataUrl;
            const pct = vedFlatFrames.length > 1 ? (fi / (vedFlatFrames.length - 1)) * 100 : 100;
            document.getElementById('ved-bar').style.width = pct + '%';
            document.getElementById('ved-frame-label').textContent = (fi + 1) + ' / ' + vedFlatFrames.length;
        }

        function vedPlayNext() {
            if (!vedPlaying) return;
            vedShowFrame(vedFi);
            const fps = vedFlatFrames[vedFi].fps;
            vedFi = (vedFi + 1) % vedFlatFrames.length;
            vedTimer = setTimeout(vedPlayNext, 1000 / fps);
        }

        function vedPlay() {
            if (vedPlaying) return;
            if (!vedTl.length) { alert('Add clips to the timeline first.'); return; }
            vedBuildFlatFrames();
            if (!vedFlatFrames.length) return;
            vedPlaying = true;
            vedFi = 0;
            document.getElementById('ved-btn-play').disabled = true;
            document.getElementById('ved-btn-stop').disabled = false;
            vedPlayNext();
        }

        function vedStop() {
            clearTimeout(vedTimer);
            vedPlaying = false;
            document.getElementById('ved-btn-play').disabled = false;
            document.getElementById('ved-btn-stop').disabled = true;
        }

        function vedExport() {
            if (!vedTl.length) { alert('Add clips to the timeline first.'); return; }
            vedBuildFlatFrames();
            if (!vedFlatFrames.length) return;
            let i = 0;
            function next() {
                if (i >= vedFlatFrames.length) return;
                const a = document.createElement('a');
                a.download = 'video-frame-' + String(i + 1).padStart(4, '0') + '.png';
                a.href = vedFlatFrames[i].dataUrl;
                a.click();
                i++;
                setTimeout(next, 80);
            }
            next();
        }

        function initVedLibrary() {
            const lib = document.getElementById('ved-library');
            lib.innerHTML = '';

            const edCard = buildVedLibCard('editor', null, 'Editor Work (' + edFrames.length + ' frame' + (edFrames.length !== 1 ? 's' : '') + ')', null);
            lib.appendChild(edCard);

            ANIMATIONS.forEach((anim, i) => {
                const lbl = anim.title + ' · ' + anim.date + ' (' + anim.frames.length + ' frames)';
                lib.appendChild(buildVedLibCard('anim', i, lbl, anim.frames[0]));
            });

            if (!ANIMATIONS.length) {
                const note = document.createElement('span');
                note.style.cssText = 'font-family:"Courier New",monospace;font-size:10px;color:#444;padding:8px 0;';
                note.textContent = 'Publish animations from the Frame Editor to add them here.';
                lib.appendChild(note);
            }
        }

        function buildVedLibCard(type, animIdx, label, firstFrameSrc) {
            const card = document.createElement('div');
            card.className = 'ved-clip-card';

            const thumbDiv = document.createElement('div');
            thumbDiv.className = 'ved-clip-thumb';
            const tc = document.createElement('canvas');
            tc.width = 98; tc.height = 98;
            thumbDiv.appendChild(tc);

            if (type === 'editor' && edFrames.length) {
                const tmp = document.createElement('canvas');
                tmp.width = CANVAS_W; tmp.height = CANVAS_H;
                saveCurrentFrame();
                tmp.getContext('2d').putImageData(edFrames[0], 0, 0);
                tc.getContext('2d').drawImage(tmp, 0, 0, 98, 98);
            } else if (firstFrameSrc) {
                const img = new Image();
                img.onload = () => tc.getContext('2d').drawImage(img, 0, 0, 98, 98);
                img.src = firstFrameSrc;
            }

            const nameEl = document.createElement('div');
            nameEl.className = 'ved-clip-name';
            nameEl.textContent = label;

            const addBtn = document.createElement('button');
            addBtn.className = 'ved-add-btn';
            addBtn.textContent = '+ Add';
            addBtn.addEventListener('click', () => vedAddClip(type, animIdx, label));

            card.appendChild(thumbDiv);
            card.appendChild(nameEl);
            card.appendChild(addBtn);
            return card;
        }

        // ════════════════════════════════════════════════════════════════════
        //  SOUNDBOARD
        // ════════════════════════════════════════════════════════════════════

        function makeNoise(actx, dur) {
            const n = Math.ceil(actx.sampleRate * dur);
            const b = actx.createBuffer(1, n, actx.sampleRate);
            const d = b.getChannelData(0);
            for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
            const s = actx.createBufferSource();
            s.buffer = b;
            return s;
        }

        function bufferToWav(audioBuffer) {
            const nc = audioBuffer.numberOfChannels;
            const sr = audioBuffer.sampleRate;
            const len = audioBuffer.length;
            const bps = 2;
            const size = 44 + len * nc * bps;
            const buf = new ArrayBuffer(size);
            const v = new DataView(buf);
            function ws(o, s) { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
            ws(0, 'RIFF'); v.setUint32(4, size - 8, true); ws(8, 'WAVE');
            ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
            v.setUint16(22, nc, true); v.setUint32(24, sr, true);
            v.setUint32(28, sr * nc * bps, true); v.setUint16(32, nc * bps, true); v.setUint16(34, 16, true);
            ws(36, 'data'); v.setUint32(40, len * nc * bps, true);
            let off = 44;
            for (let i = 0; i < len; i++) {
                for (let c = 0; c < nc; c++) {
                    const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(c)[i]));
                    v.setInt16(off, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                    off += 2;
                }
            }
            return new Blob([buf], { type: 'audio/wav' });
        }

        let sbCtx = null;
        function getSbCtx() {
            if (!sbCtx) sbCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (sbCtx.state === 'suspended') sbCtx.resume();
            return sbCtx;
        }

        function playSound(s) {
            const actx = getSbCtx();
            s.gen(actx, actx.destination, actx.currentTime);
            const card = document.getElementById('sb-' + s.id);
            if (card) {
                card.classList.add('playing');
                setTimeout(() => card.classList.remove('playing'), s.dur * 1000);
            }
        }

        async function downloadSound(s) {
            const rate = 44100;
            const offCtx = new OfflineAudioContext(1, Math.ceil((s.dur + 0.1) * rate), rate);
            s.gen(offCtx, offCtx.destination, 0);
            const buffer = await offCtx.startRendering();
            const blob = bufferToWav(buffer);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = s.id + '.wav'; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
        }

        const SOUNDS = [
            {
                id: 'dramatic-sting', emoji: '🎭', label: 'Dramatic Sting', dur: 2.0,
                gen(actx, dst, t) {
                    [130.8, 155.6, 196, 261.6].forEach(freq => {
                        const osc = actx.createOscillator();
                        const g = actx.createGain();
                        osc.type = 'sawtooth';
                        osc.frequency.value = freq;
                        g.gain.setValueAtTime(0, t);
                        g.gain.linearRampToValueAtTime(0.18, t + 0.02);
                        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
                        osc.connect(g); g.connect(dst);
                        osc.start(t); osc.stop(t + 2.0);
                    });
                }
            },
            {
                id: 'comedy-boing', emoji: '🎪', label: 'Comedy Boing', dur: 0.9,
                gen(actx, dst, t) {
                    const osc = actx.createOscillator();
                    const g = actx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(80, t);
                    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
                    osc.frequency.exponentialRampToValueAtTime(500, t + 0.9);
                    g.gain.setValueAtTime(0.6, t);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
                    osc.connect(g); g.connect(dst);
                    osc.start(t); osc.stop(t + 0.9);
                }
            },
            {
                id: 'record-scratch', emoji: '💿', label: 'Record Scratch', dur: 0.5,
                gen(actx, dst, t) {
                    const ns = makeNoise(actx, 0.5);
                    const filt = actx.createBiquadFilter();
                    const g = actx.createGain();
                    filt.type = 'bandpass'; filt.Q.value = 4;
                    filt.frequency.setValueAtTime(150, t);
                    filt.frequency.exponentialRampToValueAtTime(3000, t + 0.1);
                    filt.frequency.exponentialRampToValueAtTime(100, t + 0.5);
                    g.gain.setValueAtTime(1.2, t);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
                    ns.connect(filt); filt.connect(g); g.connect(dst);
                    ns.start(t); ns.stop(t + 0.5);
                }
            },
            {
                id: 'whoosh', emoji: '💨', label: 'Whoosh', dur: 0.6,
                gen(actx, dst, t) {
                    const ns = makeNoise(actx, 0.6);
                    const filt = actx.createBiquadFilter();
                    const g = actx.createGain();
                    filt.type = 'bandpass'; filt.Q.value = 2;
                    filt.frequency.setValueAtTime(200, t);
                    filt.frequency.exponentialRampToValueAtTime(6000, t + 0.3);
                    filt.frequency.exponentialRampToValueAtTime(200, t + 0.6);
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(1.0, t + 0.05);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
                    ns.connect(filt); filt.connect(g); g.connect(dst);
                    ns.start(t); ns.stop(t + 0.6);
                }
            },
            {
                id: 'thunder', emoji: '⛈️', label: 'Thunder Crack', dur: 2.5,
                gen(actx, dst, t) {
                    const ns = makeNoise(actx, 2.5);
                    const filt = actx.createBiquadFilter();
                    const g = actx.createGain();
                    filt.type = 'lowpass'; filt.frequency.value = 200;
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(1.2, t + 0.01);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
                    ns.connect(filt); filt.connect(g); g.connect(dst);
                    ns.start(t); ns.stop(t + 2.5);
                }
            },
            {
                id: 'applause', emoji: '👏', label: 'Audience Applause', dur: 3.0,
                gen(actx, dst, t) {
                    const ns = makeNoise(actx, 3.0);
                    const filt = actx.createBiquadFilter();
                    const g = actx.createGain();
                    const lfo = actx.createOscillator();
                    const lfoG = actx.createGain();
                    filt.type = 'bandpass'; filt.frequency.value = 3000; filt.Q.value = 1.5;
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(0.6, t + 0.3);
                    g.gain.setValueAtTime(0.6, t + 2.5);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.0);
                    lfo.type = 'sine'; lfo.frequency.value = 5;
                    lfoG.gain.value = 0.25;
                    lfo.connect(lfoG); lfoG.connect(g.gain);
                    ns.connect(filt); filt.connect(g); g.connect(dst);
                    lfo.start(t); lfo.stop(t + 3.0);
                    ns.start(t); ns.stop(t + 3.0);
                }
            },
            {
                id: 'slide-up', emoji: '📈', label: 'Slide Whistle ↑', dur: 0.9,
                gen(actx, dst, t) {
                    const osc = actx.createOscillator();
                    const g = actx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(200, t);
                    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.9);
                    g.gain.setValueAtTime(0.5, t);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
                    osc.connect(g); g.connect(dst);
                    osc.start(t); osc.stop(t + 0.9);
                }
            },
            {
                id: 'slide-down', emoji: '📉', label: 'Slide Whistle ↓', dur: 0.9,
                gen(actx, dst, t) {
                    const osc = actx.createOscillator();
                    const g = actx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(1600, t);
                    osc.frequency.exponentialRampToValueAtTime(200, t + 0.9);
                    g.gain.setValueAtTime(0.5, t);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
                    osc.connect(g); g.connect(dst);
                    osc.start(t); osc.stop(t + 0.9);
                }
            },
            {
                id: 'horror-sting', emoji: '😱', label: 'Horror Sting', dur: 2.5,
                gen(actx, dst, t) {
                    [130.8, 185.0].forEach(freq => {
                        const osc = actx.createOscillator();
                        const g = actx.createGain();
                        const lfo = actx.createOscillator();
                        const lfoG = actx.createGain();
                        osc.type = 'sawtooth'; osc.frequency.value = freq;
                        g.gain.setValueAtTime(0, t);
                        g.gain.linearRampToValueAtTime(0.25, t + 0.8);
                        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
                        lfo.type = 'sine'; lfo.frequency.value = 6;
                        lfoG.gain.value = 0.1;
                        lfo.connect(lfoG); lfoG.connect(g.gain);
                        osc.connect(g); g.connect(dst);
                        lfo.start(t); lfo.stop(t + 2.5);
                        osc.start(t); osc.stop(t + 2.5);
                    });
                }
            },
            {
                id: 'victory', emoji: '🏆', label: 'Victory Fanfare', dur: 1.5,
                gen(actx, dst, t) {
                    [293.7, 370.0, 440.0, 587.3].forEach((freq, i) => {
                        const osc = actx.createOscillator();
                        const g = actx.createGain();
                        osc.type = 'square'; osc.frequency.value = freq;
                        const st = t + i * 0.3;
                        const dur = i === 3 ? 0.6 : 0.25;
                        g.gain.setValueAtTime(0, st);
                        g.gain.linearRampToValueAtTime(0.2, st + 0.01);
                        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
                        osc.connect(g); g.connect(dst);
                        osc.start(st); osc.stop(st + dur);
                    });
                }
            },
            {
                id: 'typewriter', emoji: '⌨️', label: 'Typewriter Clack', dur: 0.08,
                gen(actx, dst, t) {
                    const ns = makeNoise(actx, 0.08);
                    const filt = actx.createBiquadFilter();
                    const g = actx.createGain();
                    filt.type = 'highpass'; filt.frequency.value = 3000;
                    g.gain.setValueAtTime(1.0, t);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
                    ns.connect(filt); filt.connect(g); g.connect(dst);
                    ns.start(t); ns.stop(t + 0.08);
                }
            },
            {
                id: 'film-projector', emoji: '🎞️', label: 'Film Projector', dur: 3.0,
                gen(actx, dst, t) {
                    for (let i = 0; i < 18; i++) {
                        const st = t + i / 6;
                        const ns = makeNoise(actx, 0.04);
                        const filt = actx.createBiquadFilter();
                        const g = actx.createGain();
                        filt.type = 'bandpass'; filt.frequency.value = 1200; filt.Q.value = 5;
                        g.gain.setValueAtTime(0.8, st);
                        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.04);
                        ns.connect(filt); filt.connect(g); g.connect(dst);
                        ns.start(st); ns.stop(st + 0.04);
                    }
                }
            },
            {
                id: 'sword-swish', emoji: '⚔️', label: 'Sword Swish', dur: 0.5,
                gen(actx, dst, t) {
                    const ns = makeNoise(actx, 0.5);
                    const filt = actx.createBiquadFilter();
                    const g = actx.createGain();
                    filt.type = 'bandpass'; filt.Q.value = 1.5;
                    filt.frequency.setValueAtTime(3000, t);
                    filt.frequency.exponentialRampToValueAtTime(8000, t + 0.15);
                    filt.frequency.exponentialRampToValueAtTime(1000, t + 0.5);
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(0.8, t + 0.05);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
                    ns.connect(filt); filt.connect(g); g.connect(dst);
                    ns.start(t); ns.stop(t + 0.5);
                }
            },
            {
                id: 'glass-break', emoji: '🪟', label: 'Glass Break', dur: 0.9,
                gen(actx, dst, t) {
                    const ns = makeNoise(actx, 0.2);
                    const hpf = actx.createBiquadFilter();
                    const ng = actx.createGain();
                    hpf.type = 'highpass'; hpf.frequency.value = 2000;
                    ng.gain.setValueAtTime(1.0, t);
                    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
                    ns.connect(hpf); hpf.connect(ng); ng.connect(dst);
                    ns.start(t); ns.stop(t + 0.2);
                    [1800, 2400, 3200].forEach(freq => {
                        const osc = actx.createOscillator();
                        const g = actx.createGain();
                        osc.type = 'sine'; osc.frequency.value = freq;
                        g.gain.setValueAtTime(0.15, t);
                        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
                        osc.connect(g); g.connect(dst);
                        osc.start(t); osc.stop(t + 0.9);
                    });
                }
            },
            {
                id: 'door-slam', emoji: '🚪', label: 'Door Slam', dur: 0.6,
                gen(actx, dst, t) {
                    const ns = makeNoise(actx, 0.6);
                    const filt = actx.createBiquadFilter();
                    const g = actx.createGain();
                    filt.type = 'lowpass'; filt.frequency.value = 300;
                    g.gain.setValueAtTime(0, t);
                    g.gain.linearRampToValueAtTime(1.5, t + 0.01);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
                    ns.connect(filt); filt.connect(g); g.connect(dst);
                    ns.start(t); ns.stop(t + 0.6);
                }
            },
            {
                id: 'cartoon-run', emoji: '🏃', label: 'Cartoon Run', dur: 1.2,
                gen(actx, dst, t) {
                    [200,280,380,500,640,800,1000,800,640,500,380,280].forEach((freq, i) => {
                        const osc = actx.createOscillator();
                        const g = actx.createGain();
                        osc.type = 'sine'; osc.frequency.value = freq;
                        const st = t + i * 0.1;
                        g.gain.setValueAtTime(0.3, st);
                        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.09);
                        osc.connect(g); g.connect(dst);
                        osc.start(st); osc.stop(st + 0.1);
                    });
                }
            },
        ];

        function initSoundboard() {
            const grid = document.getElementById('soundboard-grid');
            SOUNDS.forEach(s => {
                const card = document.createElement('div');
                card.className = 'sb-card';
                card.id = 'sb-' + s.id;

                const emoji = document.createElement('span');
                emoji.className = 'sb-emoji';
                emoji.textContent = s.emoji;

                const label = document.createElement('span');
                label.className = 'sb-label';
                label.textContent = s.label;

                const dur = document.createElement('span');
                dur.className = 'sb-dur';
                dur.textContent = s.dur.toFixed(1) + 's';

                const btns = document.createElement('div');
                btns.className = 'sb-btns';

                const playBtn = document.createElement('button');
                playBtn.className = 'sb-btn sb-btn-play';
                playBtn.textContent = '▶ Play';
                playBtn.addEventListener('click', () => playSound(s));

                const dlBtn = document.createElement('button');
                dlBtn.className = 'sb-btn sb-btn-dl';
                dlBtn.textContent = '↓ WAV';
                dlBtn.addEventListener('click', () => downloadSound(s));

                btns.appendChild(playBtn);
                btns.appendChild(dlBtn);
                card.appendChild(emoji);
                card.appendChild(label);
                card.appendChild(dur);
                card.appendChild(btns);
                grid.appendChild(card);
            });
        }

        initSoundboard();
