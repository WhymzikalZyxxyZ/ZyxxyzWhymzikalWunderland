'use strict';

// Update this to your deployed Fly.io URL after `fly deploy`.
const API_BASE = 'https://zyxxyz-editor.fly.dev';

// Tracks the latest result blob URL per operation so Print can reuse it.
const resultBlobs = {};

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach((b, i) => {
        const tabs = ['merge','extract','remove','rotate','compress','zip'];
        b.classList.toggle('active', tabs[i] === name);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.toggle('active', p.id === 'tab-' + name);
    });
}

// ── Drop zone helpers ──────────────────────────────────────────────────────
function dzOver(e, id) {
    e.preventDefault();
    document.getElementById(id).classList.add('drag-over');
}
function dzLeave(id) {
    document.getElementById(id).classList.remove('drag-over');
}
function dzDrop(e, dzId, inputId, multiple) {
    e.preventDefault();
    dzLeave(dzId);
    const input = document.getElementById(inputId);
    const dt = e.dataTransfer;
    if (!dt.files.length) return;
    // Assign dropped files to the hidden input via DataTransfer trick
    try {
        const transfer = new DataTransfer();
        const files = multiple ? dt.files : [dt.files[0]];
        Array.from(files).forEach(f => transfer.items.add(f));
        input.files = transfer.files;
    } catch (_) {
        // Fallback: modern browsers all support this, but just in case
    }
    showFiles(inputId, 'fl-' + dzId.replace('dz-', ''));
}

function showFiles(inputId, listId) {
    const input = document.getElementById(inputId);
    const list  = document.getElementById(listId);
    list.innerHTML = '';
    Array.from(input.files).forEach(f => {
        const tag = document.createElement('span');
        tag.className = 'file-tag';
        tag.textContent = f.name + ' (' + fmtSize(f.size) + ')';
        list.appendChild(tag);
    });
}

function fmtSize(bytes) {
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/1024/1024).toFixed(1) + ' MB';
}

// ── Status helpers ─────────────────────────────────────────────────────────
function setStatus(op, msg, type) {
    const el = document.getElementById('st-' + op);
    if (!el) return;
    el.textContent = msg;
    el.className = 'status-msg ' + (type || '');
}

function setBusy(op, busy) {
    document.querySelectorAll('#tab-' + op + ' .btn-primary').forEach(b => {
        b.disabled = busy;
        b.textContent = busy ? 'Processing…' : b.textContent.replace('Processing…', b.dataset.label || b.textContent);
    });
}

// ── Main run function ──────────────────────────────────────────────────────
async function run(op) {
    setStatus(op, '', '');
    // Revoke any old result blob
    if (resultBlobs[op]) { URL.revokeObjectURL(resultBlobs[op]); delete resultBlobs[op]; }

    const fd = buildFormData(op);
    if (!fd) return;

    setBusy(op, true);
    setStatus(op, 'Processing…', 'info');

    try {
        const res = await fetch(API_BASE + '/api/' + endpoint(op), { method: 'POST', body: fd });
        if (!res.ok) {
            let msg = 'Server error (' + res.status + ')';
            try { const j = await res.json(); msg = j.error || msg; } catch (_) { /* non-JSON error body */ }
            setStatus(op, msg, 'error');
            return;
        }
        const blob = await res.blob();
        const filename = disposition(res.headers.get('content-disposition')) || op + '_result';
        const url = URL.createObjectURL(blob);
        resultBlobs[op] = url;

        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setStatus(op, 'Done — ' + filename, 'ok');
    } catch (e) {
        setStatus(op, 'Request failed: ' + e.message, 'error');
    } finally {
        setBusy(op, false);
    }
}

function endpoint(op) {
    if (op === 'compress' || op === 'zip') return op;
    return 'pdf/' + op;
}

function buildFormData(op) {
    const fd = new FormData();

    if (op === 'merge') {
        const files = document.getElementById('f-merge').files;
        if (files.length < 2) { setStatus(op, 'Select at least 2 PDF files.', 'error'); return null; }
        Array.from(files).forEach(f => fd.append('files', f));
    } else if (op === 'extract') {
        const f = document.getElementById('f-extract').files[0];
        if (!f) { setStatus(op, 'Select a PDF file.', 'error'); return null; }
        const pages = document.getElementById('pages-extract').value.trim();
        if (!pages) { setStatus(op, 'Enter the pages to keep.', 'error'); return null; }
        fd.append('file', f);
        fd.append('pages', pages);
    } else if (op === 'remove') {
        const f = document.getElementById('f-remove').files[0];
        if (!f) { setStatus(op, 'Select a PDF file.', 'error'); return null; }
        const pages = document.getElementById('pages-remove').value.trim();
        if (!pages) { setStatus(op, 'Enter the pages to remove.', 'error'); return null; }
        fd.append('file', f);
        fd.append('pages', pages);
    } else if (op === 'rotate') {
        const f = document.getElementById('f-rotate').files[0];
        if (!f) { setStatus(op, 'Select a PDF file.', 'error'); return null; }
        fd.append('file', f);
        fd.append('degrees', document.getElementById('deg-rotate').value);
        const pages = document.getElementById('pages-rotate').value.trim();
        if (pages) fd.append('pages', pages);
    } else if (op === 'compress') {
        const f = document.getElementById('f-compress').files[0];
        if (!f) { setStatus(op, 'Select a file to compress.', 'error'); return null; }
        fd.append('file', f);
    } else if (op === 'zip') {
        const files = document.getElementById('f-zip').files;
        if (!files.length) { setStatus(op, 'Select at least one file.', 'error'); return null; }
        Array.from(files).forEach(f => fd.append('files', f));
    }
    return fd;
}

async function printResult(op) {
    let url = resultBlobs[op];
    if (!url) {
        setStatus(op, 'Process the file first, then click Print.', 'error');
        return;
    }
    const tab = window.open(url, '_blank');
    if (tab) {
        tab.onload = () => { try { tab.print(); } catch (_) { /* cross-origin print blocked */ } };
    }
}

function clearOp(op) {
    ['f-merge','f-extract','f-remove','f-rotate','f-compress','f-zip'].forEach(id => {
        const el = document.getElementById(id);
        if (el && el.id === 'f-' + op || (op === 'merge' && el.id === 'f-merge') || (op === 'zip' && el.id === 'f-zip')) {
            try { el.value = ''; } catch (_) { /* read-only input */ }
        }
    });
    const fileInput = document.getElementById('f-' + op);
    if (fileInput) { try { fileInput.value = ''; } catch (_) { /* read-only input */ } }
    const fl = document.getElementById('fl-' + op);
    if (fl) fl.innerHTML = '';
    if (resultBlobs[op]) { URL.revokeObjectURL(resultBlobs[op]); delete resultBlobs[op]; }
    setStatus(op, '', '');
}

function disposition(header) {
    if (!header) return '';
    const m = header.match(/filename[^;=\n]*=\s*["']?([^"'\n;]+)/i);
    return m ? m[1].trim() : '';
}
