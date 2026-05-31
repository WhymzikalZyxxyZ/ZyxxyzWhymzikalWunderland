// ── Fallback comics (used when Firebase is not configured) ────────────────────
        // To add a static episode: append to this array.
        // { title, date, panels: [ { img, caption } × 4 ] }
        // img path is relative to this file; leave "" for placeholder.
        const COMICS = [
            {
                title:  "Episode 1: It Begins",
                date:   "2026-04-30",
                panels: [
                    { img: "", caption: "Every great story starts somewhere." },
                    { img: "", caption: "This one starts here." },
                    { img: "", caption: "Right here. You're looking at it." },
                    { img: "", caption: "Stay tuned. 👀" },
                ]
            },
        ];

        // ── Runtime state ─────────────────────────────────────────────────────────────
        let allComics    = [];  // combined fallback + Firebase comics
        let currentIndex = 0;

        // ── Viewer: render a specific episode ─────────────────────────────────────────
        function showComic(index) {
            if (!allComics.length) return;
            index = Math.max(0, Math.min(index, allComics.length - 1));
            currentIndex = index;
            const comic = allComics[index];

            document.getElementById('ep-num').textContent   = 'EP. ' + (index + 1);
            document.getElementById('ep-title').textContent = comic.title;
            document.getElementById('ep-date').textContent  = comic.date;
            document.getElementById('strip-counter').textContent = (index + 1) + ' / ' + allComics.length;
            document.getElementById('btn-prev').disabled = index === 0;
            document.getElementById('btn-next').disabled = index === allComics.length - 1;

            const grid = document.getElementById('panel-grid');
            grid.innerHTML = '';
            comic.panels.forEach((p, i) => {
                const panel = document.createElement('div');
                panel.className = 'panel';

                const imgWrap = document.createElement('div');
                imgWrap.className = 'panel-img-wrap';

                if (p.img) {
                    const img = document.createElement('img');
                    img.src = p.img;
                    img.alt = p.caption || ('Panel ' + (i + 1));
                    img.loading = 'lazy';
                    imgWrap.appendChild(img);
                } else {
                    const ph = document.createElement('div');
                    ph.className = 'panel-placeholder';
                    const num = document.createElement('div');
                    num.className = 'panel-placeholder-num';
                    num.textContent = i + 1;
                    ph.appendChild(num);
                    imgWrap.appendChild(ph);
                }
                panel.appendChild(imgWrap);

                if (p.caption) {
                    const cap = document.createElement('div');
                    cap.className = 'panel-caption';
                    cap.textContent = p.caption;
                    panel.appendChild(cap);
                }
                grid.appendChild(panel);
            });

            document.querySelectorAll('.toc-card').forEach((c, i) =>
                c.classList.toggle('active', i === index)
            );
        }

        // ── Viewer: rebuild table of contents ─────────────────────────────────────────
        function buildToc() {
            const tocGrid = document.getElementById('toc-grid');
            tocGrid.innerHTML = '';
            allComics.forEach((comic, index) => {
                const card = document.createElement('div');
                card.className = 'toc-card' + (index === currentIndex ? ' active' : '');
                card.onclick = () => showComic(index);

                const thumb = document.createElement('div');
                thumb.className = 'toc-thumb';
                comic.panels.forEach(p => {
                    const cell = document.createElement('div');
                    cell.className = 'toc-thumb-cell' + (p.img ? '' : ' blank');
                    if (p.img) {
                        const img = document.createElement('img');
                        img.src = p.img; img.alt = ''; img.loading = 'lazy';
                        cell.appendChild(img);
                    }
                    thumb.appendChild(cell);
                });

                const epNum = document.createElement('span');
                epNum.className = 'toc-ep-num';
                epNum.textContent = '#' + (index + 1) + ' · ' + comic.date;

                const epTitle = document.createElement('div');
                epTitle.className = 'toc-ep-title';
                epTitle.textContent = comic.title;

                card.appendChild(thumb);
                card.appendChild(epNum);
                card.appendChild(epTitle);
                tocGrid.appendChild(card);
            });
        }

        // ── Viewer: full refresh ──────────────────────────────────────────────────────
        function renderAll() {
            if (!allComics.length) {
                document.getElementById('ep-num').textContent   = '—';
                document.getElementById('ep-title').textContent = 'No episodes yet';
                document.getElementById('ep-date').textContent  = '';
                document.getElementById('strip-counter').textContent = '';
                document.getElementById('btn-prev').disabled = true;
                document.getElementById('btn-next').disabled = true;
                document.getElementById('panel-grid').innerHTML = '';
                document.getElementById('toc-grid').innerHTML = '';
                return;
            }
            buildToc();
            showComic(Math.min(currentIndex, allComics.length - 1));
        }

        // ── Boot: load from Firebase or fallback ──────────────────────────────────────
        (function boot() {
            if (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY) {
                // Show the create section
                document.getElementById('create-section').style.display = 'block';

                // Set default date to today
                const today = new Date().toISOString().slice(0, 10);
                document.getElementById('create-date').value = today;

                // Build the 4 panel slots in the editor
                initEditorSlots();

                // Real-time listener: merge COMICS array with Firebase comics
                firebase.database().ref('webcomics').orderByChild('ts').on('value', snapshot => {
                    const fbComics = [];
                    const data = snapshot.val();
                    if (data) {
                        Object.values(data)
                            .sort((a, b) => (a.ts || 0) - (b.ts || 0))
                            .forEach(c => {
                                const panels = Array.isArray(c.panels)
                                    ? c.panels
                                    : Object.values(c.panels || {});
                                fbComics.push({ title: c.title, date: c.date, panels });
                            });
                    }
                    // Firebase comics replace the fallback when Firebase is active
                    allComics = fbComics.length ? fbComics : [...COMICS];
                    renderAll();
                });
            } else {
                allComics = [...COMICS];
                renderAll();
            }
        })();

        // ══════════════════════════════════════════════════════════════════════════════
        // CREATOR
        // ══════════════════════════════════════════════════════════════════════════════

        // slot state: { file: File | null, previewUrl: string | null }
        const slotState = [null, null, null, null];
        // slot DOM references
        const slotEls = [];

        function initEditorSlots() {
            const grid = document.getElementById('editor-grid');
            for (let i = 0; i < 4; i++) {
                const slot = document.createElement('div');
                slot.className = 'panel-slot';

                const label = document.createElement('div');
                label.className = 'slot-label';
                label.textContent = 'Panel ' + (i + 1);

                // Drop zone
                const dz = document.createElement('div');
                dz.className = 'slot-drop-zone';

                const hint = document.createElement('div');
                hint.className = 'slot-hint';
                hint.innerHTML = '<span class="slot-hint-icon">🖼️</span>Click or drop image';

                const preview = document.createElement('img');
                preview.className = 'slot-preview';

                const clearBtn = document.createElement('button');
                clearBtn.className = 'slot-clear';
                clearBtn.textContent = '✕ Remove';
                clearBtn.onclick = (e) => { e.stopPropagation(); clearSlot(i); };

                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';

                dz.appendChild(hint);
                dz.appendChild(preview);
                dz.appendChild(clearBtn);
                dz.appendChild(fileInput);

                dz.addEventListener('click', () => fileInput.click());
                dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
                dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
                dz.addEventListener('drop', e => {
                    e.preventDefault();
                    dz.classList.remove('drag-over');
                    const f = e.dataTransfer.files[0];
                    if (f && f.type.startsWith('image/')) setSlotFile(i, f);
                });
                fileInput.addEventListener('change', () => {
                    if (fileInput.files[0]) setSlotFile(i, fileInput.files[0]);
                    fileInput.value = '';
                });

                // Progress bar
                const progressWrap = document.createElement('div');
                progressWrap.className = 'slot-progress-wrap';
                const progressBar = document.createElement('div');
                progressBar.className = 'slot-progress-bar';
                progressWrap.appendChild(progressBar);

                // Caption input
                const caption = document.createElement('input');
                caption.type = 'text';
                caption.className = 'slot-caption';
                caption.placeholder = 'Caption… (optional)';
                caption.maxLength = 200;

                slot.appendChild(label);
                slot.appendChild(dz);
                slot.appendChild(progressWrap);
                slot.appendChild(caption);
                grid.appendChild(slot);

                slotEls.push({ dz, hint, preview, clearBtn, progressWrap, progressBar, caption });
            }
        }

        function setSlotFile(index, file) {
            const prev = slotState[index];
            if (prev && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
            const url = URL.createObjectURL(file);
            slotState[index] = { file, previewUrl: url };
            const el = slotEls[index];
            el.preview.src = url;
            el.preview.style.display = 'block';
            el.hint.style.display = 'none';
            el.clearBtn.style.display = 'block';
        }

        function clearSlot(index) {
            const prev = slotState[index];
            if (prev && prev.previewUrl) URL.revokeObjectURL(prev.previewUrl);
            slotState[index] = null;
            const el = slotEls[index];
            el.preview.src = '';
            el.preview.style.display = 'none';
            el.hint.style.display = 'flex';
            el.clearBtn.style.display = 'none';
            el.progressWrap.style.display = 'none';
            el.progressBar.style.width = '0%';
        }

        function setPublishStatus(msg, type) {
            const el = document.getElementById('publish-status');
            el.textContent = msg;
            el.className = type || '';
        }

        async function publishComic() {
            const title = document.getElementById('create-title').value.trim();
            if (!title) { setPublishStatus('Please enter a title.', 'error'); return; }

            const date = document.getElementById('create-date').value
                || new Date().toISOString().slice(0, 10);

            const publishBtn = document.getElementById('publish-btn');
            publishBtn.disabled = true;
            setPublishStatus('Uploading panels…');

            const panels = [];

            for (let i = 0; i < 4; i++) {
                const state   = slotState[i];
                const caption = slotEls[i].caption.value.trim();
                const el      = slotEls[i];

                if (state && state.file) {
                    el.progressWrap.style.display = 'block';
                    el.progressBar.style.width = '0%';

                    try {
                        const ts       = Date.now();
                        const safeName = state.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                        const ref      = firebase.storage().ref(`webcomics/${ts}_p${i}_${safeName}`);
                        const task     = ref.put(state.file);

                        setPublishStatus(`Uploading panel ${i + 1}…`);

                        const url = await new Promise((resolve, reject) => {
                            task.on('state_changed',
                                snap => {
                                    const pct = snap.bytesTransferred / snap.totalBytes * 100;
                                    el.progressBar.style.width = Math.round(pct) + '%';
                                },
                                reject,
                                async () => {
                                    try { resolve(await task.snapshot.ref.getDownloadURL()); }
                                    catch (e) { reject(e); }
                                }
                            );
                        });

                        el.progressBar.style.width = '100%';
                        panels.push({ img: url, caption });
                    } catch (err) {
                        setPublishStatus('Upload failed on panel ' + (i + 1) + ': ' + err.message, 'error');
                        publishBtn.disabled = false;
                        return;
                    }
                } else {
                    panels.push({ img: '', caption });
                }
            }

            setPublishStatus('Saving episode…');

            try {
                await firebase.database().ref('webcomics').push({
                    title, date, ts: Date.now(), panels
                });
                setPublishStatus('✓ Episode published!', 'ok');
                resetCreator();
            } catch (err) {
                setPublishStatus('Failed to save: ' + err.message, 'error');
            }

            publishBtn.disabled = false;
        }

        function resetCreator() {
            document.getElementById('create-title').value = '';
            document.getElementById('create-date').value = new Date().toISOString().slice(0, 10);
            for (let i = 0; i < 4; i++) {
                clearSlot(i);
                slotEls[i].caption.value = '';
            }
            setTimeout(() => setPublishStatus(''), 3000);
        }
