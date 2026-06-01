'use strict';

const SUITS = ['S','H','D','C'];
const RANKS = [1,2,3,4,5,6,7,8,9,10,11,12,13];

function createDeck() {
    const d = [];
    for (const suit of SUITS)
        for (const rank of RANKS)
            d.push({ suit, rank });
    return d;
}

function shuffle(deck) {
    const d = deck.slice();
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
}

function rankLabel(rank) {
    if (rank === 1)  return 'A';
    if (rank === 11) return 'J';
    if (rank === 12) return 'Q';
    if (rank === 13) return 'K';
    return String(rank);
}

function suitSymbol(suit) {
    return { S:'♠', H:'♥', D:'♦', C:'♣' }[suit];
}

function cardLabel(card) {
    return rankLabel(card.rank) + suitSymbol(card.suit);
}

function isRed(card) {
    return card.suit === 'H' || card.suit === 'D';
}

// Evaluate best 5-card poker hand from 5–7 cards.
// Returns { rank (1–10), name, tiebreakers[] }
function evaluateHand(cards) {
    const combos = cards.length === 5 ? [cards] : choose5(cards);
    let best = null;
    for (const combo of combos) {
        const r = eval5(combo);
        if (!best || r.rank > best.rank ||
                (r.rank === best.rank && compareTB(r.tiebreakers, best.tiebreakers) > 0))
            best = r;
    }
    return best;
}

function choose5(cards) {
    const out = [];
    function pick(s, acc) {
        if (acc.length === 5) { out.push(acc.slice()); return; }
        for (let i = s; i < cards.length; i++) {
            acc.push(cards[i]); pick(i + 1, acc); acc.pop();
        }
    }
    pick(0, []);
    return out;
}

function eval5(hand) {
    const rs = hand.map(c => c.rank).sort((a, b) => a - b);
    const ss = hand.map(c => c.suit);
    const fl = ss.every(s => s === ss[0]);

    let str = false, strHi = 0;
    if (new Set(rs).size === 5 && rs[4] - rs[0] === 4) { str = true; strHi = rs[4]; }
    if (rs[0]===1 && rs[1]===2 && rs[2]===3 && rs[3]===4 && rs[4]===5) { str = true; strHi = 5; }
    if (rs[0]===1 && rs[1]===10 && rs[2]===11 && rs[3]===12 && rs[4]===13) { str = true; strHi = 14; }

    const freq = {};
    for (const r of rs) freq[r] = (freq[r] || 0) + 1;
    const groups = Object.entries(freq)
        .map(([r, c]) => ({ r: +r, c }))
        .sort((a, b) => b.c - a.c || b.r - a.r);
    const counts = groups.map(g => g.c);

    if (fl && str) return strHi === 14
        ? { rank:10, name:'Royal Flush',    tiebreakers:[14] }
        : { rank:9,  name:'Straight Flush', tiebreakers:[strHi] };
    if (counts[0] === 4) return { rank:8, name:'Four of a Kind',   tiebreakers:groups.map(g=>g.r) };
    if (counts[0] === 3 && counts[1] === 2)
                         return { rank:7, name:'Full House',        tiebreakers:groups.map(g=>g.r) };
    if (fl)              return { rank:6, name:'Flush',             tiebreakers:hiRanks(rs) };
    if (str)             return { rank:5, name:'Straight',          tiebreakers:[strHi] };
    if (counts[0] === 3) return { rank:4, name:'Three of a Kind',   tiebreakers:groups.map(g=>g.r) };
    if (counts[0] === 2 && counts[1] === 2)
                         return { rank:3, name:'Two Pair',          tiebreakers:groups.map(g=>g.r) };
    if (counts[0] === 2) return { rank:2, name:'One Pair',          tiebreakers:groups.map(g=>g.r) };
    return               { rank:1, name:'High Card',                tiebreakers:hiRanks(rs) };
}

function hiRanks(rs) { return rs.map(r => r === 1 ? 14 : r).sort((a, b) => b - a); }

function compareTB(a, b) {
    for (let i = 0; i < Math.min(a.length, b.length); i++)
        if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
}

function compareHands(a, b) {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return compareTB(a.tiebreakers, b.tiebreakers);
}

if (typeof module !== 'undefined' && module.exports)
    module.exports = { SUITS, RANKS, createDeck, shuffle, rankLabel, suitSymbol,
                       cardLabel, isRed, evaluateHand, compareHands, compareTB, hiRanks };
