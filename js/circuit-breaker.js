'use strict';

// ── Circuit Breaker ───────────────────────────────────────────────────────────
// Wraps async operations (Firebase reads/writes) with the circuit breaker pattern.
//
// States:
//   CLOSED   — normal operation; failures are counted
//   OPEN     — dependency is considered down; calls fail fast without hitting Firebase
//   HALF_OPEN — cooldown elapsed; one probe request allowed through to test recovery
//
// Usage:
//   const breaker = new CircuitBreaker('firebase', { threshold: 3, cooldownMs: 10000 });
//   const data = await breaker.call(() => firebase.database().ref('/posts').once('value'));

class CircuitBreaker {
    constructor(name, options) {
        var opts         = options || {};
        this.name        = name;
        this.threshold   = opts.threshold   || 3;      // failures before opening
        this.cooldownMs  = opts.cooldownMs  || 10000;  // ms before trying half-open
        this.timeoutMs   = opts.timeoutMs   || 8000;   // ms before a call is considered failed

        this._state      = 'CLOSED';
        this._failures   = 0;
        this._openedAt   = null;
        this._listeners  = [];
    }

    get state()    { return this._state; }
    get failures() { return this._failures; }

    // Register a listener called with (newState, name) on every state change
    onChange(fn) { this._listeners.push(fn); }

    _transition(newState) {
        if (this._state === newState) return;
        this._state = newState;
        this._listeners.forEach(function(fn) { try { fn(newState); } catch (_) { /* ignore */ } });
    }

    _recordSuccess() {
        this._failures = 0;
        this._openedAt = null;
        this._transition('CLOSED');
    }

    _recordFailure() {
        this._failures++;
        if (this._failures >= this.threshold) {
            this._openedAt = Date.now();
            this._transition('OPEN');
        }
    }

    // Wrap a promise-returning function with circuit breaker logic
    async call(fn) {
        if (this._state === 'OPEN') {
            if (Date.now() - this._openedAt < this.cooldownMs) {
                throw new CircuitBreakerOpenError(this.name);
            }
            // Cooldown elapsed — try one probe request
            this._transition('HALF_OPEN');
        }

        // Race the call against a timeout
        var self    = this;
        var timeout = new Promise(function(_, reject) {
            setTimeout(function() { reject(new Error('Circuit breaker timeout')); }, self.timeoutMs);
        });

        try {
            var result = await Promise.race([fn(), timeout]);
            this._recordSuccess();
            return result;
        } catch (e) {
            this._recordFailure();
            throw e;
        }
    }

    reset() {
        this._failures = 0;
        this._openedAt = null;
        this._transition('CLOSED');
    }
}

class CircuitBreakerOpenError extends Error {
    constructor(name) {
        super('Circuit open for \'' + name + '\' — dependency unavailable, try again shortly');
        this.name = 'CircuitBreakerOpenError';
        this.circuit = name;
    }
}

// ── Shared Firebase circuit breaker ───────────────────────────────────────────
// A single breaker guards all Firebase Realtime Database calls site-wide.
// If Firebase is slow or unreachable, the circuit opens and all community
// features fail fast rather than hanging the page with pending requests.
var firebaseBreaker = new CircuitBreaker('firebase', {
    threshold:  3,
    cooldownMs: 15000,
    timeoutMs:  8000,
});

// Update a visual status indicator if one exists on the page
firebaseBreaker.onChange(function(state) {
    var indicator = document.getElementById('firebase-status');
    if (!indicator) return;
    var labels = { CLOSED: 'Connected', OPEN: 'Unavailable', HALF_OPEN: 'Reconnecting…' };
    var colors = { CLOSED: '#4caf50',   OPEN: '#ef5350',     HALF_OPEN: '#ffa726' };
    indicator.textContent  = labels[state] || state;
    indicator.style.color  = colors[state] || '#888';
});

// ── Convenience wrapper for Firebase reads ────────────────────────────────────
// Usage: const snap = await fbRead(() => firebase.database().ref('/posts').once('value'));
function fbRead(fn) {
    return firebaseBreaker.call(fn);
}

// ── Convenience wrapper for Firebase writes ───────────────────────────────────
// Usage: await fbWrite(() => firebase.database().ref('/posts').push(data));
function fbWrite(fn) {
    return firebaseBreaker.call(fn);
}
