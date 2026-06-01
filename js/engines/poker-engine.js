'use strict';
/* global createDeck, shuffle, evaluateHand, compareHands */

const POKER_STARTING_CHIPS = 1000;
const SMALL_BLIND          = 10;
const BIG_BLIND            = 20;

function newPokerState(playerNames) {
    return {
        phase: 'waiting',
        deck: [], community: [], pot: 0, currentBet: 0,
        activePlayerIdx: 0, dealerIdx: 0,
        actedThisRound: [],
        players: playerNames.map((name, id) => ({
            id, name, hand: [], chips: POKER_STARTING_CHIPS,
            bet: 0, folded: false, allIn: false,
        })),
    };
}

function startPokerHand(state) {
    const deck    = (typeof shuffle === 'function') ? shuffle((typeof createDeck === 'function') ? createDeck() : []) : [];
    const n       = state.players.length;
    const players = state.players.map(p => ({
        ...p, hand: [deck.pop(), deck.pop()], bet: 0, folded: false, allIn: false,
    }));

    const sbIdx = (state.dealerIdx + 1) % n;
    const bbIdx = (state.dealerIdx + 2) % n;
    let pot = 0;
    players[sbIdx].chips -= SMALL_BLIND; players[sbIdx].bet = SMALL_BLIND; pot += SMALL_BLIND;
    players[bbIdx].chips -= BIG_BLIND;   players[bbIdx].bet = BIG_BLIND;   pot += BIG_BLIND;

    return {
        ...state, deck, players, community: [], pot, currentBet: BIG_BLIND,
        phase: 'preflop',
        activePlayerIdx: (bbIdx + 1) % n,
        actedThisRound: [sbIdx, bbIdx],
        winner: undefined, handResults: undefined,
    };
}

function pokerAction(state, action, amount) {
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
        if (p.chips === 0) p.allIn = true;
    } else if (action === 'raise') {
        const total = Math.min(cb - p.bet + (amount || BIG_BLIND), p.chips);
        pot += total; p.chips -= total; p.bet += total;
        cb = p.bet;
        if (p.chips === 0) p.allIn = true;
        acted.length = 0; acted.push(pidx);
    }
    // 'check': nothing changes

    const notFolded = players.filter(pl => !pl.folded);
    if (notFolded.length === 1) {
        notFolded[0].chips += pot;
        return { ...state, players, pot: 0, currentBet: cb, phase: 'showdown',
                 winner: notFolded[0].id, handResults: [] };
    }

    const eligible = players.filter(pl => !pl.folded && !pl.allIn);
    const allDone  = eligible.every(pl => acted.includes(pl.id) && pl.bet === cb);

    let next = { ...state, players, pot, currentBet: cb, actedThisRound: acted };
    if (allDone) return pokerAdvancePhase(next);
    next.activePlayerIdx = pokerNextActive(players, pidx);
    return next;
}

function pokerNextActive(players, from) {
    const n = players.length;
    let i = (from + 1) % n;
    while (players[i].folded || players[i].allIn) i = (i + 1) % n;
    return i;
}

function pokerAdvancePhase(state) {
    const ORDER = ['preflop','flop','turn','river','showdown'];
    const next  = ORDER[ORDER.indexOf(state.phase) + 1];
    let deck      = state.deck.slice();
    let community = state.community.slice();
    const players = state.players.map(p => ({ ...p, bet: 0 }));

    if (next === 'flop')  { deck.pop(); community.push(deck.pop(), deck.pop(), deck.pop()); }
    if (next === 'turn')  { deck.pop(); community.push(deck.pop()); }
    if (next === 'river') { deck.pop(); community.push(deck.pop()); }
    if (next === 'showdown') return pokerShowdown({ ...state, deck, community, players, phase: next });

    return {
        ...state, deck, community, players, phase: next,
        currentBet: 0,
        activePlayerIdx: pokerNextActive(players, state.dealerIdx),
        actedThisRound: [],
    };
}

function pokerShowdown(state) {
    const active = state.players.filter(p => !p.folded);
    const fn     = (typeof evaluateHand === 'function') ? evaluateHand : () => ({ rank:1, name:'High Card', tiebreakers:[] });
    const cmp    = (typeof compareHands === 'function') ? compareHands : () => 0;
    const evaled = active.map(p => ({ ...p, eval: fn([...p.hand, ...state.community]) }));
    evaled.sort((a, b) => -cmp(a.eval, b.eval));
    const winner = evaled[0];
    const players = state.players.map(p =>
        p.id === winner.id ? { ...p, chips: p.chips + state.pot } : p
    );
    return { ...state, players, pot: 0, phase: 'showdown', winner: winner.id,
             handResults: evaled.map(e => ({ id: e.id, name: e.name, eval: e.eval })) };
}

function getPokerAIAction(state, pidx) {
    const p      = state.players[pidx];
    const toCall = state.currentBet - p.bet;
    const fn     = (typeof evaluateHand === 'function') ? evaluateHand : () => ({ rank:1 });
    const all    = [...p.hand, ...state.community];
    const str    = all.length >= 5 ? fn(all).rank / 10 :
                   fn(p.hand.concat([{suit:'S',rank:7},{suit:'H',rank:2},{suit:'D',rank:9}])).rank / 10;

    if (toCall === 0) return str > 0.5 ? { action:'raise', amount: BIG_BLIND * 2 } : { action:'check' };
    if (str < 0.2)    return { action:'fold' };
    if (str > 0.6)    return { action:'raise', amount: Math.max(toCall, BIG_BLIND) };
    return { action:'call' };
}

if (typeof module !== 'undefined' && module.exports)
    module.exports = { POKER_STARTING_CHIPS, SMALL_BLIND, BIG_BLIND,
                       newPokerState, startPokerHand, pokerAction,
                       pokerAdvancePhase, pokerShowdown, pokerNextActive, getPokerAIAction };
