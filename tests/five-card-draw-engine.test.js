'use strict';
const cardEngine = require('../js/card-engine');
global.createDeck   = cardEngine.createDeck;
global.shuffle      = cardEngine.shuffle;
global.evaluateHand = cardEngine.evaluateHand;
global.compareHands = cardEngine.compareHands;

const {
    FCD_STARTING_CHIPS, FCD_ANTE,
    newFCDState, startFCDHand, fcdAction, fcdDraw,
    fcdShowdown, fcdNextActive, getFCDAIAction, fcdAIDiscards,
} = require('../js/five-card-draw-engine');

const NAMES = ['Alice', 'Bob'];
const c = (rank, suit = 'S') => ({ rank, suit });

// ── Constants ─────────────────────────────────────────────────────────────────
test('FCD_STARTING_CHIPS is 500', () => expect(FCD_STARTING_CHIPS).toBe(500));
test('FCD_ANTE is 10',           () => expect(FCD_ANTE).toBe(10));

// ── newFCDState ───────────────────────────────────────────────────────────────
describe('newFCDState', () => {
    let state;
    beforeEach(() => { state = newFCDState(NAMES); });

    test('creates correct player count',   () => expect(state.players).toHaveLength(2));
    test('player names assigned',          () => expect(state.players[0].name).toBe('Alice'));
    test('starting chips',                 () => expect(state.players[0].chips).toBe(500));
    test('phase is "waiting"',             () => expect(state.phase).toBe('waiting'));
    test('pot is 0',                       () => expect(state.pot).toBe(0));
    test('players have unique ids',        () => {
        const ids = new Set(state.players.map(p => p.id));
        expect(ids.size).toBe(2);
    });
});

// ── startFCDHand ──────────────────────────────────────────────────────────────
describe('startFCDHand', () => {
    let state;
    beforeEach(() => { state = startFCDHand(newFCDState(NAMES)); });

    test('phase is "bet1"',                () => expect(state.phase).toBe('bet1'));
    test('each player gets 5 cards',       () => state.players.forEach(p => expect(p.hand).toHaveLength(5)));
    test('pot equals ante × players',      () => expect(state.pot).toBe(FCD_ANTE * 2));
    test('chips reduced by ante',          () => state.players.forEach(p =>
        expect(p.chips).toBe(FCD_STARTING_CHIPS - FCD_ANTE)
    ));
    test('players not folded',             () => state.players.forEach(p => expect(p.folded).toBe(false)));
    test('players not drawn',              () => state.players.forEach(p => expect(p.drawn).toBe(false)));
    test('currentBet equals ante',         () => expect(state.currentBet).toBe(FCD_ANTE));
});

// ── fcdNextActive ─────────────────────────────────────────────────────────────
describe('fcdNextActive', () => {
    test('skips folded player', () => {
        const players = [
            { folded:false }, { folded:true }, { folded:false },
        ];
        expect(fcdNextActive(players, 0)).toBe(2);
    });
    test('wraps around', () => {
        const players = [{ folded:false }, { folded:false }];
        expect(fcdNextActive(players, 1)).toBe(0);
    });
    test('skips multiple folded', () => {
        const players = [
            { folded:false }, { folded:true }, { folded:true }, { folded:false },
        ];
        expect(fcdNextActive(players, 0)).toBe(3);
    });
});

// ── fcdAction — betting ───────────────────────────────────────────────────────
describe('fcdAction', () => {
    let state;
    beforeEach(() => { state = startFCDHand(newFCDState(NAMES)); });

    test('fold marks player folded', () => {
        const pidx = state.activePlayerIdx;
        const r = fcdAction(state, 'fold');
        expect(r.players[pidx].folded).toBe(true);
    });
    test('fold with 1 remaining → showdown', () => {
        const r = fcdAction(state, 'fold');
        if (state.players.filter(p => !p.folded).length === 2) {
            // After fold, only 1 remains
            expect(r.phase).toBe('showdown');
            expect(r.winner).toBeDefined();
        }
    });
    test('call reduces chips and adds to pot', () => {
        const pidx = state.activePlayerIdx;
        const before = state.players[pidx].chips;
        const toCall = state.currentBet - state.players[pidx].bet;
        const r = fcdAction(state, 'call');
        expect(r.players[pidx].chips).toBe(before - toCall);
    });
    test('raise increases currentBet', () => {
        const r = fcdAction(state, 'raise', FCD_ANTE * 2);
        expect(r.currentBet).toBeGreaterThan(state.currentBet);
    });
    test('raise resets actedThisRound', () => {
        const pidx = state.activePlayerIdx;
        const r = fcdAction(state, 'raise', FCD_ANTE * 2);
        expect(r.actedThisRound).toHaveLength(1);
        expect(r.actedThisRound[0]).toBe(pidx);
    });
    test('check leaves pot unchanged', () => {
        // Set up state where currentBet == player bet (can check)
        const s = { ...state, currentBet: state.players[state.activePlayerIdx].bet };
        const potBefore = s.pot;
        const r = fcdAction(s, 'check');
        expect(r.pot).toBe(potBefore);
    });
    test('all bet1 actions done → advances to draw', () => {
        let s = state;
        // Both players check (need to set currentBet=bet so check is logical)
        s = { ...s, currentBet: FCD_ANTE }; // both already bet ante
        s = fcdAction(s, 'check'); // player 1 checks
        s = fcdAction(s, 'check'); // player 0 checks → all done
        expect(s.phase).toBe('draw');
    });
});

// ── fcdDraw ───────────────────────────────────────────────────────────────────
describe('fcdDraw', () => {
    let state;
    beforeEach(() => {
        let s = startFCDHand(newFCDState(NAMES));
        // Fast-forward to draw phase
        s = { ...s, phase:'draw', currentBet:FCD_ANTE, actedThisRound:[] };
        state = s;
    });

    test('replaces discarded cards with new cards', () => {
        const pidx = state.activePlayerIdx;
        const originalHand = state.players[pidx].hand.slice();
        const r = fcdDraw(state, pidx, [0,1,2]); // discard first 3
        const newHand = r.players[pidx].hand;
        expect(newHand).toHaveLength(5);
        // Kept cards 3 and 4 should be unchanged
        expect(newHand.slice(0,2)).toEqual(originalHand.slice(3,5));
    });
    test('stand pat (discard 0) keeps all cards', () => {
        const pidx = state.activePlayerIdx;
        const originalHand = state.players[pidx].hand.slice();
        const r = fcdDraw(state, pidx, []);
        expect(r.players[pidx].hand).toEqual(originalHand);
    });
    test('marks player as drawn', () => {
        const pidx = state.activePlayerIdx;
        const r = fcdDraw(state, pidx, [0]);
        expect(r.players[pidx].drawn).toBe(true);
    });
    test('advances to bet2 when all have drawn', () => {
        let s = state;
        const first = s.activePlayerIdx;
        const second = fcdNextActive(s.players, first);
        s = fcdDraw(s, first, []);
        s = fcdDraw(s, second, []);
        expect(s.phase).toBe('bet2');
    });
    test('bet2: currentBet reset to 0', () => {
        let s = state;
        const first = s.activePlayerIdx;
        const second = fcdNextActive(s.players, first);
        s = fcdDraw(s, first, []);
        s = fcdDraw(s, second, []);
        expect(s.currentBet).toBe(0);
    });
    test('middle draw: stays in draw phase', () => {
        // Only one player draws (2-player game, one remaining)
        const pidx = state.activePlayerIdx;
        const r = fcdDraw(state, pidx, []);
        if (r.phase === 'draw') {
            expect(r.actedThisRound).toContain(pidx);
        }
    });
});

// ── fcdShowdown ───────────────────────────────────────────────────────────────
describe('fcdShowdown', () => {
    test('determines a winner', () => {
        const s = startFCDHand(newFCDState(NAMES));
        const r = fcdShowdown({ ...s, pot: 100, phase:'bet2' });
        expect(r.winner).toBeDefined();
        expect(r.pot).toBe(0);
    });
    test('winner receives pot', () => {
        const s = startFCDHand(newFCDState(NAMES));
        const r = fcdShowdown({ ...s, pot: 100, phase:'bet2' });
        const winner = r.players.find(p => p.id === r.winner);
        expect(winner.chips).toBeGreaterThan(0);
    });
    test('returns handResults array', () => {
        const s = startFCDHand(newFCDState(NAMES));
        const r = fcdShowdown({ ...s, pot: 100, phase:'bet2' });
        expect(Array.isArray(r.handResults)).toBe(true);
        expect(r.handResults.length).toBeGreaterThan(0);
    });
    test('folded players excluded from results', () => {
        let s = startFCDHand(newFCDState(['A','B','C']));
        s.players[2].folded = true;
        const r = fcdShowdown({ ...s, pot: 100, phase:'bet2' });
        const folded = r.handResults.find(hr => hr.id === 2);
        expect(folded).toBeUndefined();
    });
});

// ── fcdAIDiscards ─────────────────────────────────────────────────────────────
describe('fcdAIDiscards', () => {
    function hand(...cards) { return cards; }

    test('four of a kind: discard 1 kicker', () => {
        const h = hand(c(7),c(7,'H'),c(7,'D'),c(7,'C'),c(3));
        const discards = fcdAIDiscards(h);
        expect(discards).toHaveLength(1);
        expect(discards[0]).toBe(4); // index of the kicker (rank 3 at index 4)
    });
    test('three of a kind: discard 2', () => {
        const h = hand(c(5),c(5,'H'),c(5,'D'),c(8),c(2));
        const discards = fcdAIDiscards(h);
        expect(discards).toHaveLength(2);
    });
    test('two pair: discard 1 kicker', () => {
        const h = hand(c(9),c(9,'H'),c(6),c(6,'H'),c(3));
        const discards = fcdAIDiscards(h);
        expect(discards).toHaveLength(1);
    });
    test('one pair: discard 3', () => {
        const h = hand(c(4),c(4,'H'),c(8),c(11),c(2));
        const discards = fcdAIDiscards(h);
        expect(discards).toHaveLength(3);
    });
    test('no pair: discard 3, keep top 2', () => {
        // High cards are A(1→14) and K(13). Others: 3, 5, 7.
        const h = hand(c(3),c(5),c(1,'H'),c(13,'D'),c(7));
        const discards = fcdAIDiscards(h);
        expect(discards).toHaveLength(3);
        // Kept are indices 2 (A) and 3 (K)
        expect(discards).not.toContain(2);
        expect(discards).not.toContain(3);
    });
    test('no pair, ace treated as 14', () => {
        const h = hand(c(1),c(13,'H'),c(2),c(4),c(6));
        const discards = fcdAIDiscards(h);
        expect(discards).not.toContain(0); // Ace kept
        expect(discards).not.toContain(1); // King kept
    });
});

// ── getFCDAIAction ────────────────────────────────────────────────────────────
describe('getFCDAIAction', () => {
    function makePlayer(id, hand, chips = 490, bet = 10) {
        return { id, name:'AI'+id, hand, chips, bet, folded:false, drawn:false };
    }

    test('draw phase → returns draw action with discards', () => {
        const hand = [c(3),c(5),c(4,'H'),c(4,'D'),c(8)];
        const s = {
            phase:'draw', players:[makePlayer(0, hand)],
            currentBet:10, pot:20, deck:[], dealerIdx:0, actedThisRound:[],
        };
        const r = getFCDAIAction(s, 0);
        expect(r.action).toBe('draw');
        expect(Array.isArray(r.discards)).toBe(true);
    });

    test('bet phase, toCall=0, strong hand → raise', () => {
        const hand = [c(7),c(7,'H'),c(7,'D'),c(7,'C'),c(3)]; // four of a kind
        const s = {
            phase:'bet1', players:[makePlayer(0, hand, 490, 10)],
            currentBet:10, pot:20, deck:[], dealerIdx:0, actedThisRound:[],
        };
        const r = getFCDAIAction(s, 0);
        // str = evaluateHand([7,7,7,7,3]).rank = 8, 8 >= 4 → raise
        expect(r.action).toBe('raise');
    });

    test('bet phase, toCall=0, weak hand → check', () => {
        const hand = [c(2),c(5),c(9),c(11),c(3)]; // high card
        const s = {
            phase:'bet1', players:[makePlayer(0, hand, 490, 10)],
            currentBet:10, pot:20, deck:[], dealerIdx:0, actedThisRound:[],
        };
        const r = getFCDAIAction(s, 0);
        // str = 1 (high card), 1 < 4 → check (when toCall=0)
        expect(r.action).toBe('check');
    });

    test('bet phase, toCall>0, very weak → fold', () => {
        const hand = [c(2),c(5),c(9),c(11),c(3)]; // high card (rank 1)
        const s = {
            phase:'bet1', players:[makePlayer(0, hand, 490, 0)],
            currentBet:30, pot:40, deck:[], dealerIdx:0, actedThisRound:[],
        };
        const r = getFCDAIAction(s, 0);
        // str = 1 < 2 → fold
        expect(r.action).toBe('fold');
    });

    test('bet phase, toCall>0, strong → raise', () => {
        const hand = [c(7),c(7,'H'),c(7,'D'),c(7,'C'),c(3)]; // four of a kind (rank 8)
        const s = {
            phase:'bet1', players:[makePlayer(0, hand, 490, 0)],
            currentBet:30, pot:40, deck:[], dealerIdx:0, actedThisRound:[],
        };
        const r = getFCDAIAction(s, 0);
        // str = 8 >= 4 → raise
        expect(r.action).toBe('raise');
    });

    test('bet phase, toCall>0, medium → call', () => {
        const hand = [c(4),c(4,'H'),c(9),c(11),c(3)]; // one pair (rank 2)
        const s = {
            phase:'bet1', players:[makePlayer(0, hand, 490, 0)],
            currentBet:20, pot:30, deck:[], dealerIdx:0, actedThisRound:[],
        };
        const r = getFCDAIAction(s, 0);
        // str = 2, not < 2, not >= 4 → call
        expect(r.action).toBe('call');
    });
});
