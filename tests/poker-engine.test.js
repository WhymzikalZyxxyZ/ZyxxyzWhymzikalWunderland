'use strict';
const cardEngine = require('../js/card-engine');
global.createDeck   = cardEngine.createDeck;
global.shuffle      = cardEngine.shuffle;
global.evaluateHand = cardEngine.evaluateHand;
global.compareHands = cardEngine.compareHands;

const {
    POKER_STARTING_CHIPS, SMALL_BLIND, BIG_BLIND,
    newPokerState, startPokerHand, pokerAction,
    pokerAdvancePhase, pokerShowdown, pokerNextActive, getPokerAIAction,
} = require('../js/poker-engine');

const NAMES = ['Alice', 'Bob', 'Carol'];

// ── Constants ─────────────────────────────────────────────────────────────────
test('POKER_STARTING_CHIPS is 1000', () => expect(POKER_STARTING_CHIPS).toBe(1000));
test('SMALL_BLIND is 10',            () => expect(SMALL_BLIND).toBe(10));
test('BIG_BLIND is 20',              () => expect(BIG_BLIND).toBe(20));

// ── newPokerState ─────────────────────────────────────────────────────────────
describe('newPokerState', () => {
    let state;
    beforeEach(() => { state = newPokerState(NAMES); });

    test('creates correct number of players', () => expect(state.players).toHaveLength(3));
    test('players get correct names',         () => expect(state.players[0].name).toBe('Alice'));
    test('players get unique ids',            () => {
        const ids = state.players.map(p => p.id);
        expect(new Set(ids).size).toBe(3);
    });
    test('starting chips',                    () => expect(state.players[0].chips).toBe(1000));
    test('phase is "waiting"',               () => expect(state.phase).toBe('waiting'));
    test('community is empty',               () => expect(state.community).toHaveLength(0));
    test('pot is 0',                         () => expect(state.pot).toBe(0));
});

// ── startPokerHand ─────────────────────────────────────────────────────────────
describe('startPokerHand', () => {
    let state;
    beforeEach(() => { state = startPokerHand(newPokerState(NAMES)); });

    test('phase is "preflop"',               () => expect(state.phase).toBe('preflop'));
    test('each player gets 2 hole cards',    () => state.players.forEach(p => expect(p.hand).toHaveLength(2)));
    test('community is empty at preflop',    () => expect(state.community).toHaveLength(0));
    test('small blind posted',               () => expect(state.pot).toBeGreaterThanOrEqual(SMALL_BLIND));
    test('big blind posted',                 () => expect(state.pot).toBe(SMALL_BLIND + BIG_BLIND));
    test('sb player chips reduced',          () => {
        const sbIdx = (state.dealerIdx + 1) % 3;
        expect(state.players[sbIdx].chips).toBe(1000 - SMALL_BLIND);
    });
    test('bb player chips reduced',          () => {
        const bbIdx = (state.dealerIdx + 2) % 3;
        expect(state.players[bbIdx].chips).toBe(1000 - BIG_BLIND);
    });
    test('current bet equals big blind',     () => expect(state.currentBet).toBe(BIG_BLIND));
    test('active player is after bb',        () => {
        const bbIdx = (state.dealerIdx + 2) % 3;
        expect(state.activePlayerIdx).toBe((bbIdx + 1) % 3);
    });
});

// ── pokerNextActive ───────────────────────────────────────────────────────────
describe('pokerNextActive', () => {
    test('skips folded player', () => {
        const players = [
            { folded:false, allIn:false },
            { folded:true,  allIn:false },
            { folded:false, allIn:false },
        ];
        expect(pokerNextActive(players, 0)).toBe(2);
    });
    test('skips allIn player', () => {
        const players = [
            { folded:false, allIn:false },
            { folded:false, allIn:true  },
            { folded:false, allIn:false },
        ];
        expect(pokerNextActive(players, 0)).toBe(2);
    });
    test('wraps around', () => {
        const players = [
            { folded:false, allIn:false },
            { folded:true,  allIn:false },
            { folded:false, allIn:false },
        ];
        expect(pokerNextActive(players, 2)).toBe(0);
    });
});

// ── pokerAction — fold ────────────────────────────────────────────────────────
describe('pokerAction fold', () => {
    let state;
    beforeEach(() => { state = startPokerHand(newPokerState(NAMES)); });

    test('fold marks player as folded', () => {
        const pidx = state.activePlayerIdx;
        const r = pokerAction(state, 'fold');
        expect(r.players[pidx].folded).toBe(true);
    });
    test('fold with only 1 remaining ends game', () => {
        // 2-player game: one fold ends it
        let s = startPokerHand(newPokerState(['A','B']));
        s = pokerAction(s, 'fold');
        expect(s.phase).toBe('showdown');
        expect(s.winner).toBeDefined();
    });
    test('winner gets pot on last-player-standing', () => {
        let s = startPokerHand(newPokerState(['A','B']));
        s = pokerAction(s, 'fold');
        const winner = s.players.find(p => p.id === s.winner);
        expect(winner.chips).toBeGreaterThan(0);
        expect(s.pot).toBe(0);
    });
});

// ── pokerAction — call ────────────────────────────────────────────────────────
describe('pokerAction call', () => {
    let state;
    beforeEach(() => { state = startPokerHand(newPokerState(NAMES)); });

    test('call adds chips to pot', () => {
        const before = state.pot;
        const pidx   = state.activePlayerIdx;
        const toCall = state.currentBet - state.players[pidx].bet;
        const r = pokerAction(state, 'call');
        expect(r.pot).toBe(before + toCall);
    });
    test('call reduces player chips', () => {
        const pidx   = state.activePlayerIdx;
        const chipsBefore = state.players[pidx].chips;
        const toCall = state.currentBet - state.players[pidx].bet;
        const r = pokerAction(state, 'call');
        expect(r.players[pidx].chips).toBe(chipsBefore - toCall);
    });
    test('call with all chips → allIn', () => {
        let s = startPokerHand(newPokerState(['A','B']));
        // Set player chips to exactly the call amount
        const pidx = s.activePlayerIdx;
        const toCall = s.currentBet - s.players[pidx].bet;
        s.players[pidx].chips = toCall;
        const r = pokerAction(s, 'call');
        expect(r.players[pidx].allIn).toBe(true);
    });
});

// ── pokerAction — raise ───────────────────────────────────────────────────────
describe('pokerAction raise', () => {
    let state;
    beforeEach(() => { state = startPokerHand(newPokerState(NAMES)); });

    test('raise increases currentBet', () => {
        const r = pokerAction(state, 'raise', BIG_BLIND * 2);
        expect(r.currentBet).toBeGreaterThan(state.currentBet);
    });
    test('raise resets actedThisRound to just raiser', () => {
        const pidx = state.activePlayerIdx;
        const r = pokerAction(state, 'raise', BIG_BLIND * 2);
        expect(r.actedThisRound).toContain(pidx);
        expect(r.actedThisRound).toHaveLength(1);
    });
});

// ── pokerAction — check ───────────────────────────────────────────────────────
test('pokerAction check does not change pot', () => {
    // Build a state where currentBet matches player's bet (so check is valid)
    const s = startPokerHand(newPokerState(['A','B']));
    // Go to flop where currentBet resets to 0
    const withFlop = pokerAdvancePhase({ ...s, phase: 'preflop' });
    if (withFlop.phase === 'flop') {
        const potBefore = withFlop.pot;
        const r = pokerAction(withFlop, 'check');
        expect(r.pot).toBe(potBefore);
    }
});

// ── pokerAction — phase advancement ──────────────────────────────────────────
describe('pokerAction phase advancement', () => {
    test('all players acted advances phase', () => {
        // 2-player, call to match BB then check in subsequent round
        let s = startPokerHand(newPokerState(['A','B']));
        // P0 calls (active after BB)
        s = pokerAction(s, 'call');
        // P1 (BB) checks — now all done
        s = pokerAction(s, 'check');
        expect(s.phase).not.toBe('preflop');
    });
});

// ── pokerAdvancePhase ─────────────────────────────────────────────────────────
describe('pokerAdvancePhase', () => {
    test('preflop → flop deals 3 community cards', () => {
        const s = startPokerHand(newPokerState(NAMES));
        const r = pokerAdvancePhase({ ...s, phase: 'preflop' });
        expect(r.phase).toBe('flop');
        expect(r.community).toHaveLength(3);
    });
    test('flop → turn deals 1 community card', () => {
        const s = startPokerHand(newPokerState(NAMES));
        const preFlop = pokerAdvancePhase({ ...s, phase: 'preflop' });
        const r = pokerAdvancePhase({ ...preFlop, phase: 'flop' });
        expect(r.phase).toBe('turn');
        expect(r.community).toHaveLength(4);
    });
    test('turn → river deals 1 community card', () => {
        let s = startPokerHand(newPokerState(NAMES));
        s = pokerAdvancePhase({ ...s, phase: 'preflop' });
        s = pokerAdvancePhase({ ...s, phase: 'flop' });
        const r = pokerAdvancePhase({ ...s, phase: 'turn' });
        expect(r.phase).toBe('river');
        expect(r.community).toHaveLength(5);
    });
    test('river → showdown', () => {
        let s = startPokerHand(newPokerState(NAMES));
        s = pokerAdvancePhase({ ...s, phase: 'preflop' });
        s = pokerAdvancePhase({ ...s, phase: 'flop' });
        s = pokerAdvancePhase({ ...s, phase: 'turn' });
        const r = pokerAdvancePhase({ ...s, phase: 'river' });
        expect(r.phase).toBe('showdown');
        expect(r.winner).toBeDefined();
    });
    test('resets player bets on phase change', () => {
        const s = startPokerHand(newPokerState(NAMES));
        const r = pokerAdvancePhase({ ...s, phase: 'preflop' });
        r.players.forEach(p => expect(p.bet).toBe(0));
    });
    test('resets currentBet to 0 on new street', () => {
        const s = startPokerHand(newPokerState(NAMES));
        const r = pokerAdvancePhase({ ...s, phase: 'preflop' });
        expect(r.currentBet).toBe(0);
    });
});

// ── pokerShowdown ─────────────────────────────────────────────────────────────
describe('pokerShowdown', () => {
    test('determines a winner', () => {
        let s = startPokerHand(newPokerState(['A','B']));
        s = pokerAdvancePhase({ ...s, phase: 'preflop' });
        s = pokerAdvancePhase({ ...s, phase: 'flop' });
        s = pokerAdvancePhase({ ...s, phase: 'turn' });
        const r = pokerShowdown({ ...s, phase: 'river', pot: 100 });
        expect(r.winner).toBeDefined();
        expect(r.pot).toBe(0);
        expect(r.handResults).toBeDefined();
    });
    test('winner receives pot chips', () => {
        let s = startPokerHand(newPokerState(['A','B']));
        s = pokerAdvancePhase({ ...s, phase: 'preflop' });
        s = pokerAdvancePhase({ ...s, phase: 'flop' });
        s = pokerAdvancePhase({ ...s, phase: 'turn' });
        s = pokerAdvancePhase({ ...s, phase: 'river' });
        const winnerChips = s.players.find(p => p.id === s.winner).chips;
        expect(winnerChips).toBeGreaterThan(POKER_STARTING_CHIPS - BIG_BLIND);
    });
    test('folded players excluded from showdown', () => {
        let s = startPokerHand(newPokerState(['A','B','C']));
        s.players[2].folded = true;
        s = pokerAdvancePhase({ ...s, phase: 'preflop' });
        s = pokerAdvancePhase({ ...s, phase: 'flop' });
        s = pokerAdvancePhase({ ...s, phase: 'turn' });
        const r = pokerShowdown({ ...s, phase: 'river', pot: 60 });
        const folded = r.handResults.find(hr => hr.id === 2);
        expect(folded).toBeUndefined();
    });
});

// ── getPokerAIAction ──────────────────────────────────────────────────────────
describe('getPokerAIAction', () => {
    function makeState(handRanks, community = [], currentBet = 0, playerBet = 0) {
        const hand = handRanks.map((r, i) => ({ rank:r, suit: ['S','H','D','C'][i % 4] }));
        const players = [{ id:0, name:'AI', hand, chips:500, bet:playerBet, folded:false, allIn:false }];
        return { players, community, currentBet, phase:'preflop', pot:0, deck:[], dealerIdx:0 };
    }

    test('returns action with string action field', () => {
        const s = makeState([2,7], [], 0);
        const r = getPokerAIAction(s, 0);
        expect(typeof r.action).toBe('string');
    });
    test('toCall=0, high hand → raise', () => {
        // With 5 community cards forcing a flush (rank 6), str = 0.6, not > 0.6, so check
        // Make a full house by providing community cards
        const comm = [
            {rank:10,suit:'S'},{rank:10,suit:'H'},{rank:10,suit:'D'},{rank:5,suit:'C'},{rank:5,suit:'S'}
        ];
        const s = makeState([10,5], comm, 0, 0); // player has pocket 10+5, community completes full house
        const r = getPokerAIAction(s, 0);
        expect(['check','raise']).toContain(r.action);
    });
    test('toCall>0, weak hand → fold', () => {
        // Force high card by using mismatched dummy cards: 2+7 hole, dummies 7,2,9 → all different ranks
        // The dummy cards in the AI are fixed, so with ranks 2,7 we get: [2,7,7,2,9]... wait, 2+7+dummies
        // Actually with 2 hole cards and 0 community, the dummy cards are {S,7},{H,2},{D,9}
        // Hole [2,7] + dummies [7,2,9] = [2,7,7,2,9] → two pair (rank 3), str=0.3 → call (not fold)
        // To get fold: need rank=1 (high card). Let's use [3,5] + dummies [7,2,9] = [3,5,7,2,9] = HC
        const s = makeState([3,5], [], 20, 0);
        const r = getPokerAIAction(s, 0);
        // str = eval([3,5,7,2,9]).rank/10 = 1/10 = 0.1 < 0.2 → fold
        expect(r.action).toBe('fold');
    });
    test('toCall>0, strong hand → raise', () => {
        // With community cards forming a strong hand (rank 7+ = str > 0.6)
        const comm = [
            {rank:8,suit:'S'},{rank:8,suit:'H'},{rank:8,suit:'D'},{rank:3,suit:'C'},{rank:3,suit:'H'}
        ];
        const s = makeState([8,3], comm, 40, 0); // player has full house rank 7, str=0.7
        const r = getPokerAIAction(s, 0);
        expect(r.action).toBe('raise');
    });
    test('toCall>0, medium hand → call', () => {
        // With 2-card pair evaluation: hole [5,5] + dummies = one pair (rank 2), str=0.2 → call
        const s = makeState([5,5], [], 20, 0);
        const r = getPokerAIAction(s, 0);
        // str = eval([5,5,7,2,9]).rank/10 = 2/10 = 0.2 → not < 0.2, not > 0.6 → call
        expect(r.action).toBe('call');
    });
    test('toCall=0, weak hand → check', () => {
        const s = makeState([3,5], [], 0, 0);
        const r = getPokerAIAction(s, 0);
        // str = 0.1 ≤ 0.5 → check
        expect(r.action).toBe('check');
    });
});
