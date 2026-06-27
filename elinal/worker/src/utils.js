'use strict';

export function fetchWithTimeout(url, opts = {}, ms = 10_000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...opts, signal: controller.signal })
        .finally(() => clearTimeout(timer));
}

export function stripHtml(html) {
    return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
