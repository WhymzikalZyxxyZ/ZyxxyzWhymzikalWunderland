'use strict';
/* global createDeck, shuffle */

// Klondike Solitaire
// tableau: array of 7 columns; each entry: { suit, rank, faceUp }
// foundations: { S:0, H:0, D:0, C:0 } — 0=empty, 1–13=top rank placed
// stock: face-down draw pile  waste: face-up discards (top = last)

function newSolitaireGame(deckOverride) {
    const raw = (typeof shuffle === 'function')
        ? shuffle(deckOverride || (typeof createDeck === 'function' ? createDeck() : []))
        : (deckOverride || []);
    const deck = raw.slice();
    const tableau = [];
    for (let col = 0; col < 7; col++) {
        const cards = [];
        for (let row = 0; row <= col; row++)
            cards.push({ ...deck.pop(), faceUp: row === col });
        tableau.push(cards);
    }
    return {
        stock: deck.map(c => ({ ...c, faceUp: false })),
        waste: [],
        foundations: { S:0, H:0, D:0, C:0 },
        tableau,
        moves: 0,
        solved: false,
    };
}

function canPlaceOnFoundation(card, foundations) {
    const top = foundations[card.suit];
    return card.rank === 1 ? top === 0 : top === card.rank - 1;
}

function canPlaceOnTableau(card, targetCol) {
    if (!targetCol.length) return card.rank === 13;
    const top = targetCol[targetCol.length - 1];
    if (!top.faceUp) return false;
    const redCard = card.suit === 'H' || card.suit === 'D';
    const redTop  = top.suit  === 'H' || top.suit  === 'D';
    return top.rank === card.rank + 1 && redCard !== redTop;
}

function drawFromStock(state) {
    if (state.stock.length === 0) {
        // Recycle waste back to stock
        const stock = state.waste.map(c => ({ ...c, faceUp: false })).reverse();
        return { ...state, stock, waste: [], moves: state.moves + 1 };
    }
    const stock = state.stock.slice();
    const card  = { ...stock.pop(), faceUp: true };
    return { ...state, stock, waste: [...state.waste, card], moves: state.moves + 1 };
}

function wasteToFoundation(state) {
    if (!state.waste.length) return state;
    const card = state.waste[state.waste.length - 1];
    if (!canPlaceOnFoundation(card, state.foundations)) return state;
    const waste       = state.waste.slice(0, -1);
    const foundations = { ...state.foundations, [card.suit]: card.rank };
    const solved      = Object.values(foundations).every(v => v === 13);
    return { ...state, waste, foundations, moves: state.moves + 1, solved };
}

function wasteToTableau(state, col) {
    if (!state.waste.length) return state;
    const card = state.waste[state.waste.length - 1];
    if (!canPlaceOnTableau(card, state.tableau[col])) return state;
    const waste   = state.waste.slice(0, -1);
    const tableau = state.tableau.map((c, i) => i === col ? [...c, card] : c);
    return { ...state, waste, tableau, moves: state.moves + 1 };
}

function tableauToFoundation(state, col) {
    const src = state.tableau[col];
    if (!src.length) return state;
    const card = src[src.length - 1];
    if (!card.faceUp || !canPlaceOnFoundation(card, state.foundations)) return state;
    const tableau = state.tableau.map((c, i) => {
        if (i !== col) return c;
        const nc = c.slice(0, -1);
        if (nc.length) nc[nc.length - 1] = { ...nc[nc.length - 1], faceUp: true };
        return nc;
    });
    const foundations = { ...state.foundations, [card.suit]: card.rank };
    const solved      = Object.values(foundations).every(v => v === 13);
    return { ...state, tableau, foundations, moves: state.moves + 1, solved };
}

function tableauToTableau(state, fromCol, fromIdx, toCol) {
    const src   = state.tableau[fromCol];
    const cards = src.slice(fromIdx);
    if (!cards[0].faceUp) return state;
    if (!canPlaceOnTableau(cards[0], state.tableau[toCol])) return state;
    const tableau = state.tableau.map((c, i) => {
        if (i === fromCol) {
            const nc = c.slice(0, fromIdx);
            if (nc.length) nc[nc.length - 1] = { ...nc[nc.length - 1], faceUp: true };
            return nc;
        }
        if (i === toCol) return [...c, ...cards];
        return c;
    });
    return { ...state, tableau, moves: state.moves + 1 };
}

function calcSolitaireScore(moves, seconds) {
    return Math.max(0, 10000 - moves * 5 - seconds * 2);
}

if (typeof module !== 'undefined' && module.exports)
    module.exports = { newSolitaireGame, canPlaceOnFoundation, canPlaceOnTableau,
                       drawFromStock, wasteToFoundation, wasteToTableau,
                       tableauToFoundation, tableauToTableau, calcSolitaireScore };
