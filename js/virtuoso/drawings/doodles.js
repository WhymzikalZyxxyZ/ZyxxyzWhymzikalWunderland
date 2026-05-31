// ── Colour palette ────────────────────────────────────────────────────────────
        const PALETTE = [
            '#000000','#222222','#555555','#888888','#bbbbbb','#ffffff',
            '#7b0000','#cc0000','#e85d04','#f4c21c','#a8d5a2','#23a55a',
            '#006d77','#1565c0','#4527a0','#ad1457','#6d4c41','#bcaaa4',
            '#ffcdd2','#ffe0b2','#fff9c4','#dcedc8','#b3e5fc','#e1bee7',
        ];

        // ── State ─────────────────────────────────────────────────────────────────────
        let tool       = 'pen';
        let color      = '#000000';
        let brushSz    = 4;
        let fillShapes = false;
        let isDrawing  = false;
        let startX = 0, startY = 0;
        let startSnap  = null;
        const undoStack = [];

        // ── Canvas setup ──────────────────────────────────────────────────────────────
        const canvas  = document.getElementById('main-canvas');
        const ctx     = canvas.getContext('2d');
        const overlay = document.getElementById('overlay-canvas');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // ── Coordinate helper ─────────────────────────────────────────────────────────
        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (canvas.width  / rect.width),
                y: (e.clientY - rect.top)  * (canvas.height / rect.height)
            };
        }

        // ── Undo stack ────────────────────────────────────────────────────────────────
        function pushUndo(snap) {
            undoStack.push(snap !== undefined ? snap : ctx.getImageData(0, 0, canvas.width, canvas.height));
            if (undoStack.length > 20) undoStack.shift();
            document.getElementById('undo-btn').disabled = false;
        }

        function undoLast() {
            if (!undoStack.length) return;
            ctx.putImageData(undoStack.pop(), 0, 0);
            document.getElementById('undo-btn').disabled = undoStack.length === 0;
        }

        // ── Draw helpers ──────────────────────────────────────────────────────────────
        function applyPenStyle() {
            ctx.lineWidth   = brushSz;
            ctx.lineCap     = 'round';
            ctx.lineJoin    = 'round';
            ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
            ctx.fillStyle   = color;
        }

        function drawShape(cx, sx, sy, ex, ey) {
            cx.lineWidth   = brushSz;
            cx.lineCap     = 'round';
            cx.lineJoin    = 'round';
            cx.strokeStyle = color;
            cx.fillStyle   = color;
            cx.beginPath();
            switch (tool) {
                case 'line':
                    cx.moveTo(sx, sy);
                    cx.lineTo(ex, ey);
                    cx.stroke();
                    break;
                case 'rect':
                    if (fillShapes) cx.fillRect(sx, sy, ex - sx, ey - sy);
                    cx.strokeRect(sx, sy, ex - sx, ey - sy);
                    break;
                case 'circle': {
                    const rx = (ex - sx) / 2, ry = (ey - sy) / 2;
                    cx.ellipse(sx + rx, sy + ry, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
                    if (fillShapes) cx.fill();
                    cx.stroke();
                    break;
                }
                case 'triangle':
                    cx.moveTo((sx + ex) / 2, sy);
                    cx.lineTo(ex, ey);
                    cx.lineTo(sx, ey);
                    cx.closePath();
                    if (fillShapes) cx.fill();
                    cx.stroke();
                    break;
            }
        }

        // ── Mouse / touch events ──────────────────────────────────────────────────────
        function onDown(e) {
            e.preventDefault();
            overlay.setPointerCapture(e.pointerId);
            const { x, y } = getPos(e);
            isDrawing = true;
            startX = x; startY = y;
            startSnap = ctx.getImageData(0, 0, canvas.width, canvas.height);

            if (tool === 'pen' || tool === 'eraser') {
                pushUndo(startSnap);
                applyPenStyle();
                ctx.beginPath();
                ctx.moveTo(x, y);
            }
        }

        function onMove(e) {
            e.preventDefault();
            if (!isDrawing) return;
            const { x, y } = getPos(e);

            if (tool === 'pen' || tool === 'eraser') {
                applyPenStyle();
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y);
            } else {
                ctx.putImageData(startSnap, 0, 0);
                drawShape(ctx, startX, startY, x, y);
            }
        }

        function onUp(e) {
            if (!isDrawing) return;
            isDrawing = false;
            if (tool !== 'pen' && tool !== 'eraser') {
                const { x, y } = getPos(e);
                ctx.putImageData(startSnap, 0, 0);
                pushUndo(startSnap);
                drawShape(ctx, startX, startY, x, y);
            }
            ctx.beginPath();
        }

        overlay.addEventListener('pointerdown',   onDown);
        overlay.addEventListener('pointermove',   onMove);
        overlay.addEventListener('pointerup',     onUp);
        overlay.addEventListener('pointercancel', onUp);

        // ── Tool selection ────────────────────────────────────────────────────────────
        const ALL_TOOLS = ['pen','eraser','line','rect','circle','triangle'];

        function setTool(t) {
            tool = t;
            ALL_TOOLS.forEach(id =>
                document.getElementById('btn-' + id).classList.toggle('active', id === t)
            );
            overlay.style.cursor = t === 'eraser' ? 'cell' : 'crosshair';
        }

        // ── Size slider ───────────────────────────────────────────────────────────────
        document.getElementById('size-slider').addEventListener('input', function () {
            brushSz = +this.value;
            document.getElementById('size-label').textContent = brushSz + ' px';
        });

        // ── Fill checkbox ─────────────────────────────────────────────────────────────
        document.getElementById('fill-check').addEventListener('change', function () {
            fillShapes = this.checked;
        });

        // ── Colour palette ────────────────────────────────────────────────────────────
        const paletteGrid = document.getElementById('palette-grid');
        let selectedSwatch = null;

        function setColor(c) {
            color = c;
            document.getElementById('active-swatch').style.background = c;
            document.getElementById('custom-color-btn').value = c;
        }

        PALETTE.forEach((c, i) => {
            const sw = document.createElement('div');
            sw.className = 'pal-swatch';
            sw.style.background = c;
            sw.title = c;
            sw.addEventListener('click', () => {
                if (selectedSwatch) selectedSwatch.classList.remove('selected');
                sw.classList.add('selected');
                selectedSwatch = sw;
                setColor(c);
            });
            paletteGrid.appendChild(sw);
            if (i === 0) { sw.classList.add('selected'); selectedSwatch = sw; }
        });

        document.getElementById('custom-color-btn').addEventListener('input', function () {
            if (selectedSwatch) selectedSwatch.classList.remove('selected');
            selectedSwatch = null;
            setColor(this.value);
        });

        document.getElementById('active-swatch').style.background = color;
        document.getElementById('undo-btn').disabled = true;

        // ── Clear ─────────────────────────────────────────────────────────────────────
        function clearCanvas() {
            if (!confirm('Clear the canvas? This cannot be undone.')) return;
            undoStack.length = 0;
            document.getElementById('undo-btn').disabled = true;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // ── Download ──────────────────────────────────────────────────────────────────
        function downloadCanvas() {
            const now = new Date();
            const ts  = [
                now.getFullYear(),
                String(now.getMonth() + 1).padStart(2, '0'),
                String(now.getDate()).padStart(2, '0'),
                String(now.getHours()).padStart(2, '0'),
                String(now.getMinutes()).padStart(2, '0'),
                String(now.getSeconds()).padStart(2, '0'),
            ].join('');
            const a = document.createElement('a');
            a.download = 'panel-' + ts + '.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
        }

        // ── Image upload ──────────────────────────────────────────────────────────────
        document.getElementById('img-upload').addEventListener('change', function () {
            const file = this.files[0];
            if (!file || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = function (ev) {
                const img = new Image();
                img.onload = function () {
                    pushUndo();
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
                    const w = img.width * scale;
                    const h = img.height * scale;
                    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
            this.value = '';
        });
