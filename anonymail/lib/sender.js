'use strict';

const nodemailer = require('nodemailer');

let transport = null;
let simulated = false;

function configure({ host, port = 587, user, pass }) {
    if (!host) {
        // No outbound relay configured — log-only mode
        transport  = nodemailer.createTransport({ jsonTransport: true });
        simulated  = true;
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

    const info = await transport.sendMail(msg);

    if (simulated) {
        console.log('[sender] (simulated) To:', to, '| Subject:', subject);
    }

    return info;
}

module.exports = { configure, sendEmail };
