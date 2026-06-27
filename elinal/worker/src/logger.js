'use strict';

export function log(level, event, kv = {}) {
    const entry = JSON.stringify({ level, event, ts: new Date().toISOString(), ...kv });
    if (level === 'error') console.error(entry);
    else if (level === 'warn')  console.warn(entry);
    else                        console.log(entry);
}
