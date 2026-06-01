// ════════════════════════════════════════════════════════════════════
        //  CONFIG
        // ════════════════════════════════════════════════════════════════════

        const WAVE_W = 1200;
        const WAVE_H = 80;
        const MAX_TRACKS = 8;
        const TRACK_COLORS = [
            '#4fc3f7', '#81c784', '#e57373', '#ffb74d',
            '#ce93d8', '#80cbc4', '#fff176', '#ff8a65',
        ];

        // ════════════════════════════════════════════════════════════════════
        //  STATE
        // ════════════════════════════════════════════════════════════════════

        let tracks       = [];
        let trackIdSeq   = 0;
        let clips        = [];
        let clipIdSeq    = 0;
        let masterVol    = 1.0;
        let playPosition = 0;
        let isPlaying    = false;
        let playCtxStart = 0;
        let playOffset   = 0;
        let rafId        = null;
        let actx         = null;

        let loopEnabled  = false;
        let isRecording  = false;
        let micStream    = null;
        let micRecorder  = null;
        let micChunks    = [];

        // ════════════════════════════════════════════════════════════════════
        //  AUDIO CONTEXT
        // ════════════════════════════════════════════════════════════════════

        function getActx() {
            if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
            if (actx.state === 'suspended') actx.resume();
            return actx;
        }

        // ════════════════════════════════════════════════════════════════════
        //  HELPERS
        // ════════════════════════════════════════════════════════════════════

        function fmtTime(s) {
            if (!isFinite(s) || s < 0) s = 0;
            const m  = Math.floor(s / 60);
            const sc = Math.floor(s % 60);
            const cs = Math.floor((s % 1) * 100);
            return String(m).padStart(2, '0') + ':' +
                   String(sc).padStart(2, '0') + '.' +
                   String(cs).padStart(2, '0');
        }

        function bufferToWav(audioBuffer) {
            const nc  = audioBuffer.numberOfChannels;
            const sr  = audioBuffer.sampleRate;
            const len = audioBuffer.length;
            const bps = 2;
            const total = 44 + len * nc * bps;
            const ab  = new ArrayBuffer(total);
            const v   = new DataView(ab);
            function ws(o, s) { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); }
            ws(0, 'RIFF'); v.setUint32(4, total - 8, true); ws(8, 'WAVE');
            ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
            v.setUint16(22, nc, true); v.setUint32(24, sr, true);
            v.setUint32(28, sr * nc * bps, true); v.setUint16(32, nc * bps, true); v.setUint16(34, 16, true);
            ws(36, 'data'); v.setUint32(40, len * nc * bps, true);
            const ch = [];
            for (let c = 0; c < nc; c++) ch.push(audioBuffer.getChannelData(c));
            let off = 44;
            for (let i = 0; i < len; i++) {
                for (let c = 0; c < nc; c++) {
                    const s = Math.max(-1, Math.min(1, ch[c][i]));
                    v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
                    off += 2;
                }
            }
            return new Blob([ab], { type: 'audio/wav' });
        }

        function triggerDownload(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            setTimeout(() => URL.revokeObjectURL(url), 3000);
        }

        // ════════════════════════════════════════════════════════════════════
        //  PEAK COMPUTATION
        // ════════════════════════════════════════════════════════════════════

        function computePeaks(buffer, width) {
            const data  = buffer.getChannelData(0);
            const total = data.length;
            const peaks = new Float32Array(width * 2);
            for (let x = 0; x < width; x++) {
                const s = Math.floor((x / width) * total);
                const e = Math.floor(((x + 1) / width) * total);
                let mn = 0, mx = 0;
                for (let i = s; i < e && i < total; i++) {
                    const v = data[i];
                    if (v > mx) mx = v;
                    if (v < mn) mn = v;
                }
                peaks[x * 2]     = mn;
                peaks[x * 2 + 1] = mx;
            }
            return peaks;
        }

        // ════════════════════════════════════════════════════════════════════
        //  WAVEFORM DRAWING
        // ════════════════════════════════════════════════════════════════════

        function drawWaveform(track) {
            const canvas = track.waveCanvas;
            if (!canvas) return;
            const c = canvas.getContext('2d');
            const W = WAVE_W;
            const H = WAVE_H;

            c.fillStyle = '#080808';
            c.fillRect(0, 0, W, H);

            if (!track.buffer || !track.peaks) return;

            const dur = track.buffer.duration;

            // Selection fill
            if (track.selA !== null && track.selB !== null) {
                const x1 = (Math.min(track.selA, track.selB) / dur) * W;
                const x2 = (Math.max(track.selA, track.selB) / dur) * W;
                c.fillStyle = 'rgba(244,162,97,0.13)';
                c.fillRect(x1, 0, x2 - x1, H);
            }

            // Grid line at center
            c.strokeStyle = 'rgba(255,255,255,0.04)';
            c.lineWidth = 1;
            c.beginPath(); c.moveTo(0, H / 2); c.lineTo(W, H / 2); c.stroke();

            // Waveform peaks
            c.strokeStyle = track.color;
            c.lineWidth = 1;
            const cy = H / 2;
            for (let x = 0; x < W; x++) {
                const mn = track.peaks[x * 2];
                const mx = track.peaks[x * 2 + 1];
                const top    = cy - mx * cy;
                const bottom = cy - mn * cy;
                c.beginPath();
                c.moveTo(x + 0.5, top);
                c.lineTo(x + 0.5, Math.max(bottom, top + 1));
                c.stroke();
            }

            // Selection markers
            c.lineWidth = 2;
            if (track.selA !== null) {
                const sx = (track.selA / dur) * W;
                c.strokeStyle = '#f4a261';
                c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, H); c.stroke();
            }
            if (track.selB !== null) {
                const sx = (track.selB / dur) * W;
                c.strokeStyle = '#f4a261';
                c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, H); c.stroke();
            }

            // Playback cursor
            if (dur > 0 && playPosition <= dur) {
                const cx = (playPosition / dur) * W;
                c.strokeStyle = 'rgba(255,255,255,0.7)';
                c.lineWidth = 1.5;
                c.setLineDash([4, 4]);
                c.beginPath(); c.moveTo(cx, 0); c.lineTo(cx, H); c.stroke();
                c.setLineDash([]);
            }
        }

        function drawMiniWave(canvas, buffer, color) {
            if (!canvas || !buffer) return;
            const peaks = computePeaks(buffer, canvas.width);
            const c = canvas.getContext('2d');
            const W = canvas.width;
            const H = canvas.height;
            c.fillStyle = '#0a0a0a';
            c.fillRect(0, 0, W, H);
            c.strokeStyle = color;
            c.lineWidth = 1;
            const cy = H / 2;
            for (let x = 0; x < W; x++) {
                const top    = cy - peaks[x * 2 + 1] * cy;
                const bottom = cy - peaks[x * 2] * cy;
                c.beginPath();
                c.moveTo(x + 0.5, top);
                c.lineTo(x + 0.5, Math.max(bottom, top + 1));
                c.stroke();
            }
        }

        // ════════════════════════════════════════════════════════════════════
        //  WAVEFORM INTERACTION
        // ════════════════════════════════════════════════════════════════════

        function getWaveTime(track, e) {
            const r = track.waveCanvas.getBoundingClientRect();
            const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
            return frac * track.buffer.duration;
        }

        function attachWaveEvents(track) {
            const canvas = track.waveCanvas;
            if (!canvas) return;

            canvas.addEventListener('pointerdown', e => {
                if (!track.buffer) return;
                canvas.setPointerCapture(e.pointerId);
                track._dragStart = getWaveTime(track, e);
                track._dragging  = true;
                track.selA = track._dragStart;
                track.selB = null;
                updateSelInfo(track);
                drawWaveform(track);
            });

            canvas.addEventListener('pointermove', e => {
                if (!track._dragging) return;
                track.selB = getWaveTime(track, e);
                updateSelInfo(track);
                drawWaveform(track);
            });

            canvas.addEventListener('pointerup', e => {
                if (!track._dragging) return;
                track._dragging = false;
                const t = getWaveTime(track, e);
                if (track.selB === null || Math.abs(track.selB - track.selA) < 0.05) {
                    // click → set play position
                    playPosition = track.selA;
                    track.selA = null; track.selB = null;
                    updateSelInfo(track);
                    if (!isPlaying) tracks.forEach(tr => drawWaveform(tr));
                    document.getElementById('position-display').textContent = fmtTime(playPosition);
                } else {
                    track.selB = t;
                    updateSelInfo(track);
                    drawWaveform(track);
                }
            });
        }

        function updateSelInfo(track) {
            const el = track.domEl ? track.domEl.querySelector('.sel-info') : null;
            if (!el) return;
            if (track.selA !== null && track.selB !== null &&
                Math.abs(track.selB - track.selA) >= 0.05) {
                const s = Math.min(track.selA, track.selB);
                const e = Math.max(track.selA, track.selB);
                el.textContent = fmtTime(s) + ' – ' + fmtTime(e) +
                    '  (' + (e - s).toFixed(2) + 's)';
            } else {
                el.textContent = '';
            }
        }

        // ════════════════════════════════════════════════════════════════════
        //  TRACK MANAGEMENT
        // ════════════════════════════════════════════════════════════════════

        function addTrack() {
            if (tracks.length >= MAX_TRACKS) { alert('Maximum ' + MAX_TRACKS + ' tracks.'); return; }
            const id = ++trackIdSeq;
            const track = {
                id,
                name:     'Track ' + id,
                color:    TRACK_COLORS[(id - 1) % TRACK_COLORS.length],
                buffer:   null,
                fileName: '',
                peaks:    null,
                volume:   1.0,
                pan:      0,
                muted:    false,
                soloed:   false,
                selA:     null,
                selB:     null,
                _dragging: false,
                domEl:    null,
                waveCanvas: null,
                activeSource: null,
                activeGain:   null,
                activePan:    null,
                eq: { low: 0, mid: 0, high: 0 },
                fxOpen: false,
            };
            tracks.push(track);
            renderTrack(track);
        }

        function removeTrack(id) {
            const i = tracks.findIndex(t => t.id === id);
            if (i === -1) return;
            const track = tracks[i];
            stopTrackSource(track);
            if (track.domEl) track.domEl.remove();
            tracks.splice(i, 1);
        }

        function renderTrack(track) {
            const el = document.createElement('div');
            el.className = 'track';
            el.dataset.trackId = track.id;
            track.domEl = el;

            // Color accent
            const accent = document.createElement('div');
            accent.className = 'track-accent';
            accent.style.background = track.color;
            el.appendChild(accent);

            // Sidebar
            const sidebar = document.createElement('div');
            sidebar.className = 'track-sidebar';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'track-name-input';
            nameInput.value = track.name;
            nameInput.maxLength = 30;
            nameInput.addEventListener('input', () => { track.name = nameInput.value; });
            sidebar.appendChild(nameInput);

            // Volume
            const volRow = document.createElement('div');
            volRow.className = 'ctrl-row';
            const volLbl = document.createElement('span');
            volLbl.className = 'ctrl-lbl'; volLbl.textContent = 'VOL';
            const volSlider = document.createElement('input');
            volSlider.type = 'range'; volSlider.className = 'ctrl-slider';
            volSlider.min = 0; volSlider.max = 100; volSlider.value = 100;
            const volVal = document.createElement('span');
            volVal.className = 'ctrl-val'; volVal.textContent = '100%';
            volSlider.addEventListener('input', () => {
                track.volume = volSlider.value / 100;
                volVal.textContent = volSlider.value + '%';
                if (track.activeGain) track.activeGain.gain.value = track.volume * masterVol;
            });
            volRow.appendChild(volLbl); volRow.appendChild(volSlider); volRow.appendChild(volVal);
            sidebar.appendChild(volRow);

            // Pan
            const panRow = document.createElement('div');
            panRow.className = 'ctrl-row';
            const panLbl = document.createElement('span');
            panLbl.className = 'ctrl-lbl'; panLbl.textContent = 'PAN';
            const panSlider = document.createElement('input');
            panSlider.type = 'range'; panSlider.className = 'ctrl-slider';
            panSlider.min = -100; panSlider.max = 100; panSlider.value = 0;
            const panVal = document.createElement('span');
            panVal.className = 'ctrl-val'; panVal.textContent = 'C';
            panSlider.addEventListener('input', () => {
                track.pan = panSlider.value / 100;
                if (track.activePan) track.activePan.pan.value = track.pan;
                const v = parseInt(panSlider.value);
                panVal.textContent = v === 0 ? 'C' : (v < 0 ? 'L' + Math.abs(v) : 'R' + v);
            });
            panRow.appendChild(panLbl); panRow.appendChild(panSlider); panRow.appendChild(panVal);
            sidebar.appendChild(panRow);

            // Mute / Solo / Remove
            const btnRow = document.createElement('div');
            btnRow.className = 'track-btns';

            const muteBtn = document.createElement('button');
            muteBtn.className = 'tk-btn'; muteBtn.textContent = 'M';
            muteBtn.title = 'Mute';
            muteBtn.addEventListener('click', () => {
                track.muted = !track.muted;
                muteBtn.classList.toggle('muted', track.muted);
                if (track.activeGain)
                    track.activeGain.gain.value = track.muted ? 0 : track.volume * masterVol;
            });

            const soloBtn = document.createElement('button');
            soloBtn.className = 'tk-btn'; soloBtn.textContent = 'S';
            soloBtn.title = 'Solo';
            soloBtn.addEventListener('click', () => {
                track.soloed = !track.soloed;
                soloBtn.classList.toggle('soloed', track.soloed);
                applySolo();
            });

            const fxBtn = document.createElement('button');
            fxBtn.className = 'tk-btn'; fxBtn.textContent = 'EQ';
            fxBtn.title = 'Show / hide EQ & FX';
            fxBtn.addEventListener('click', () => {
                track.fxOpen = !track.fxOpen;
                fxBtn.classList.toggle('soloed', track.fxOpen);
                if (track._fxPanel) track._fxPanel.classList.toggle('open', track.fxOpen);
            });

            const removeBtn = document.createElement('button');
            removeBtn.className = 'tk-btn remove-btn'; removeBtn.textContent = '×';
            removeBtn.title = 'Remove track';
            removeBtn.addEventListener('click', () => {
                if (confirm('Remove this track?')) removeTrack(track.id);
            });

            btnRow.appendChild(muteBtn); btnRow.appendChild(soloBtn); btnRow.appendChild(fxBtn); btnRow.appendChild(removeBtn);
            sidebar.appendChild(btnRow);
            el.appendChild(sidebar);

            // Main area
            const main = document.createElement('div');
            main.className = 'track-main';

            // Drop zone
            const dropZone = document.createElement('div');
            dropZone.className = 'track-drop';

            const dropIcon = document.createElement('span');
            dropIcon.className = 'track-drop-icon'; dropIcon.textContent = '🎵';

            const dropText = document.createElement('span');
            dropText.textContent = 'Drop audio or click to upload';

            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'audio/*';
            fileInput.addEventListener('change', () => {
                if (fileInput.files[0]) loadAudioFile(track, fileInput.files[0]);
            });

            dropZone.appendChild(dropIcon);
            dropZone.appendChild(dropText);
            dropZone.appendChild(fileInput);

            dropZone.addEventListener('click', () => fileInput.click());
            dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
            dropZone.addEventListener('drop', e => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                if (file) loadAudioFile(track, file);
            });
            main.appendChild(dropZone);

            // Status line (used while loading)
            const statusEl = document.createElement('div');
            statusEl.className = 'track-status';
            statusEl.style.display = 'none';
            main.appendChild(statusEl);
            track._statusEl = statusEl;
            track._dropZone = dropZone;

            // Waveform area (hidden until audio loaded)
            const waveArea = document.createElement('div');
            waveArea.className = 'track-wave-area';
            waveArea.style.display = 'none';
            track._waveArea = waveArea;

            const fileInfo = document.createElement('div');
            fileInfo.className = 'track-file-info';
            const fileNameEl = document.createElement('span');
            fileNameEl.className = 'track-file-name';
            const fileDurEl = document.createElement('span');
            track._fileNameEl = fileNameEl;
            track._fileDurEl = fileDurEl;
            fileInfo.appendChild(fileNameEl); fileInfo.appendChild(fileDurEl);

            const canvasWrap = document.createElement('div');
            canvasWrap.className = 'wave-canvas-wrap';

            const waveCanvas = document.createElement('canvas');
            waveCanvas.className = 'wave-canvas';
            waveCanvas.width = WAVE_W; waveCanvas.height = WAVE_H;
            track.waveCanvas = waveCanvas;
            canvasWrap.appendChild(waveCanvas);

            const actionsRow = document.createElement('div');
            actionsRow.className = 'track-wave-actions';

            const playSelBtn = document.createElement('button');
            playSelBtn.className = 'wave-btn';
            playSelBtn.textContent = '▶ Selection';
            playSelBtn.title = 'Play selected region';
            playSelBtn.addEventListener('click', () => playSelection(track));

            const clipBtn = document.createElement('button');
            clipBtn.className = 'wave-btn primary-wave-btn';
            clipBtn.textContent = '✂ Clip';
            clipBtn.title = 'Save selection as clip';
            clipBtn.addEventListener('click', () => createClip(track));

            const clearSelBtn = document.createElement('button');
            clearSelBtn.className = 'wave-btn';
            clearSelBtn.textContent = '⊗ Clear';
            clearSelBtn.title = 'Clear selection';
            clearSelBtn.addEventListener('click', () => {
                track.selA = null; track.selB = null;
                updateSelInfo(track); drawWaveform(track);
            });

            const replaceBtn = document.createElement('button');
            replaceBtn.className = 'wave-btn';
            replaceBtn.textContent = '⇄ Replace';
            replaceBtn.title = 'Load a different audio file';
            replaceBtn.addEventListener('click', () => fileInput.click());

            const selInfo = document.createElement('span');
            selInfo.className = 'sel-info';

            actionsRow.appendChild(playSelBtn);
            actionsRow.appendChild(clipBtn);
            actionsRow.appendChild(clearSelBtn);
            actionsRow.appendChild(replaceBtn);
            actionsRow.appendChild(selInfo);

            waveArea.appendChild(fileInfo);
            waveArea.appendChild(canvasWrap);
            waveArea.appendChild(actionsRow);
            main.appendChild(waveArea);

            // FX / EQ panel
            const fxPanel = document.createElement('div');
            fxPanel.className = 'fx-panel' + (track.fxOpen ? ' open' : '');
            track._fxPanel = fxPanel;

            const fxLbl = document.createElement('div');
            fxLbl.className = 'fx-section-lbl'; fxLbl.textContent = 'Equalizer';
            fxPanel.appendChild(fxLbl);

            const eqBands = [
                { key: 'low',  label: 'Low',  freq: '200 Hz',  color: '#4fc3f7' },
                { key: 'mid',  label: 'Mid',  freq: '1 kHz',   color: '#81c784' },
                { key: 'high', label: 'High', freq: '8 kHz',   color: '#ffb74d' },
            ];
            eqBands.forEach(band => {
                const row = document.createElement('div');
                row.className = 'eq-row';
                const lbl = document.createElement('span');
                lbl.className = 'eq-band-lbl';
                lbl.textContent = band.label;
                lbl.title = band.freq;
                const slider = document.createElement('input');
                slider.type = 'range'; slider.className = 'eq-slider';
                slider.min = -12; slider.max = 12; slider.step = 0.5;
                slider.value = track.eq[band.key];
                slider.style.accentColor = band.color;
                const val = document.createElement('span');
                val.className = 'eq-val';
                const formatGain = g => g === 0 ? '0 dB' : (g > 0 ? '+' : '') + g.toFixed(1) + ' dB';
                val.textContent = formatGain(track.eq[band.key]);
                slider.addEventListener('input', () => {
                    track.eq[band.key] = parseFloat(slider.value);
                    val.textContent = formatGain(track.eq[band.key]);
                    if (track['_eq_' + band.key])
                        track['_eq_' + band.key].gain.value = track.eq[band.key];
                });
                row.appendChild(lbl); row.appendChild(slider); row.appendChild(val);
                fxPanel.appendChild(row);
            });

            const fxActionsRow = document.createElement('div');
            fxActionsRow.className = 'fx-row';
            const resetEqBtn = document.createElement('button');
            resetEqBtn.className = 'fx-toggle';
            resetEqBtn.textContent = 'Reset EQ';
            resetEqBtn.addEventListener('click', () => {
                ['low','mid','high'].forEach(k => {
                    track.eq[k] = 0;
                    if (track['_eq_' + k]) track['_eq_' + k].gain.value = 0;
                });
                fxPanel.querySelectorAll('.eq-slider').forEach(s => { s.value = 0; });
                fxPanel.querySelectorAll('.eq-val').forEach(v => { v.textContent = '0 dB'; });
            });
            const normBtn = document.createElement('button');
            normBtn.className = 'fx-normalize-btn';
            normBtn.textContent = 'Normalize';
            normBtn.title = 'Boost track to peak at -1 dBFS';
            normBtn.addEventListener('click', () => normalizeTrack(track));
            fxActionsRow.appendChild(resetEqBtn);
            fxActionsRow.appendChild(normBtn);
            fxPanel.appendChild(fxActionsRow);
            main.appendChild(fxPanel);

            el.appendChild(main);
            document.getElementById('track-list').appendChild(el);

            // Attach interaction after canvas is in DOM
            attachWaveEvents(track);
        }

        // ════════════════════════════════════════════════════════════════════
        //  AUDIO LOADING
        // ════════════════════════════════════════════════════════════════════

        async function loadAudioFile(track, file) {
            track._statusEl.textContent = 'Decoding "' + file.name + '" …';
            track._statusEl.style.display = 'block';
            track._dropZone.style.display = 'none';
            track._waveArea.style.display = 'none';

            try {
                const ctx = getActx();
                const arrayBuf = await file.arrayBuffer();
                const audioBuf = await ctx.decodeAudioData(arrayBuf);

                track.buffer   = audioBuf;
                track.fileName = file.name;
                track.peaks    = computePeaks(audioBuf, WAVE_W);
                track.selA     = null;
                track.selB     = null;

                track._fileNameEl.textContent = file.name;
                track._fileDurEl.textContent  = fmtTime(audioBuf.duration);

                track._statusEl.style.display = 'none';
                track._waveArea.style.display  = '';
                drawWaveform(track);
            } catch (err) {
                track._statusEl.textContent = '⚠ Could not decode: ' + (err.message || 'unsupported format');
                track._dropZone.style.display = '';
            }
        }

        // ════════════════════════════════════════════════════════════════════
        //  PLAYBACK
        // ════════════════════════════════════════════════════════════════════

        function applySolo() {
            const anySoloed = tracks.some(t => t.soloed && !t.muted);
            tracks.forEach(t => {
                if (!t.activeGain) return;
                const audible = !t.muted && (anySoloed ? t.soloed : true);
                t.activeGain.gain.value = audible ? t.volume * masterVol : 0;
            });
        }

        function stopTrackSource(track) {
            if (track.activeSource) {
                try { track.activeSource.stop(); } catch (_) { /* already stopped */ }
                track.activeSource = null;
            }
            track.activeGain  = null;
            track.activePan   = null;
            track._eq_low     = null;
            track._eq_mid     = null;
            track._eq_high    = null;
        }

        function startPlayback() {
            if (isPlaying) return;
            const ctx = getActx();
            const anySoloed = tracks.some(t => t.soloed && t.buffer && !t.muted);
            isPlaying    = true;
            playCtxStart = ctx.currentTime;
            playOffset   = playPosition;

            tracks.forEach(t => {
                if (!t.buffer) return;
                const audible = !t.muted && (anySoloed ? t.soloed : true);
                const gain = ctx.createGain();
                gain.gain.value = audible ? t.volume * masterVol : 0;
                const panner = ctx.createStereoPanner();
                panner.pan.value = t.pan;
                const src = ctx.createBufferSource();
                src.buffer = t.buffer;

                // EQ chain: low shelf → mid peak → high shelf
                const eqLow  = ctx.createBiquadFilter();
                eqLow.type  = 'lowshelf';  eqLow.frequency.value  = 200;  eqLow.gain.value  = t.eq.low;
                const eqMid  = ctx.createBiquadFilter();
                eqMid.type  = 'peaking';   eqMid.frequency.value  = 1000; eqMid.gain.value  = t.eq.mid; eqMid.Q.value = 1.0;
                const eqHigh = ctx.createBiquadFilter();
                eqHigh.type = 'highshelf'; eqHigh.frequency.value = 8000; eqHigh.gain.value = t.eq.high;
                t._eq_low  = eqLow;
                t._eq_mid  = eqMid;
                t._eq_high = eqHigh;

                src.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh);
                eqHigh.connect(gain); gain.connect(panner); panner.connect(ctx.destination);
                const offset = Math.min(playOffset, t.buffer.duration);
                src.start(0, offset);
                t.activeSource = src;
                t.activeGain   = gain;
                t.activePan    = panner;
                src.onended = () => {
                    if (isPlaying && t.activeSource === src) stopTrackSource(t);
                };
            });

            document.getElementById('btn-play').innerHTML = '&#9646;&#9646;';
            rafId = requestAnimationFrame(tick);
        }

        function pausePlayback() {
            if (!isPlaying) return;
            playPosition = playOffset + (actx ? actx.currentTime - playCtxStart : 0);
            isPlaying = false;
            cancelAnimationFrame(rafId);
            tracks.forEach(stopTrackSource);
            document.getElementById('btn-play').innerHTML = '&#9654;';
            tracks.forEach(t => drawWaveform(t));
        }

        function togglePlay() {
            if (isPlaying) pausePlayback(); else startPlayback();
        }

        function stopAll() {
            pausePlayback();
            playPosition = 0;
            document.getElementById('position-display').textContent = fmtTime(0);
            tracks.forEach(t => drawWaveform(t));
        }

        function returnToZero() {
            const wasPlaying = isPlaying;
            pausePlayback();
            playPosition = 0;
            document.getElementById('position-display').textContent = fmtTime(0);
            tracks.forEach(t => drawWaveform(t));
            if (wasPlaying) startPlayback();
        }

        function tick() {
            if (!isPlaying || !actx) return;
            playPosition = playOffset + (actx.currentTime - playCtxStart);
            document.getElementById('position-display').textContent = fmtTime(playPosition);
            tracks.forEach(t => { if (t.buffer) drawWaveform(t); });

            const maxDur = tracks.reduce((m, t) => t.buffer ? Math.max(m, t.buffer.duration) : m, 0);
            if (maxDur > 0 && playPosition >= maxDur) {
                if (loopEnabled) {
                    pausePlayback();
                    playPosition = 0;
                    startPlayback();
                    return;
                }
                pausePlayback();
                playPosition = 0;
                document.getElementById('position-display').textContent = fmtTime(0);
                tracks.forEach(t => drawWaveform(t));
                return;
            }
            rafId = requestAnimationFrame(tick);
        }

        // ════════════════════════════════════════════════════════════════════
        //  SELECTION PLAYBACK
        // ════════════════════════════════════════════════════════════════════

        function playSelection(track) {
            if (!track.buffer || track.selA === null || track.selB === null) {
                alert('Select a region on the waveform first.'); return;
            }
            const start = Math.min(track.selA, track.selB);
            const end   = Math.max(track.selA, track.selB);
            if (end - start < 0.05) { alert('Selection too short.'); return; }

            const ctx  = getActx();
            const src  = ctx.createBufferSource();
            const gain = ctx.createGain();
            const pan  = ctx.createStereoPanner();
            src.buffer       = track.buffer;
            gain.gain.value  = track.volume * masterVol;
            pan.pan.value    = track.pan;
            src.connect(gain); gain.connect(pan); pan.connect(ctx.destination);
            src.start(0, start, end - start);
        }

        // ════════════════════════════════════════════════════════════════════
        //  CLIP MANAGEMENT
        // ════════════════════════════════════════════════════════════════════

        function createClip(track) {
            if (!track.buffer) { alert('Load audio first.'); return; }
            if (track.selA === null || track.selB === null ||
                Math.abs(track.selB - track.selA) < 0.05) {
                alert('Select a region on the waveform first.'); return;
            }
            const start = Math.min(track.selA, track.selB);
            const end   = Math.max(track.selA, track.selB);
            const ctx   = getActx();
            const nc    = track.buffer.numberOfChannels;
            const sr    = track.buffer.sampleRate;
            const s0    = Math.floor(start * sr);
            const s1    = Math.floor(end * sr);
            const len   = s1 - s0;
            const clipBuf = ctx.createBuffer(nc, len, sr);
            for (let c = 0; c < nc; c++) {
                const src = track.buffer.getChannelData(c);
                const dst = clipBuf.getChannelData(c);
                for (let i = 0; i < len; i++) dst[i] = src[s0 + i];
            }
            const clip = {
                id:     ++clipIdSeq,
                name:   (track.name || 'Track') + ' · ' + fmtTime(start),
                color:  track.color,
                buffer: clipBuf,
            };
            clips.push(clip);
            renderClips();
        }

        function playClip(clip) {
            const ctx = getActx();
            const src = ctx.createBufferSource();
            src.buffer = clip.buffer;
            src.connect(ctx.destination);
            src.start(0);
        }

        async function downloadClip(clip) {
            const sr = 44100;
            const nc = clip.buffer.numberOfChannels;
            const offCtx = new OfflineAudioContext(nc, Math.ceil(clip.buffer.duration * sr + sr * 0.05), sr);
            const src = offCtx.createBufferSource();
            src.buffer = clip.buffer;
            src.connect(offCtx.destination);
            src.start(0);
            const rendered = await offCtx.startRendering();
            const safeName = clip.name.replace(/[^\w\s.-]/g, '').replace(/\s+/g, '_').substring(0, 60);
            triggerDownload(bufferToWav(rendered), safeName + '.wav');
        }

        function deleteClip(id) {
            clips = clips.filter(c => c.id !== id);
            renderClips();
        }

        function renderClips() {
            const grid = document.getElementById('clip-grid');
            document.getElementById('clips-count').textContent = clips.length + ' clip' + (clips.length !== 1 ? 's' : '');
            grid.innerHTML = '';
            if (!clips.length) {
                const empty = document.createElement('div');
                empty.className = 'empty-clips';
                empty.textContent = 'Select a region on a waveform and click ✂ Clip to save it here';
                grid.appendChild(empty);
                return;
            }
            clips.forEach(clip => {
                const card = document.createElement('div');
                card.className = 'clip-card';

                const bar = document.createElement('div');
                bar.className = 'clip-color-bar';
                bar.style.background = clip.color;
                card.appendChild(bar);

                const body = document.createElement('div');
                body.className = 'clip-body';

                const nameInput = document.createElement('input');
                nameInput.type = 'text'; nameInput.className = 'clip-name-input';
                nameInput.value = clip.name; nameInput.maxLength = 60;
                nameInput.addEventListener('input', () => { clip.name = nameInput.value; });
                body.appendChild(nameInput);

                const dur = document.createElement('div');
                dur.className = 'clip-dur';
                dur.textContent = fmtTime(clip.buffer.duration) + ' · ' +
                    clip.buffer.numberOfChannels + 'ch · ' +
                    Math.round(clip.buffer.sampleRate / 1000) + 'kHz';
                body.appendChild(dur);

                const miniCanvas = document.createElement('canvas');
                miniCanvas.className = 'clip-wave-mini';
                miniCanvas.width = 300; miniCanvas.height = 32;
                body.appendChild(miniCanvas);
                setTimeout(() => drawMiniWave(miniCanvas, clip.buffer, clip.color), 0);

                const btns = document.createElement('div');
                btns.className = 'clip-btns';

                const playBtn = document.createElement('button');
                playBtn.className = 'clip-btn clip-btn-play';
                playBtn.textContent = '▶ Play';
                playBtn.addEventListener('click', () => playClip(clip));

                const dlBtn = document.createElement('button');
                dlBtn.className = 'clip-btn clip-btn-dl';
                dlBtn.textContent = '↓ WAV';
                dlBtn.addEventListener('click', () => downloadClip(clip));

                const delBtn = document.createElement('button');
                delBtn.className = 'clip-btn clip-btn-del';
                delBtn.textContent = '×';
                delBtn.title = 'Delete clip';
                delBtn.addEventListener('click', () => deleteClip(clip.id));

                btns.appendChild(playBtn); btns.appendChild(dlBtn); btns.appendChild(delBtn);
                body.appendChild(btns);
                card.appendChild(body);
                grid.appendChild(card);
            });
        }

        // ════════════════════════════════════════════════════════════════════
        //  EXPORT
        // ════════════════════════════════════════════════════════════════════

        async function exportMix() {
            const loaded = tracks.filter(t => t.buffer);
            if (!loaded.length) { alert('Load audio into at least one track first.'); return; }

            const exportBtn = document.getElementById('export-btn');
            exportBtn.disabled = true;
            exportBtn.textContent = '⏳ Rendering…';

            try {
                const maxDur = loaded.reduce((m, t) => Math.max(m, t.buffer.duration), 0);
                const sr  = 44100;
                const offCtx = new OfflineAudioContext(2, Math.ceil(maxDur * sr), sr);
                const anySoloed = loaded.some(t => t.soloed && !t.muted);

                loaded.forEach(t => {
                    const audible = !t.muted && (anySoloed ? t.soloed : true);
                    if (!audible) return;
                    const gain = offCtx.createGain();
                    gain.gain.value = t.volume * masterVol;
                    const pan = offCtx.createStereoPanner();
                    pan.pan.value = t.pan;
                    const src = offCtx.createBufferSource();
                    src.buffer = t.buffer;
                    const eqLow  = offCtx.createBiquadFilter();
                    eqLow.type  = 'lowshelf';  eqLow.frequency.value  = 200;  eqLow.gain.value  = t.eq.low;
                    const eqMid  = offCtx.createBiquadFilter();
                    eqMid.type  = 'peaking';   eqMid.frequency.value  = 1000; eqMid.gain.value  = t.eq.mid; eqMid.Q.value = 1.0;
                    const eqHigh = offCtx.createBiquadFilter();
                    eqHigh.type = 'highshelf'; eqHigh.frequency.value = 8000; eqHigh.gain.value = t.eq.high;
                    src.connect(eqLow); eqLow.connect(eqMid); eqMid.connect(eqHigh);
                    eqHigh.connect(gain); gain.connect(pan); pan.connect(offCtx.destination);
                    src.start(0);
                });

                const rendered = await offCtx.startRendering();
                triggerDownload(bufferToWav(rendered), 'adagio-mix.wav');
            } catch (err) {
                alert('Export failed: ' + err.message);
            } finally {
                exportBtn.disabled = false;
                exportBtn.textContent = '↓ Export WAV';
            }
        }

        // ════════════════════════════════════════════════════════════════════
        //  LOOP
        // ════════════════════════════════════════════════════════════════════

        function toggleLoop() {
            loopEnabled = !loopEnabled;
            document.getElementById('btn-loop').classList.toggle('looping', loopEnabled);
        }

        // ════════════════════════════════════════════════════════════════════
        //  MICROPHONE RECORDING
        // ════════════════════════════════════════════════════════════════════

        async function toggleRecord() {
            if (isRecording) {
                stopRecording();
            } else {
                await startRecording();
            }
        }

        async function startRecording() {
            try {
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (err) {
                alert('Microphone access denied: ' + err.message);
                return;
            }

            if (tracks.length >= MAX_TRACKS) addTrack();
            const recTrack = tracks[tracks.length - 1];
            if (recTrack.buffer) addTrack();
            const targetTrack = tracks[tracks.length - 1];

            micChunks = [];
            micRecorder = new MediaRecorder(micStream);
            micRecorder.ondataavailable = e => { if (e.data.size > 0) micChunks.push(e.data); };
            micRecorder.onstop = async () => {
                micStream.getTracks().forEach(t => t.stop());
                const blob = new Blob(micChunks, { type: 'audio/webm' });
                const file = new File([blob], 'recording-' + Date.now() + '.webm', { type: 'audio/webm' });
                await loadAudioFile(targetTrack, file);
                isRecording = false;
                document.getElementById('btn-rec').classList.remove('recording');
            };
            micRecorder.start(100);
            isRecording = true;
            document.getElementById('btn-rec').classList.add('recording');
            if (!isPlaying) startPlayback();
        }

        function stopRecording() {
            if (micRecorder && micRecorder.state !== 'inactive') micRecorder.stop();
        }

        // ════════════════════════════════════════════════════════════════════
        //  NORMALIZE
        // ════════════════════════════════════════════════════════════════════

        function normalizeTrack(track) {
            if (!track.buffer) { alert('Load audio first.'); return; }
            const nc  = track.buffer.numberOfChannels;
            const len = track.buffer.length;
            const sr  = track.buffer.sampleRate;
            const ctx = getActx();
            const newBuf = ctx.createBuffer(nc, len, sr);
            let peak = 0;
            for (let c = 0; c < nc; c++) {
                const data = track.buffer.getChannelData(c);
                for (let i = 0; i < len; i++) {
                    const abs = Math.abs(data[i]);
                    if (abs > peak) peak = abs;
                }
            }
            if (peak < 0.0001) { alert('Track is silent.'); return; }
            const target = 0.891; // -1 dBFS
            const gain   = target / peak;
            for (let c = 0; c < nc; c++) {
                const src = track.buffer.getChannelData(c);
                const dst = newBuf.getChannelData(c);
                for (let i = 0; i < len; i++) dst[i] = src[i] * gain;
            }
            track.buffer = newBuf;
            track.peaks  = computePeaks(newBuf, WAVE_W);
            drawWaveform(track);
            track._fileDurEl.textContent = fmtTime(newBuf.duration) + ' (normalized)';
        }

        // ════════════════════════════════════════════════════════════════════
        //  INIT
        // ════════════════════════════════════════════════════════════════════

        addTrack();
        addTrack();
        renderClips();
