'use strict';
const {
    SUITS, RANKS, createDeck, shuffle, rankLabel, suitSymbol, cardLabel,
    isRed, evaluateHand, compareHands, compareTB, hiRanks,
} = require('../js/engines/card-engine');

// ── createDeck ────────────────────────────────────────────────────────────────
describe('createDeck', () => {
    test('returns 52 cards', () => expect(createDeck()).toHaveLength(52));
    test('contains all 4 suits × 13 ranks', () => {
        const deck = createDeck();
        for (const suit of SUITS) {
            const ranks = deck.filter(c => c.suit === suit).map(c => c.rank).sort((a, b) => a - b);
            expect(ranks).toEqual(RANKS);
        }
    });
    test('no duplicate cards', () => {
        const deck = createDeck();
        const keys = new Set(deck.map(c => c.suit + c.rank));
        expect(keys.size).toBe(52);
    });
});

// ── shuffle ───────────────────────────────────────────────────────────────────
describe('shuffle', () => {
    test('returns same length', () => expect(shuffle(createDeck())).toHaveLength(52));
    test('contains all original cards', () => {
        const deck = createDeck();
        const key  = c => c.suit + c.rank;
        const orig = new Set(deck.map(key));
        shuffle(deck).forEach(c => expect(orig.has(key(c))).toBe(true));
    });
    test('does not mutate original', () => {
        const deck = createDeck();
        const copy = deck.map(c => ({ ...c }));
        shuffle(deck);
        expect(deck).toEqual(copy);
    });
    test('empty deck returns empty', () => expect(shuffle([])).toEqual([]));
});

// ── rankLabel ─────────────────────────────────────────────────────────────────
describe('rankLabel', () => {
    test('1  → A',  () => expect(rankLabel(1)).toBe('A'));
    test('11 → J',  () => expect(rankLabel(11)).toBe('J'));
    test('12 → Q',  () => expect(rankLabel(12)).toBe('Q'));
    test('13 → K',  () => expect(rankLabel(13)).toBe('K'));
    test('2  → "2"', () => expect(rankLabel(2)).toBe('2'));
    test('10 → "10"', () => expect(rankLabel(10)).toBe('10'));
});

// ── suitSymbol ────────────────────────────────────────────────────────────────
describe('suitSymbol', () => {
    test('S → ♠', () => expect(suitSymbol('S')).toBe('♠'));
    test('H → ♥', () => expect(suitSymbol('H')).toBe('♥'));
    test('D → ♦', () => expect(suitSymbol('D')).toBe('♦'));
    test('C → ♣', () => expect(suitSymbol('C')).toBe('♣'));
});

// ── cardLabel / isRed ─────────────────────────────────────────────────────────
test('cardLabel A of spades', () => expect(cardLabel({ rank:1, suit:'S' })).toBe('A♠'));
test('cardLabel K of hearts', () => expect(cardLabel({ rank:13, suit:'H' })).toBe('K♥'));

describe('isRed', () => {
    test('H is red', () => expect(isRed({ suit:'H' })).toBe(true));
    test('D is red', () => expect(isRed({ suit:'D' })).toBe(true));
    test('S is not red', () => expect(isRed({ suit:'S' })).toBe(false));
    test('C is not red', () => expect(isRed({ suit:'C' })).toBe(false));
});

// ── hiRanks ───────────────────────────────────────────────────────────────────
test('hiRanks converts ace to 14 and sorts descending', () => {
    expect(hiRanks([1, 3, 7, 10, 13])).toEqual([14, 13, 10, 7, 3]);
});
test('hiRanks without ace sorts descending', () => {
    expect(hiRanks([2, 5, 9])).toEqual([9, 5, 2]);
});

// ── compareTB ────────────────────────────────────────────────────────────────
describe('compareTB', () => {
    test('equal arrays → 0', () => expect(compareTB([1,2,3],[1,2,3])).toBe(0));
    test('a > b at first diff → positive', () => expect(compareTB([3,1],[2,9])).toBeGreaterThan(0));
    test('a < b at first diff → negative', () => expect(compareTB([1,9],[2,1])).toBeLessThan(0));
    test('different lengths → compares up to shorter', () => expect(compareTB([5],[5,9])).toBe(0));
    test('empty arrays → 0', () => expect(compareTB([],[])).toBe(0));
});

// ── compareHands ─────────────────────────────────────────────────────────────
describe('compareHands', () => {
    test('higher rank wins regardless of tiebreakers', () => {
        expect(compareHands({ rank:5, tiebreakers:[8] }, { rank:3, tiebreakers:[14] })).toBeGreaterThan(0);
    });
    test('equal rank falls through to tiebreakers', () => {
        expect(compareHands({ rank:5, tiebreakers:[8] }, { rank:5, tiebreakers:[6] })).toBeGreaterThan(0);
    });
    test('equal rank and tiebreakers → 0', () => {
        expect(compareHands({ rank:3, tiebreakers:[9,7] }, { rank:3, tiebreakers:[9,7] })).toBe(0);
    });
});

// ── evaluateHand — 5-card hands ───────────────────────────────────────────────
function h(...cards) { return cards.map(([r, s]) => ({ rank:r, suit:s })); }

describe('evaluateHand 5-card hands', () => {
    test('Royal Flush',    () => {
        const r = evaluateHand(h([1,'S'],[10,'S'],[11,'S'],[12,'S'],[13,'S']));
        expect(r.rank).toBe(10); expect(r.name).toBe('Royal Flush');
    });
    test('Straight Flush', () => {
        const r = evaluateHand(h([5,'H'],[6,'H'],[7,'H'],[8,'H'],[9,'H']));
        expect(r.rank).toBe(9); expect(r.name).toBe('Straight Flush');
    });
    test('Wheel Straight Flush (A-2-3-4-5)', () => {
        const r = evaluateHand(h([1,'D'],[2,'D'],[3,'D'],[4,'D'],[5,'D']));
        expect(r.rank).toBe(9); expect(r.tiebreakers[0]).toBe(5);
    });
    test('Four of a Kind', () => {
        const r = evaluateHand(h([7,'S'],[7,'H'],[7,'D'],[7,'C'],[3,'S']));
        expect(r.rank).toBe(8); expect(r.name).toBe('Four of a Kind');
    });
    test('Full House',     () => {
        const r = evaluateHand(h([10,'S'],[10,'H'],[10,'D'],[5,'S'],[5,'H']));
        expect(r.rank).toBe(7); expect(r.name).toBe('Full House');
    });
    test('Flush',          () => {
        const r = evaluateHand(h([2,'C'],[5,'C'],[7,'C'],[9,'C'],[11,'C']));
        expect(r.rank).toBe(6); expect(r.name).toBe('Flush');
    });
    test('Straight',       () => {
        const r = evaluateHand(h([5,'S'],[6,'H'],[7,'D'],[8,'C'],[9,'S']));
        expect(r.rank).toBe(5); expect(r.name).toBe('Straight');
    });
    test('Broadway Straight (A-K-Q-J-10, not flush)', () => {
        const r = evaluateHand(h([1,'S'],[10,'H'],[11,'D'],[12,'C'],[13,'S']));
        expect(r.rank).toBe(5); expect(r.tiebreakers[0]).toBe(14);
    });
    test('Three of a Kind',() => {
        const r = evaluateHand(h([4,'S'],[4,'H'],[4,'D'],[8,'S'],[11,'C']));
        expect(r.rank).toBe(4); expect(r.name).toBe('Three of a Kind');
    });
    test('Two Pair',       () => {
        const r = evaluateHand(h([9,'S'],[9,'H'],[6,'D'],[6,'S'],[3,'C']));
        expect(r.rank).toBe(3); expect(r.name).toBe('Two Pair');
    });
    test('One Pair',       () => {
        const r = evaluateHand(h([2,'S'],[2,'H'],[5,'D'],[8,'C'],[11,'S']));
        expect(r.rank).toBe(2); expect(r.name).toBe('One Pair');
    });
    test('High Card',      () => {
        const r = evaluateHand(h([2,'S'],[5,'H'],[7,'D'],[9,'C'],[11,'S']));
        expect(r.rank).toBe(1); expect(r.name).toBe('High Card');
    });
});

// ── evaluateHand — 6 and 7 card hands (choose5) ───────────────────────────────
describe('evaluateHand multi-card best-hand', () => {
    test('selects flush from 6 cards when available', () => {
        const cards = h([2,'H'],[5,'H'],[7,'H'],[9,'H'],[11,'H'],[3,'S']);
        expect(evaluateHand(cards).rank).toBeGreaterThanOrEqual(6);
    });
    test('picks straight over pair from 7 cards', () => {
        const cards = h([5,'S'],[6,'H'],[7,'D'],[8,'C'],[9,'S'],[9,'H'],[2,'D']);
        expect(evaluateHand(cards).rank).toBe(5);
    });
    test('picks four-of-a-kind from 7 cards', () => {
        const cards = h([1,'S'],[1,'H'],[1,'D'],[1,'C'],[5,'S'],[8,'H'],[13,'D']);
        expect(evaluateHand(cards).rank).toBe(8);
    });
});
