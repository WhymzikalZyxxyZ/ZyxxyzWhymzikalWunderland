'use strict';

const ADJS  = ['swift','quiet','bold','bright','calm','cool','dark','deep','fair','free',
               'brave','crisp','fresh','grand','light','plain','sharp','smart','true','wide'];
const NOUNS = ['fox','owl','elk','wolf','hawk','bear','lynx','fawn','dove','swan',
               'crab','deer','hare','ibis','kite','lark','mole','newt','puma','wren'];

export function generateAddress(domain) {
    const adj  = ADJS [Math.floor(Math.random() * ADJS.length)];
    const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const hex  = _hex(6);   // 12 hex chars — ~281 trillion combinations
    return `${adj}.${noun}.${hex}@${domain}`;
}

function _hex(bytes) {
    const arr = crypto.getRandomValues(new Uint8Array(bytes));
    return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}
