'use strict';

const nodemailer = require('nodemailer');
const fs         = require('fs');

let transport = null;
let simulated = false;
let dkimConfig = null;

function configureDkim() {
    const key    = process.env.DKIM_KEY_PATH;
    const domain = process.env.DKIM_DOMAIN;
    const sel    = process.env.DKIM_SELECTOR || 'anonymail';
    if (!key || !domain) return;
    try {
        dkimConfig = {
            domainName:  domain,
            keySelector: sel,
            privateKey:  fs.readFileSync(key, 'utf8'),
        };
        console.log(`[sender] DKIM enabled for ${domain} selector=${sel}`);
    } catch (err) {
        console.warn('[sender] DKIM key load failed:', err.message);
    }
}

function configure({ host, port = 587, user, pass }) {
    configureDkim();
    if (!host) {
        transport = nodemailer.createTransport({ jsonTransport: true });
        simulated = true;
        console.log('[sender] No SMTP_OUT_HOST — outbound mail will be logged only');
        return;
    }
    transport = nodemailer.createTransport({
        host,
        port,
        secure:     port === 465,
        requireTLS: port !== 465,
        auth:       user ? { user, pass } : undefined,
        tls:        { minVersion: 'TLSv1.2' },
    });
    console.log(`[sender] Outbound relay: ${host}:${port}`);
}

async function sendEmail({ from, to, cc, subject, body, bodyHtml, attachments = [] }) {
    if (!transport) throw new Error('Sender not configured — call configure() first');

    const msg = {
        from,
        to,
        cc:          cc || undefined,
        subject:     subject || '(no subject)',
        text:        body,
        html:        bodyHtml || undefined,
        attachments: attachments.map(a => ({
            filename:    a.filename,
            content:     Buffer.isBuffer(a.data) ? a.data : Buffer.from(a.data),
            contentType: a.contentType,
        })),
    };

    if (dkimConfig) msg.dkim = dkimConfig;

    const info = await transport.sendMail(msg);
    if (simulated) console.log('[sender] (simulated) To:', to, '| Subject:', subject);
    return info;
}

module.exports = { configure, sendEmail };
