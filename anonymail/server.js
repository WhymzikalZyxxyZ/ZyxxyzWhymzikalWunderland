'use strict';

require('dotenv').config();

const express     = require('express');
const http        = require('http');
const https       = require('https');
const fs          = require('fs');
const path        = require('path');
const { WebSocketServer } = require('ws');
const helmet      = require('helmet');
const rateLimit   = require('express-rate-limit');

const { buildSmtpServer, setNotifier } = require('./lib/smtp');
const { byToken }                      = require('./lib/mailstore');
const sender                           = require('./lib/sender');
const apiRouter                        = require('./routes/api');

const PORT      = parseInt(process.env.PORT)      || 3000;
const SMTP_PORT = parseInt(process.env.SMTP_PORT) || 2525;
const DOMAIN    = process.env.DOMAIN              || 'anonymail.local';

// ── Express ────────────────────────────────────────────────────────────────────
const app = express();
app.set('domain', DOMAIN);
app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc:  ["'self'"],
            styleSrc:   ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'", 'ws:', 'wss:'],
            imgSrc:     ["'self'", 'data:'],
            fontSrc:    ["'self'"],
            objectSrc:  ["'none'"],
            frameAncestors: ["'none'"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    referrerPolicy: { policy: 'no-referrer' },
}));

// Rate limiters
const limiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
const createLimiter = rateLimit({ windowMs: 60_000, max: 10, message: { error: 'Too many mailbox requests' } });

app.use('/api', limiter);
app.use('/api/mailbox', createLimiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html' }));
app.use('/api', apiRouter);

// ── HTTP / HTTPS server ────────────────────────────────────────────────────────
let httpServer;
if (process.env.TLS_CERT && process.env.TLS_KEY) {
    httpServer = https.createServer({
        cert: fs.readFileSync(process.env.TLS_CERT),
        key:  fs.readFileSync(process.env.TLS_KEY),
        minVersion: 'TLSv1.2',
    }, app);
    console.log('[http] HTTPS enabled (TLS 1.2+)');
} else {
    httpServer = http.createServer(app);
    console.log('[http] Running plain HTTP — set TLS_CERT + TLS_KEY for production');
}

// ── WebSocket ──────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

// Map<address, Set<WebSocket>>
const addressSockets = new Map();

wss.on('connection', (ws, req) => {
    const params = new URLSearchParams(req.url.replace(/^[^?]*/, ''));
    const token  = params.get('token');

    if (!token) { ws.close(4001, 'Token required'); return; }

    const mb = byToken(token);
    if (!mb)  { ws.close(4002, 'Invalid or expired session'); return; }

    const addr = mb.address;
    if (!addressSockets.has(addr)) addressSockets.set(addr, new Set());
    addressSockets.get(addr).add(ws);

    ws.on('close', () => {
        const set = addressSockets.get(addr);
        if (set) {
            set.delete(ws);
            if (!set.size) addressSockets.delete(addr);
        }
    });

    // Pong to keep alive
    ws.on('ping', () => ws.pong());

    ws.send(JSON.stringify({ type: 'connected', address: addr, expiresAt: mb.expiresAt }));
});

// Injected into smtp.js so it can push inbox events without a circular dep
setNotifier((address, event) => {
    const set = addressSockets.get(address);
    if (!set) return;
    const msg = JSON.stringify(event);
    for (const ws of set) {
        if (ws.readyState === 1 /* OPEN */) ws.send(msg);
    }
});

// ── Keep-alive pings ──────────────────────────────────────────────────────────
setInterval(() => {
    for (const ws of wss.clients) {
        if (ws.readyState === 1) ws.ping();
    }
}, 30_000);

// ── Outbound SMTP ─────────────────────────────────────────────────────────────
sender.configure({
    host: process.env.SMTP_OUT_HOST,
    port: parseInt(process.env.SMTP_OUT_PORT) || 587,
    user: process.env.SMTP_OUT_USER,
    pass: process.env.SMTP_OUT_PASS,
});

// ── Inbound SMTP ──────────────────────────────────────────────────────────────
const smtpServer = buildSmtpServer({
    hostname: DOMAIN,
    secure:   !!process.env.SMTP_SECURE,
    tlsKey:   process.env.TLS_KEY  ? fs.readFileSync(process.env.TLS_KEY)  : null,
    tlsCert:  process.env.TLS_CERT ? fs.readFileSync(process.env.TLS_CERT) : null,
});

smtpServer.listen(SMTP_PORT, '0.0.0.0', () => {
    console.log(`[smtp] Inbound SMTP listening on :${SMTP_PORT}`);
});

smtpServer.on('error', err => console.error('[smtp]', err.message));

// ── Start HTTP ────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
    console.log(`[http] Anonymail on :${PORT}  |  domain: ${DOMAIN}`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function shutdown() {
    smtpServer.close();
    httpServer.close();
    process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT',  shutdown);
