'use strict';

// Per-process session key for AES-256-GCM encryption of all stored email data.
// Regenerated on every restart — ensures no persistent plaintext ever hits disk.
const { randomBytes, createCipheriv, createDecipheriv } = require('crypto');

const SESSION_KEY = randomBytes(32);

// Encode: iv(24 hex) : ciphertext(hex) : authTag(32 hex)
function encrypt(plaintext) {
    const iv     = randomBytes(12);
    const c      = createCipheriv('aes-256-gcm', SESSION_KEY, iv);
    const enc    = Buffer.concat([c.update(plaintext, 'utf8'), c.final()]);
    const tag    = c.getAuthTag();
    return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

function encryptBuf(buf) {
    const iv     = randomBytes(12);
    const c      = createCipheriv('aes-256-gcm', SESSION_KEY, iv);
    const enc    = Buffer.concat([c.update(buf), c.final()]);
    const tag    = c.getAuthTag();
    return `${iv.toString('hex')}:${enc.toString('hex')}:${tag.toString('hex')}`;
}

function decrypt(data) {
    const [ivHex, encHex, tagHex] = data.split(':');
    const d = createDecipheriv('aes-256-gcm', SESSION_KEY,
        Buffer.from(ivHex, 'hex'));
    d.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([d.update(Buffer.from(encHex, 'hex')), d.final()]).toString('utf8');
}

function decryptBuf(data) {
    const [ivHex, encHex, tagHex] = data.split(':');
    const d = createDecipheriv('aes-256-gcm', SESSION_KEY,
        Buffer.from(ivHex, 'hex'));
    d.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([d.update(Buffer.from(encHex, 'hex')), d.final()]);
}

function randomHex(bytes) { return randomBytes(bytes).toString('hex'); }

module.exports = { encrypt, encryptBuf, decrypt, decryptBuf, randomHex };
