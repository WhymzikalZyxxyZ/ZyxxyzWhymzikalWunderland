'use strict';
/* global createDeck, shuffle, evaluateHand, compareHands */

const FCD_STARTING_CHIPS = 500;
const FCD_ANTE           = 10;

function newFCDState(playerNames) {
    return {
        phase: 'waiting',
        deck: [], pot: 0, currentBet: 0,
        activePlayerIdx: 0, dealerIdx: 0,
        actedThisRound: [],
        players: playerNames.map((name, id) => ({
            id, name, hand: [], chips: FCD_STARTING_CHIPS,
            bet: 0, folded: false, drawn: false,
        })),
    };
}

function startFCDHand(state) {
    const deck = (typeof shuffle === 'function') ? shuffle((typeof createDeck === 'function') ? createDeck() : []) : [];
    let pot = 0;
    const players = state.players.map(p => {
        pot += FCD_ANTE;
        return { ...p, hand: [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()],
                 bet: FCD_ANTE, chips: p.chips - FCD_ANTE, folded: false, drawn: false };
    });
    const activePlayerIdx = (state.dealerIdx + 1) % players.length;
    return { ...state, deck, players, pot, currentBet: FCD_ANTE,
             phase: 'bet1', activePlayerIdx, actedThisRound: [],
             winner: undefined, handResults: undefined };
}

function fcdAction(state, action, amount) {
    const players = state.players.map(p => ({ ...p }));
    const pidx    = state.activePlayerIdx;
    const p       = players[pidx];
    let   pot     = state.pot;
    let   cb      = state.currentBet;
    const acted   = state.actedThisRound.slice();
    if (!acted.includes(pidx)) acted.push(pidx);

    if (action === 'fold') {
        p.folded = true;
    } else if (action === 'call') {
        const toCall = Math.min(cb - p.bet, p.chips);
        pot += toCall; p.chips -= toCall; p.bet += toCall;
    } else if (action === 'raise') {
        const total = Math.min(cb - p.bet + (amount || FCD_ANTE * 2), p.chips);
        pot += total; p.chips -= total; p.bet += total;
        cb = p.bet;
        acted.length = 0; acted.push(pidx);
    }
    // 'check': nothing changes

    const notFolded = players.filter(pl => !pl.folded);
    if (notFolded.length === 1) {
        notFolded[0].chips += pot;
        return { ...state, players, pot: 0, currentBet: cb,
                 phase: 'showdown', winner: notFolded[0].id, handResults: [] };
    }

    const eligible = players.filter(pl => !pl.folded);
    const allDone  = eligible.every(pl => acted.includes(pl.id) && pl.bet === cb);

    let next = { ...state, players, pot, currentBet: cb, actedThisRound: acted };
    if (allDone) {
        if (state.phase === 'bet1') {
            const firstActive = fcdNextActive(players, state.dealerIdx);
            return { ...next, phase:'draw', activePlayerIdx: firstActive, actedThisRound: [] };
        }
        return fcdShowdown(next);
    }
    next.activePlayerIdx = fcdNextActive(players, pidx);
    return next;
}

// discardIndices: array of 0-based card indices to replace (0–5 elements)
function fcdDraw(state, pidx, discardIndices) {
    const deck    = state.deck.slice();
    const players = state.players.map(p => ({ ...p, hand: p.hand.slice() }));
    const p       = players[pidx];

    const kept    = p.hand.filter((_, i) => !discardIndices.includes(i));
    while (kept.length < 5) kept.push(deck.pop());
    p.hand  = kept;
    p.drawn = true;

    const acted   = state.actedThisRound.slice();
    if (!acted.includes(pidx)) acted.push(pidx);

    const eligible = players.filter(pl => !pl.folded);
    const allDrawn = eligible.every(pl => acted.includes(pl.id));

    if (allDrawn) {
        const bet2Players   = players.map(pl => ({ ...pl, bet: 0 }));
        const firstActive   = fcdNextActive(bet2Players, state.dealerIdx);
        return { ...state, deck, players: bet2Players, currentBet: 0,
                 phase: 'bet2', activePlayerIdx: firstActive, actedThisRound: [] };
    }
    return { ...state, deck, players, actedThisRound: acted,
             activePlayerIdx: fcdNextActive(players, pidx) };
}

function fcdShowdown(state) {
    const active = state.players.filter(p => !p.folded);
    const fn     = (typeof evaluateHand === 'function') ? evaluateHand : () => ({ rank:1, name:'High Card', tiebreakers:[] });
    const cmp    = (typeof compareHands === 'function') ? compareHands : () => 0;
    const evaled = active.map(p => ({ ...p, eval: fn(p.hand) }));
    evaled.sort((a, b) => -cmp(a.eval, b.eval));
    const winner  = evaled[0];
    const players = state.players.map(p =>
        p.id === winner.id ? { ...p, chips: p.chips + state.pot } : p
    );
    return { ...state, players, pot: 0, phase: 'showdown', winner: winner.id,
             handResults: evaled.map(e => ({ id: e.id, name: e.name, eval: e.eval })) };
}

function fcdNextActive(players, from) {
    const n = players.length;
    let i = (from + 1) % n;
    while (players[i].folded) i = (i + 1) % n;
    return i;
}

// Returns { action, discards? } for AI player
function getFCDAIAction(state, pidx) {
    const p      = state.players[pidx];
    const toCall = state.currentBet - p.bet;

    if (state.phase === 'draw') {
        return { action: 'draw', discards: fcdAIDiscards(p.hand) };
    }

    const fn  = (typeof evaluateHand === 'function') ? evaluateHand : () => ({ rank:1 });
    const str = fn(p.hand).rank;

    if (toCall === 0) return str >= 4 ? { action:'raise', amount: FCD_ANTE * 2 } : { action:'check' };
    if (str < 2)      return { action:'fold' };
    if (str >= 4)     return { action:'raise', amount: toCall };
    return { action:'call' };
}

function fcdAIDiscards(hand) {
    const freq = {};
    hand.forEach((c, i) => { freq[c.rank] = (freq[c.rank] || []); freq[c.rank].push(i); });
    const groups = Object.values(freq).sort((a, b) => b.length - a.length);
    if (groups[0].length >= 3) {
        // Keep the best group (3 or 4 of a kind), discard rest
        const keepIdxs = new Set(groups[0]);
        return hand.map((_, i) => i).filter(i => !keepIdxs.has(i));
    }
    if (groups[0].length === 2) {
        if (groups[1] && groups[1].length === 2) {
            // Two pair: keep both, discard kicker
            const keepIdxs = new Set([...groups[0], ...groups[1]]);
            return hand.map((_, i) => i).filter(i => !keepIdxs.has(i));
        }
        // One pair: keep pair, discard 3
        const keepIdxs = new Set(groups[0]);
        return hand.map((_, i) => i).filter(i => !keepIdxs.has(i));
    }
    // No pair: keep top 2 by rank value (Ace high)
    const sorted = hand.map((c, i) => ({ v: c.rank === 1 ? 14 : c.rank, i })).sort((a, b) => b.v - a.v);
    const keepIdxs = new Set(sorted.slice(0, 2).map(x => x.i));
    return hand.map((_, i) => i).filter(i => !keepIdxs.has(i));
}

if (typeof module !== 'undefined' && module.exports)
    module.exports = { FCD_STARTING_CHIPS, FCD_ANTE, newFCDState, startFCDHand,
                       fcdAction, fcdDraw, fcdShowdown, fcdNextActive,
                       getFCDAIAction, fcdAIDiscards };
