'use strict';
const cardEngine = require('../js/engines/card-engine');
global.createDeck = cardEngine.createDeck;
global.shuffle    = cardEngine.shuffle;

const {
    BJ_STARTING_CHIPS, bjHandValue, bjIsBust, bjIsBlackjack, bjDealerShouldHit,
    bjResult, newBJGame, bjDeal, bjHit, bjDouble, bjStand, bjRunDealer,
} = require('../js/engines/blackjack-engine');

const c  = (rank, suit = 'S') => ({ rank, suit });
const bj = [c(1), c(13, 'H')];   // blackjack hand
const v20 = [c(10), c(10, 'H')]; // 20
const v18 = [c(10), c(8)];       // 18
const bust = [c(10), c(10, 'H'), c(5)]; // 25

// ── Constants ─────────────────────────────────────────────────────────────────
test('BJ_STARTING_CHIPS is 500', () => expect(BJ_STARTING_CHIPS).toBe(500));

// ── bjHandValue ───────────────────────────────────────────────────────────────
describe('bjHandValue', () => {
    test('sums number cards',            () => expect(bjHandValue([c(5),c(8)])).toBe(13));
    test('face cards worth 10',          () => expect(bjHandValue([c(11),c(12)])).toBe(20));
    test('ace counts as 11 when safe',   () => expect(bjHandValue([c(1),c(9)])).toBe(20));
    test('ace counts as 1 when bust',    () => expect(bjHandValue([c(1),c(9),c(7)])).toBe(17));
    test('two aces: 12',                 () => expect(bjHandValue([c(1),c(1)])).toBe(12));
    test('A+K = 21',                     () => expect(bjHandValue(bj)).toBe(21));
    test('10+J+A = 21 (ace→1)',          () => expect(bjHandValue([c(10),c(11),c(1)])).toBe(21));
});

// ── bjIsBust ─────────────────────────────────────────────────────────────────
test('bjIsBust: 22 is bust',   () => expect(bjIsBust(bust)).toBe(true));
test('bjIsBust: 21 is not',    () => expect(bjIsBust([c(10),c(11)])).toBe(false));
test('bjIsBust: 20 is not',    () => expect(bjIsBust(v20)).toBe(false));

// ── bjIsBlackjack ─────────────────────────────────────────────────────────────
test('bjIsBlackjack: A+K',                      () => expect(bjIsBlackjack(bj)).toBe(true));
test('bjIsBlackjack: three-card 21 is not',     () => expect(bjIsBlackjack([c(7),c(7),c(7)])).toBe(false));
test('bjIsBlackjack: 20 is not',                () => expect(bjIsBlackjack(v20)).toBe(false));

// ── bjDealerShouldHit ─────────────────────────────────────────────────────────
test('bjDealerShouldHit: 16 → hit',    () => expect(bjDealerShouldHit([c(10),c(6)])).toBe(true));
test('bjDealerShouldHit: 17 → stand',  () => expect(bjDealerShouldHit([c(10),c(7)])).toBe(false));
test('bjDealerShouldHit: 21 → stand',  () => expect(bjDealerShouldHit(bj)).toBe(false));

// ── bjResult ─────────────────────────────────────────────────────────────────
describe('bjResult', () => {
    test('player bust → lose',           () => expect(bjResult(bust, v18)).toBe('lose'));
    test('both blackjack → push',        () => expect(bjResult(bj, bj)).toBe('push'));
    test('player BJ, dealer not → BJ',   () => expect(bjResult(bj, v18)).toBe('blackjack'));
    test('dealer BJ, player not → lose', () => expect(bjResult(v18, bj)).toBe('lose'));
    test('player 20 > dealer 18 → win',  () => expect(bjResult(v20, v18)).toBe('win'));
    test('tie → push',                   () => expect(bjResult(v20, v20)).toBe('push'));
    test('player 18 < dealer 20 → lose', () => expect(bjResult(v18, v20)).toBe('lose'));
    test('dealer bust → win',            () => expect(bjResult(v18, bust)).toBe('win'));
});

// ── newBJGame ─────────────────────────────────────────────────────────────────
describe('newBJGame', () => {
    test('two-deck shoe = 104 cards', () => expect(newBJGame().deck).toHaveLength(104));
    test('starts with 500 chips',     () => expect(newBJGame().chips).toBe(500));
    test('phase is "bet"',            () => expect(newBJGame().phase).toBe('bet'));
    test('bet is 0',                  () => expect(newBJGame().bet).toBe(0));
});

// ── bjDeal ───────────────────────────────────────────────────────────────────
describe('bjDeal', () => {
    let game;
    beforeEach(() => { game = newBJGame(); });

    test('deals 2 cards to player',    () => expect(bjDeal(game, 20).player).toHaveLength(2));
    test('deals 2 cards to dealer',    () => expect(bjDeal(game, 20).dealer).toHaveLength(2));
    test('deducts bet from chips',     () => expect(bjDeal(game, 50).chips).toBe(450));
    test('phase becomes "playing"',    () => expect(bjDeal(game, 10).phase).toBe('playing'));
    test('canDouble true (chips≥bet)', () => expect(bjDeal(game, 20).canDouble).toBe(true));
    test('canDouble false (chips<bet)',() => {
        expect(bjDeal({ ...game, chips: 25 }, 20).canDouble).toBe(false); // 25-20=5 < 20
    });
    test('records bet on state',       () => expect(bjDeal(game, 35).bet).toBe(35));
});

// ── bjHit ────────────────────────────────────────────────────────────────────
describe('bjHit', () => {
    test('adds a card to player hand', () => {
        const g = bjDeal(newBJGame(), 20);
        expect(bjHit(g).player).toHaveLength(3);
    });
    test('bust → phase=result, result=lose', () => {
        const g = {
            deck: [c(9)], player: [c(10), c(10)], dealer: [c(5), c(6)],
            phase: 'playing', bet: 20, chips: 480, result: null, canDouble: false,
        };
        const r = bjHit(g);
        expect(r.phase).toBe('result');
        expect(r.result).toBe('lose');
    });
    test('non-bust → still playing', () => {
        const g = {
            deck: [c(3)], player: [c(5), c(7)], dealer: [c(5), c(6)],
            phase: 'playing', bet: 20, chips: 480, result: null, canDouble: false,
        };
        const r = bjHit(g);
        expect(r.phase).toBe('playing');
        expect(r.player).toHaveLength(3);
    });
    test('canDouble set to false after hit', () => {
        const g = bjDeal(newBJGame(), 20);
        expect(bjHit(g).canDouble).toBe(false);
    });
});

// ── bjStand ──────────────────────────────────────────────────────────────────
describe('bjStand', () => {
    test('returns result phase', () => {
        const g = bjDeal(newBJGame(), 20);
        expect(bjStand(g).phase).toBe('result');
    });
    test('result is one of the 4 outcomes', () => {
        const g = bjDeal(newBJGame(), 20);
        expect(['win','lose','push','blackjack']).toContain(bjStand(g).result);
    });
});

// ── bjDouble ─────────────────────────────────────────────────────────────────
describe('bjDouble', () => {
    test('doubles bet', () => {
        const g = bjDeal(newBJGame(), 20);
        expect(bjDouble(g).bet).toBe(40);
    });
    test('returns result phase', () => {
        const g = bjDeal(newBJGame(), 20);
        expect(bjDouble(g).phase).toBe('result');
    });
    test('bust on double → lose immediately', () => {
        const g = {
            deck: [c(10)], player: [c(10), c(7)], dealer: [c(5), c(10)],
            phase: 'playing', bet: 20, chips: 480, result: null, canDouble: true,
        };
        const r = bjDouble(g);
        expect(r.result).toBe('lose');
        expect(r.phase).toBe('result');
    });
});

// ── bjRunDealer ──────────────────────────────────────────────────────────────
describe('bjRunDealer', () => {
    test('dealer stands at 17+', () => {
        const g = {
            deck: [c(5)], player: [c(5)], dealer: [c(10), c(6)],
            phase: 'playing', bet: 20, chips: 480, result: null,
        };
        const r = bjRunDealer(g);
        expect(bjHandValue(r.dealer)).toBeGreaterThanOrEqual(17);
    });
    test('blackjack payout is 2.5× bet (floored)', () => {
        // Player has A+K (BJ), dealer has 5+10=15 → draws 5 → 20, no BJ
        const g = {
            deck: [c(5)], player: [c(1), c(13,'H')], dealer: [c(5), c(10)],
            phase: 'playing', bet: 20, chips: 480, result: null,
        };
        const r = bjRunDealer(g);
        expect(r.result).toBe('blackjack');
        expect(r.chips).toBe(480 + Math.floor(20 * 2.5)); // 530
    });
    test('win payout is 2× bet', () => {
        // Player 20, dealer goes bust
        const g = {
            deck: [c(10)], player: [c(10), c(10,'H')], dealer: [c(9), c(7)],
            phase: 'playing', bet: 20, chips: 480, result: null,
        };
        const r = bjRunDealer(g);
        expect(r.result).toBe('win');
        expect(r.chips).toBe(480 + 40);
    });
    test('push returns bet', () => {
        // Player 20, dealer 20, no more cards to draw
        const g = {
            deck: [], player: [c(10), c(10,'H')], dealer: [c(10,'D'), c(10,'C')],
            phase: 'playing', bet: 20, chips: 480, result: null,
        };
        const r = bjRunDealer(g);
        expect(r.result).toBe('push');
        expect(r.chips).toBe(480 + 20);
    });
});
