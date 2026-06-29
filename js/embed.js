'use strict';

/**
 * EmbedApp — shared iframe embed controller.
 *
 * Handles: load timeout, loading / frame / error state transitions,
 * retry, embed snippet panel toggle, clipboard copy.
 *
 * App-specific postMessage bridges are wired up by each page after calling
 * EmbedApp(). The controller exposes markReady() for the bridge to call once
 * the embedded app confirms it has bootstrapped.
 *
 * Usage:
 *   var app = EmbedApp({ frameId, loadingId, errorId, appUrl, timeoutMs });
 *   app.bindRetry('retry-btn-id');
 *   app.bindSnippet({ toggleId, panelId, copyId, codeId });
 *   app.start();                     // kicks off initial load
 *   // in a postMessage listener:
 *   app.markReady();                 // reveals the frame
 */
(function (w) {

    function EmbedApp(cfg) {
        var frame   = document.getElementById(cfg.frameId);
        var loadEl  = document.getElementById(cfg.loadingId);
        var errorEl = document.getElementById(cfg.errorId);
        var appUrl  = cfg.appUrl;
        var ms      = cfg.timeoutMs || 15000;
        var timer   = null;
        var ready   = false;

        // ── State machine ─────────────────────────────────────────────────
        // 'loading' → spinner visible, frame hidden, error hidden
        // 'frame'   → spinner hidden, frame visible, error hidden
        // 'error'   → spinner hidden, frame hidden, error visible
        function _show(state) {
            if (loadEl)  loadEl.hidden  = state !== 'loading';
            if (frame)   frame.hidden   = state !== 'frame';
            if (errorEl) errorEl.hidden = state !== 'error';
        }

        function showError() {
            clearTimeout(timer);
            ready = false;
            _show('error');
        }

        function markReady() {
            ready = true;
            clearTimeout(timer);
            _show('frame');
        }

        function start(src) {
            ready = false;
            _show('loading');
            frame.src = src || appUrl;
            // Primary timeout: app must signal ready within timeoutMs.
            timer = setTimeout(function () { if (!ready) showError(); }, ms);
        }

        // Cross-origin iframes fire 'load' on success AND 4xx/5xx — treat the
        // load event as "frame responded" (clear primary timer) but give the app
        // a short secondary window to send its ready postMessage.
        if (frame) {
            frame.addEventListener('load', function () {
                clearTimeout(timer);
                if (!ready) {
                    timer = setTimeout(function () { if (!ready) showError(); }, 4000);
                }
            });
            frame.addEventListener('error', showError);
        }

        // ── Retry ─────────────────────────────────────────────────────────
        function bindRetry(btnId) {
            var btn = document.getElementById(btnId);
            if (btn) btn.addEventListener('click', function () { start(appUrl); });
        }

        // ── Embed snippet ─────────────────────────────────────────────────
        function bindSnippet(ids) {
            var toggle = document.getElementById(ids.toggleId);
            var panel  = document.getElementById(ids.panelId);
            var copy   = document.getElementById(ids.copyId);
            var code   = document.getElementById(ids.codeId);
            if (!toggle || !panel) return;

            toggle.addEventListener('click', function (e) {
                e.stopPropagation();
                var open = panel.classList.toggle('ea-open');
                toggle.setAttribute('aria-expanded', String(open));
            });
            document.addEventListener('click', function (e) {
                if (!panel.contains(e.target) && e.target !== toggle) {
                    panel.classList.remove('ea-open');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    panel.classList.remove('ea-open');
                    toggle.setAttribute('aria-expanded', 'false');
                }
            });

            if (copy && code) {
                copy.addEventListener('click', function () {
                    var orig = copy.textContent;
                    navigator.clipboard.writeText(code.textContent.trim()).then(function () {
                        copy.textContent = '✓ Copied!';
                        setTimeout(function () { copy.textContent = orig; }, 2000);
                    }).catch(function () { code.focus(); document.execCommand('selectAll'); });
                });
            }
        }

        return {
            start:       start,
            markReady:   markReady,
            showError:   showError,
            bindRetry:   bindRetry,
            bindSnippet: bindSnippet,
            frame:       frame,
            appUrl:      appUrl,
        };
    }

    w.EmbedApp = EmbedApp;

})(window);
