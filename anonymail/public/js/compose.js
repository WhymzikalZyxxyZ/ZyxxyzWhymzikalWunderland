'use strict';

import * as API from './api.js';

// ── State ─────────────────────────────────────────────────────────────────────
let draftId      = null;
let pendingFiles = [];   // { file: File, id: string }[]
let onSent       = null; // callback(box) invoked after successful send
let onDrafted    = null; // callback()   invoked after saving draft

// ── DOM refs (resolved on first open) ─────────────────────────────────────────
let modal, overlay, toInput, ccInput, subjectInput, bodyInput,
    fileInput, fileList, sendBtn, draftBtn, closeBtn, errorEl;

function resolve() {
    modal       = document.getElementById('compose-modal');
    overlay     = document.getElementById('compose-overlay');
    toInput     = document.getElementById('compose-to');
    ccInput     = document.getElementById('compose-cc');
    subjectInput = document.getElementById('compose-subject');
    bodyInput   = document.getElementById('compose-body');
    fileInput   = document.getElementById('compose-file-input');
    fileList    = document.getElementById('compose-file-list');
    sendBtn     = document.getElementById('compose-send');
    draftBtn    = document.getElementById('compose-draft');
    closeBtn    = document.getElementById('compose-close');
    errorEl     = document.getElementById('compose-error');
}

// ── File attachment helpers ────────────────────────────────────────────────────
function fmtSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
}

function renderFiles() {
    fileList.innerHTML = '';
    pendingFiles.forEach(({ file, id }) => {
        const chip = document.createElement('div');
        chip.className = 'att-chip';
        chip.innerHTML = `
            <span class="att-icon">📎</span>
            <span class="att-name" title="${esc(file.name)}">${esc(file.name)}</span>
            <span class="att-size">${fmtSize(file.size)}</span>
            <button class="att-remove" data-id="${id}" aria-label="Remove attachment">✕</button>
        `;
        chip.querySelector('.att-remove').addEventListener('click', () => {
            pendingFiles = pendingFiles.filter(f => f.id !== id);
            renderFiles();
        });
        fileList.appendChild(chip);
    });
}

function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Build FormData ─────────────────────────────────────────────────────────────
function buildForm(withDraftId = false) {
    const fd = new FormData();
    fd.append('to',      toInput.value.trim());
    fd.append('cc',      ccInput.value.trim());
    fd.append('subject', subjectInput.value.trim());
    fd.append('body',    bodyInput.value);
    if (withDraftId && draftId) fd.append('draftId', draftId);
    pendingFiles.forEach(({ file }) => fd.append('attachment', file, file.name));
    return fd;
}

// ── Open / close ──────────────────────────────────────────────────────────────
export function openCompose(opts = {}) {
    if (!modal) resolve();

    draftId      = opts.draftId      || null;
    pendingFiles = [];
    onSent       = opts.onSent       || null;
    onDrafted    = opts.onDrafted    || null;

    toInput.value      = opts.to      || '';
    ccInput.value      = opts.cc      || '';
    subjectInput.value = opts.subject || '';
    bodyInput.value    = opts.body    || '';
    errorEl.textContent = '';
    renderFiles();

    modal.hidden   = false;
    overlay.hidden = false;
    toInput.focus();
}

export function closeCompose() {
    if (!modal) return;
    modal.hidden   = true;
    overlay.hidden = true;
}

// ── Wire events (call once on DOMContentLoaded) ────────────────────────────────
export function initCompose() {
    resolve();

    closeBtn.addEventListener('click', closeCompose);
    overlay.addEventListener('click', closeCompose);

    // Keyboard shortcut
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.hidden) closeCompose();
    });

    // File picker
    document.getElementById('compose-attach-btn').addEventListener('click', () => {
        fileInput.value = '';
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        Array.from(fileInput.files).forEach(file => {
            pendingFiles.push({ file, id: Math.random().toString(36).slice(2) });
        });
        renderFiles();
    });

    // Drag-and-drop on body textarea
    const dropZone = document.getElementById('compose-dropzone');
    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        Array.from(e.dataTransfer.files).forEach(file => {
            pendingFiles.push({ file, id: Math.random().toString(36).slice(2) });
        });
        renderFiles();
    });

    // Send
    sendBtn.addEventListener('click', async () => {
        errorEl.textContent = '';
        const to = toInput.value.trim();
        if (!to) { errorEl.textContent = 'Recipient is required.'; toInput.focus(); return; }

        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending…';
        try {
            await API.sendEmail(buildForm(true));
            closeCompose();
            if (onSent) onSent('sent');
        } catch (err) {
            errorEl.textContent = err.message;
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send';
        }
    });

    // Save draft
    draftBtn.addEventListener('click', async () => {
        errorEl.textContent = '';
        draftBtn.disabled = true;
        draftBtn.textContent = 'Saving…';
        try {
            if (draftId) {
                await API.updateDraft(draftId, buildForm());
            } else {
                const res = await API.saveDraft(buildForm());
                draftId = res.id;
            }
            closeCompose();
            if (onDrafted) onDrafted();
        } catch (err) {
            errorEl.textContent = err.message;
        } finally {
            draftBtn.disabled = false;
            draftBtn.textContent = 'Save draft';
        }
    });
}
