'use strict';

// ── Community Event Bus ───────────────────────────────────────────────────────
// Provides an event-driven architecture for community features.
//
// Components emit domain events (post.created, guestbook.signed, etc.) rather
// than calling each other directly. Subscribers react independently — this keeps
// the forum, guestbook, and wellness modules decoupled from analytics, audit
// logging, and any future notification systems.
//
// Usage:
//   // Emit an event (in forum.js, guestbook.js, etc.)
//   EventBus.emit('guestbook.signed', { name: 'Alice', ts: Date.now() });
//
//   // Subscribe (in any module loaded after event-bus.js)
//   EventBus.on('guestbook.signed', function(payload) { ... });
//
//   // Subscribe once
//   EventBus.once('post.created', function(payload) { ... });

var EventBus = (function () {
    var _handlers = Object.create(null);

    function on(event, fn) {
        if (!_handlers[event]) _handlers[event] = [];
        _handlers[event].push({ fn: fn, once: false });
    }

    function once(event, fn) {
        if (!_handlers[event]) _handlers[event] = [];
        _handlers[event].push({ fn: fn, once: true });
    }

    function off(event, fn) {
        if (!_handlers[event]) return;
        _handlers[event] = _handlers[event].filter(function(h) { return h.fn !== fn; });
    }

    function emit(event, payload) {
        var handlers = _handlers[event];
        if (!handlers || !handlers.length) return;

        var remaining = [];
        handlers.forEach(function(h) {
            try { h.fn(payload); } catch (_) { /* subscriber errors must not break the emitter */ }
            if (!h.once) remaining.push(h);
        });
        _handlers[event] = remaining;
    }

    return { on: on, once: once, off: off, emit: emit };
}());

// ── Audit log subscriber ──────────────────────────────────────────────────────
// Writes a lightweight audit entry to Firebase for every community action.
// Entries are stored under /audit/<event>/<pushId> and expire after 30 days
// (configure Firebase TTL rules in the console).
//
// This subscriber is intentionally fire-and-forget: audit failures must never
// block or surface errors to the user.
(function attachAuditLog() {
    var AUDITED_EVENTS = [
        'post.created',
        'reply.added',
        'guestbook.signed',
        'wellness.logged',
        'post.deleted',
        'guestbook.deleted',
    ];

    AUDITED_EVENTS.forEach(function(event) {
        EventBus.on(event, function(payload) {
            if (!window.FIREBASE_READY) return;
            try {
                firebase.database().ref('audit/' + event.replace('.', '/')).push({
                    ts:      Date.now(),
                    payload: payload,
                });
            } catch (_) { /* audit must never throw */ }
        });
    });
}());
