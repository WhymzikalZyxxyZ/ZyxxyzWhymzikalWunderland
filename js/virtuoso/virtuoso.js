// ── Polaroid factory ──────────────────────────────────────────────────────────
        function randomRot(max) { return (Math.random() - 0.5) * 2 * max; }

        function makePolaroid(src, caption) {
            const rot  = randomRot(8);
            const wrap = document.createElement('div');
            wrap.className = 'polaroid';
            wrap.style.transform = `rotate(${rot}deg)`;

            const tack = document.createElement('div');
            tack.className = 'thumbtack';

            const img = document.createElement('img');
            img.src = src; img.alt = caption; img.loading = 'lazy';

            const cap = document.createElement('div');
            cap.className = 'caption'; cap.textContent = caption;

            wrap.appendChild(tack); wrap.appendChild(img); wrap.appendChild(cap);

            wrap.addEventListener('mouseenter', () => {
                wrap.style.transform = `rotate(${rot * 0.25}deg) scale(1.08)`;
            });
            wrap.addEventListener('mouseleave', () => {
                wrap.style.transform = `rotate(${rot}deg)`;
            });
            wrap.addEventListener('click', () => openLightbox(src, caption));

            return wrap;
        }

        // ── Lightbox ──────────────────────────────────────────────────────────────────
        function openLightbox(src, caption) {
            document.getElementById('lightbox-img').src = src;
            document.getElementById('lightbox-caption').textContent = caption;
            document.getElementById('lightbox').classList.add('open');
        }
        function closeLightbox() {
            document.getElementById('lightbox').classList.remove('open');
        }
        document.getElementById('lightbox').addEventListener('click', function (e) {
            if (e.target === this) closeLightbox();
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

        // ── Firebase gallery ──────────────────────────────────────────────────────────
        const publicGrid = document.getElementById('public-grid');
        const emptyState = document.getElementById('empty-state');

        function initGallery() {
            if (typeof FIREBASE_READY === 'undefined' || !FIREBASE_READY) {
                emptyState.style.display = 'block';
                emptyState.textContent = 'Gallery requires Firebase — see /js/config/firebase-config.js ✨';
                return;
            }

            firebase.database().ref('gallery').on('value', snapshot => {
                Array.from(publicGrid.querySelectorAll('.polaroid')).forEach(p => p.remove());
                const data = snapshot.val();
                if (!data) { emptyState.style.display = 'block'; return; }
                emptyState.style.display = 'none';
                Object.values(data)
                    .sort((a, b) => b.ts - a.ts)
                    .forEach(item => publicGrid.appendChild(makePolaroid(item.url, item.caption)));
            });
        }

        // ── Upload ────────────────────────────────────────────────────────────────────
        let stagedFiles = [];

        function addFilesToStaging(files) {
            const staging = document.getElementById('upload-staging');
            const list    = document.getElementById('staged-list');

            Array.from(files).forEach(file => {
                if (!file.type.startsWith('image/')) return;
                if (file.size > 15 * 1024 * 1024) {
                    alert(`${file.name} exceeds the 15 MB limit.`);
                    return;
                }

                const objectUrl      = URL.createObjectURL(file);
                const defaultCaption = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

                const item = document.createElement('div');
                item.className = 'staged-item';

                const thumb = document.createElement('img');
                thumb.className = 'staged-thumb';
                thumb.src = objectUrl;

                const info = document.createElement('div');
                info.className = 'staged-info';

                const captionInput = document.createElement('input');
                captionInput.type = 'text';
                captionInput.className = 'staged-caption';
                captionInput.value = defaultCaption;
                captionInput.placeholder = 'Caption...';
                captionInput.maxLength = 120;

                const progress = document.createElement('div');
                progress.className = 'staged-progress';

                const barWrap = document.createElement('div');
                barWrap.className = 'staged-bar-wrap';
                const bar = document.createElement('div');
                bar.className = 'staged-bar';
                barWrap.appendChild(bar);

                const statusText = document.createElement('div');
                statusText.className = 'staged-status-text';
                statusText.textContent = 'Ready to upload';

                progress.appendChild(barWrap);
                progress.appendChild(statusText);
                info.appendChild(captionInput);
                info.appendChild(progress);

                const removeBtn = document.createElement('button');
                removeBtn.className = 'staged-remove';
                removeBtn.textContent = '✕';
                removeBtn.onclick = () => {
                    stagedFiles = stagedFiles.filter(s => s.file !== file);
                    URL.revokeObjectURL(objectUrl);
                    item.remove();
                    if (!list.children.length) staging.style.display = 'none';
                };

                item.appendChild(thumb);
                item.appendChild(info);
                item.appendChild(removeBtn);
                list.appendChild(item);

                stagedFiles.push({ file, objectUrl, captionInput, progress, bar, statusText, removeBtn, item });
            });

            if (list.children.length) staging.style.display = 'block';
        }

        async function uploadAll() {
            if (!stagedFiles.length) return;
            const btn    = document.getElementById('upload-all-btn');
            btn.disabled = true;

            const batch = [...stagedFiles];
            stagedFiles = [];

            for (const staged of batch) {
                const { file, objectUrl, captionInput, progress, bar, statusText, removeBtn, item } = staged;

                removeBtn.style.display = 'none';
                captionInput.disabled   = true;
                progress.style.display  = 'block';
                statusText.textContent  = 'Uploading...';

                try {
                    const caption  = (captionInput.value.trim() || file.name).slice(0, 120);
                    const ts       = Date.now();
                    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const ref      = firebase.storage().ref(`gallery/${ts}_${safeName}`);
                    const task     = ref.put(file);

                    await new Promise((resolve, reject) => {
                        task.on('state_changed',
                            snap => {
                                const pct = Math.round(snap.bytesTransferred / snap.totalBytes * 100);
                                bar.style.width    = pct + '%';
                                statusText.textContent = pct + '%';
                            },
                            reject,
                            async () => {
                                try {
                                    const url = await task.snapshot.ref.getDownloadURL();
                                    await firebase.database().ref('gallery').push({ url, caption, ts, filename: file.name });
                                    resolve();
                                } catch (e) { reject(e); }
                            }
                        );
                    });

                    bar.style.width = '100%';
                    statusText.textContent = '✓ Uploaded!';
                    statusText.classList.add('done');
                    URL.revokeObjectURL(objectUrl);
                    setTimeout(() => item.remove(), 1400);

                } catch (err) {
                    statusText.textContent = '✗ Upload failed';
                    statusText.classList.add('error');
                    removeBtn.style.display = '';
                    console.error('Upload error:', err);
                }
            }

            btn.disabled = false;
            setTimeout(() => {
                const list = document.getElementById('staged-list');
                if (!list.children.length) {
                    document.getElementById('upload-staging').style.display = 'none';
                }
            }, 1500);
        }

        // ── Wire up drop zone ─────────────────────────────────────────────────────────
        const dropZone  = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');

        if (typeof FIREBASE_READY !== 'undefined' && FIREBASE_READY) {
            fileInput.addEventListener('change', e => {
                addFilesToStaging(e.target.files);
                fileInput.value = '';
            });
            dropZone.addEventListener('dragover', e => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
            dropZone.addEventListener('drop', e => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                addFilesToStaging(e.dataTransfer.files);
            });
        } else {
            document.getElementById('upload-notice').style.display = 'block';
            dropZone.style.opacity = '0.4';
            dropZone.style.pointerEvents = 'none';
        }

        initGallery();
