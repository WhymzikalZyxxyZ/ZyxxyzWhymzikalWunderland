'use strict';

// Web Crypto API — available natively in Cloudflare Workers

export function randomHex(bytes) {
    const arr = crypto.getRandomValues(new Uint8Array(bytes));
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

export async function generateKey() {
    return crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,           // non-extractable — key never leaves the DO
        ['encrypt', 'decrypt'],
    );
}

export async function encrypt(key, text) {
    if (!text) return '';
    const iv         = crypto.getRandomValues(new Uint8Array(12));
    const encoded    = new TextEncoder().encode(text);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const combined   = new Uint8Array(12 + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), 12);
    return btoa(String.fromCharCode(...combined));
}

export async function decrypt(key, b64) {
    if (!b64) return '';
    try {
        const combined   = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const iv         = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        const decrypted  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
        return new TextDecoder().decode(decrypted);
    } catch {
        return '';
    }
}

export async function encryptBuf(key, buf) {
    const iv         = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf);
    const combined   = new Uint8Array(12 + ciphertext.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(ciphertext), 12);
    return btoa(String.fromCharCode(...combined));
}

export async function decryptBuf(key, b64) {
    const combined   = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const iv         = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const decrypted  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new Uint8Array(decrypted);
}
