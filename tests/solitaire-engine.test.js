'use strict';
const cardEngine = require('../js/card-engine');
// Use identity shuffle so newSolitaireGame is deterministic with createDeck()
global.shuffle    = deck => deck.slice();
global.createDeck = cardEngine.createDeck;

const {
    newSolitaireGame, canPlaceOnFoundation, canPlaceOnTableau,
    drawFromStock, wasteToFoundation, wasteToTableau,
    tableauToFoundation, tableauToTableau, calcSolitaireScore,
} = require('../js/solitaire-engine');

function card(rank, suit, faceUp = true) { return { rank, suit, faceUp }; }

// ── newSolitaireGame ──────────────────────────────────────────────────────────
describe('newSolitaireGame', () => {
    let state;
    beforeEach(() => { state = newSolitaireGame(); });

    test('creates 7 tableau columns',       () => expect(state.tableau).toHaveLength(7));
    test('column sizes are 1–7',            () => {
        state.tableau.forEach((col, i) => expect(col).toHaveLength(i + 1));
    });
    test('only top card of each column is face-up', () => {
        state.tableau.forEach(col => {
            col.forEach((card, i) => {
                expect(card.faceUp).toBe(i === col.length - 1);
            });
        });
    });
    test('stock has 24 cards',              () => expect(state.stock).toHaveLength(24));
    test('waste starts empty',              () => expect(state.waste).toHaveLength(0));
    test('foundations start at 0',          () => {
        expect(state.foundations).toEqual({ S:0, H:0, D:0, C:0 });
    });
    test('moves start at 0',               () => expect(state.moves).toBe(0));
    test('solved starts false',            () => expect(state.solved).toBe(false));
    test('deck override skips shuffle',    () => {
        const deck = Array.from({ length: 52 }, (_, i) => ({ suit:'S', rank:(i%13)+1 }));
        const s = newSolitaireGame(deck);
        expect(s.stock).toHaveLength(24);
    });
});

// ── canPlaceOnFoundation ──────────────────────────────────────────────────────
describe('canPlaceOnFoundation', () => {
    const f0   = { S:0, H:0, D:0, C:0 };
    const fS1  = { S:1, H:0, D:0, C:0 };
    const fS5  = { S:5, H:0, D:0, C:0 };

    test('Ace on empty foundation → true',    () => expect(canPlaceOnFoundation(card(1,'S'), f0)).toBe(true));
    test('2 on foundation rank 1 → true',     () => expect(canPlaceOnFoundation(card(2,'S'), fS1)).toBe(true));
    test('3 on foundation rank 5 → false',    () => expect(canPlaceOnFoundation(card(3,'S'), fS5)).toBe(false));
    test('2 on empty foundation → false',     () => expect(canPlaceOnFoundation(card(2,'S'), f0)).toBe(false));
    test('Ace on foundation rank 1 → false',  () => expect(canPlaceOnFoundation(card(1,'S'), fS1)).toBe(false));
    test('wrong suit does not match',         () => expect(canPlaceOnFoundation(card(2,'H'), fS1)).toBe(false));
    test('6 on foundation rank 5 → true',     () => expect(canPlaceOnFoundation(card(6,'S'), fS5)).toBe(true));
});

// ── canPlaceOnTableau ─────────────────────────────────────────────────────────
describe('canPlaceOnTableau', () => {
    const emptyCol = [];
    const blackK   = [card(13,'S')];          // black king face-up
    const redK     = [card(13,'H')];          // red king face-up
    const redQ     = [card(12,'H')];          // red queen face-up
    const faceDown = [card(13,'S', false)];   // face-down king

    test('King on empty column → true',    () => expect(canPlaceOnTableau(card(13,'H'), emptyCol)).toBe(true));
    test('non-King on empty column → false',() => expect(canPlaceOnTableau(card(12,'H'), emptyCol)).toBe(false));
    test('red Q on black K → true',        () => expect(canPlaceOnTableau(card(12,'H'), blackK)).toBe(true));
    test('black Q on red K → true',        () => expect(canPlaceOnTableau(card(12,'S'), redK)).toBe(true));
    test('red Q on red K → false (same color)', () => expect(canPlaceOnTableau(card(12,'D'), redK)).toBe(false));
    test('black J on red Q → true',        () => expect(canPlaceOnTableau(card(11,'C'), redQ)).toBe(true));
    test('wrong rank gap → false',         () => expect(canPlaceOnTableau(card(11,'H'), blackK)).toBe(false));
    test('face-down top → false',          () => expect(canPlaceOnTableau(card(12,'H'), faceDown)).toBe(false));
    test('same rank → false',              () => expect(canPlaceOnTableau(card(13,'H'), blackK)).toBe(false));
});

// ── drawFromStock ─────────────────────────────────────────────────────────────
describe('drawFromStock', () => {
    function makeState(stockCards, wasteCards) {
        return { stock: stockCards, waste: wasteCards, foundations: { S:0,H:0,D:0,C:0 },
                 tableau: [], moves: 0, solved: false };
    }

    test('draws top card to waste', () => {
        const s = makeState([card(5,'S', false), card(7,'H', false)], []);
        const r = drawFromStock(s);
        expect(r.waste).toHaveLength(1);
        expect(r.waste[0].faceUp).toBe(true);
        expect(r.stock).toHaveLength(1);
    });
    test('increments moves', () => {
        const s = makeState([card(5,'S', false)], []);
        expect(drawFromStock(s).moves).toBe(1);
    });
    test('empty stock recycles waste', () => {
        const s = makeState([], [card(5,'S'), card(7,'H')]);
        const r = drawFromStock(s);
        expect(r.stock).toHaveLength(2);
        expect(r.waste).toHaveLength(0);
        expect(r.stock[0].faceUp).toBe(false);
    });
    test('recycled waste reverses order', () => {
        const s = makeState([], [card(3,'S'), card(8,'H')]);
        const r = drawFromStock(s);
        expect(r.stock[0].rank).toBe(8);
        expect(r.stock[1].rank).toBe(3);
    });
});

// ── wasteToFoundation ─────────────────────────────────────────────────────────
describe('wasteToFoundation', () => {
    function makeState(wasteTop, foundations) {
        return { stock:[], waste:[wasteTop], foundations, tableau:[], moves:0, solved:false };
    }

    test('moves ace from waste to foundation', () => {
        const s = makeState(card(1,'S'), { S:0,H:0,D:0,C:0 });
        const r = wasteToFoundation(s);
        expect(r.foundations.S).toBe(1);
        expect(r.waste).toHaveLength(0);
        expect(r.moves).toBe(1);
    });
    test('invalid placement returns same state', () => {
        const s = makeState(card(5,'S'), { S:0,H:0,D:0,C:0 });
        const r = wasteToFoundation(s);
        expect(r).toBe(s);
    });
    test('empty waste returns same state', () => {
        const s = { stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0}, tableau:[], moves:0, solved:false };
        expect(wasteToFoundation(s)).toBe(s);
    });
    test('solved flag set when all foundations reach 13', () => {
        const fullFn = { S:13, H:13, D:12, C:13 };
        const s = makeState(card(13,'D'), fullFn);
        const r = wasteToFoundation(s);
        expect(r.solved).toBe(true);
    });
});

// ── wasteToTableau ────────────────────────────────────────────────────────────
describe('wasteToTableau', () => {
    test('places card from waste onto valid tableau column', () => {
        const blackK = [card(13,'S')];
        const s = {
            stock:[], waste:[card(12,'H')], foundations:{S:0,H:0,D:0,C:0},
            tableau:[blackK, []], moves:0, solved:false,
        };
        const r = wasteToTableau(s, 0);
        expect(r.tableau[0]).toHaveLength(2);
        expect(r.waste).toHaveLength(0);
        expect(r.moves).toBe(1);
    });
    test('invalid placement returns same state', () => {
        const s = {
            stock:[], waste:[card(5,'H')], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(13,'S')]], moves:0, solved:false,
        };
        expect(wasteToTableau(s, 0)).toBe(s);
    });
    test('empty waste returns same state', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(13,'S')]], moves:0, solved:false,
        };
        expect(wasteToTableau(s, 0)).toBe(s);
    });
});

// ── tableauToFoundation ───────────────────────────────────────────────────────
describe('tableauToFoundation', () => {
    test('moves top face-up card to foundation', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(1,'S')]], moves:0, solved:false,
        };
        const r = tableauToFoundation(s, 0);
        expect(r.foundations.S).toBe(1);
        expect(r.tableau[0]).toHaveLength(0);
        expect(r.moves).toBe(1);
    });
    test('flips new top card face-up after move', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(5,'S', false), card(1,'S')]], moves:0, solved:false,
        };
        const r = tableauToFoundation(s, 0);
        expect(r.tableau[0][0].faceUp).toBe(true);
    });
    test('invalid card returns same state', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(5,'S')]], moves:0, solved:false,
        };
        expect(tableauToFoundation(s, 0)).toBe(s);
    });
    test('empty column returns same state', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[]], moves:0, solved:false,
        };
        expect(tableauToFoundation(s, 0)).toBe(s);
    });
    test('face-down top card returns same state', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(1,'S', false)]], moves:0, solved:false,
        };
        expect(tableauToFoundation(s, 0)).toBe(s);
    });
});

// ── tableauToTableau ──────────────────────────────────────────────────────────
describe('tableauToTableau', () => {
    test('moves a single face-up card', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(13,'S'), card(13,'H')], []], moves:0, solved:false,
        };
        const r = tableauToTableau(s, 0, 1, 1); // move card at index 1 of col0 to col1
        expect(r.tableau[0]).toHaveLength(1);
        expect(r.tableau[1]).toHaveLength(1);
        expect(r.moves).toBe(1);
    });
    test('moves a stack of face-up cards', () => {
        const blackK = card(13,'S');
        const redQ   = card(12,'H');
        const blackJ = card(11,'C');
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[blackK, redQ, blackJ], [card(13,'C')]], moves:0, solved:false,
        };
        const r = tableauToTableau(s, 0, 1, 1); // move redQ+blackJ (from idx 1) to col1
        expect(r.tableau[0]).toHaveLength(1);
        expect(r.tableau[1]).toHaveLength(3);
    });
    test('flips new top card after moving stack away', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(5,'S', false), card(12,'H')], [card(13,'S')]], moves:0, solved:false,
        };
        const r = tableauToTableau(s, 0, 1, 1);
        expect(r.tableau[0][0].faceUp).toBe(true);
    });
    test('invalid placement returns same state', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(12,'H')], [card(13,'H')]], moves:0, solved:false,
        };
        // Try to place red Q on red K — wrong color
        expect(tableauToTableau(s, 0, 0, 1)).toBe(s);
    });
    test('face-down source card returns same state', () => {
        const s = {
            stock:[], waste:[], foundations:{S:0,H:0,D:0,C:0},
            tableau:[[card(12,'H', false)], [card(13,'S')]], moves:0, solved:false,
        };
        expect(tableauToTableau(s, 0, 0, 1)).toBe(s);
    });
});

// ── calcSolitaireScore ────────────────────────────────────────────────────────
describe('calcSolitaireScore', () => {
    test('perfect game (0 moves, 0 sec)', () => expect(calcSolitaireScore(0, 0)).toBe(10000));
    test('subtracts 5 per move',         () => expect(calcSolitaireScore(10, 0)).toBe(9950));
    test('subtracts 2 per second',       () => expect(calcSolitaireScore(0, 100)).toBe(9800));
    test('never below 0',                () => expect(calcSolitaireScore(9999, 9999)).toBe(0));
    test('combined deduction',           () => expect(calcSolitaireScore(20, 50)).toBe(9800));
});
