'use strict';

const { SMTPServer }   = require('smtp-server');
const { simpleParser } = require('mailparser');
const { randomHex }    = require('./crypto');
const store            = require('./mailstore');

// WS notifier injected by server.js after WS setup
let notify = () => {};
function setNotifier(fn) { notify = fn; }

// ── Per-IP SMTP rate limiter ───────────────────────────────────────────────────
const _smtpRates = new Map();

function _smtpAllow(ip) {
    const now = Date.now();
    const e   = _smtpRates.get(ip);
    if (!e || now > e.reset) {
        _smtpRates.set(ip, { count: 1, reset: now + 60_000 });
        return true;
    }
    if (e.count >= 20) return false;
    e.count++;
    return true;
}

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of _smtpRates) if (now > v.reset) _smtpRates.delete(k);
}, 5 * 60_000);

function buildSmtpServer({ hostname, secure, tlsKey, tlsCert } = {}) {
    const opts = {
        name:             hostname || 'anonymail.local',
        banner:           'Anonymail SMTP ready',
        authOptional:     true,
        disabledCommands: ['AUTH'],
        maxClients:       100,
        // STARTTLS is always offered when a cert is present
        secure:           !!secure,
        hideSTARTTLS:     !tlsCert,
        key:              tlsKey  || undefined,
        cert:             tlsCert || undefined,

        onConnect(session, cb) {
            if (!_smtpAllow(session.remoteAddress)) {
                const err = new Error('Too many connections from this IP — slow down');
                err.responseCode = 421;
                return cb(err);
            }
            cb();
        },

        onRcptTo(address, _session, cb) {
            if (store.hasAddress(address.address.toLowerCase())) {
                cb();
            } else {
                const err = new Error('User not found');
                err.responseCode = 550;
                cb(err);
            }
        },

        onData(stream, session, cb) {
            simpleParser(stream, {}, (err, mail) => {
                if (err) return cb(err);

                for (const rcpt of session.envelope.rcptTo) {
                    const addr = rcpt.address.toLowerCase();

                    const attachments = (mail.attachments || []).map(a => ({
                        id:          randomHex(12),
                        filename:    a.filename || 'attachment',
                        contentType: a.contentType || 'application/octet-stream',
                        size:        a.size || 0,
                        data:        a.content,
                    }));

                    const email = {
                        id:          randomHex(16),
                        from:        mail.from?.text || session.envelope.mailFrom.address,
                        to:          rcpt.address,
                        cc:          mail.cc?.text || '',
                        subject:     mail.subject || '(no subject)',
                        body:        mail.text    || '',
                        bodyHtml:    mail.html    || null,
                        ts:          Date.now(),
                        read:        false,
                        attachments,
                    };

                    if (store.pushToInbox(addr, email)) {
                        notify(addr, {
                            type:  'new_email',
                            email: {
                                id:             email.id,
                                from:           email.from,
                                subject:        email.subject,
                                ts:             email.ts,
                                hasAttachments: attachments.length > 0,
                            },
                        });
                    }
                }
                cb();
            });
        },
    };

    return new SMTPServer(opts);
}

module.exports = { buildSmtpServer, setNotifier };
