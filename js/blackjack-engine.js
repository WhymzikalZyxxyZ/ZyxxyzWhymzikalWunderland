'use strict';
/* global createDeck, shuffle */

const BJ_STARTING_CHIPS = 500;
const BJ_MAX_SCORE      = 999999;

function bjHandValue(hand) {
    let total = 0, aces = 0;
    for (const c of hand) {
        if (c.rank === 1)      { aces++; total += 11; }
        else if (c.rank >= 10) { total += 10; }
        else                   { total += c.rank; }
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

function bjIsBust(hand)            { return bjHandValue(hand) > 21; }
function bjIsBlackjack(hand)       { return hand.length === 2 && bjHandValue(hand) === 21; }
function bjDealerShouldHit(hand)   { return bjHandValue(hand) < 17; }

// Returns 'blackjack' | 'win' | 'push' | 'lose' from the player's perspective.
function bjResult(playerHand, dealerHand) {
    if (bjIsBust(playerHand)) return 'lose';
    const pBJ = bjIsBlackjack(playerHand);
    const dBJ = bjIsBlackjack(dealerHand);
    if (pBJ && dBJ) return 'push';
    if (pBJ)        return 'blackjack';
    if (dBJ)        return 'lose';
    const pv = bjHandValue(playerHand), dv = bjHandValue(dealerHand);
    if (bjIsBust(dealerHand) || pv > dv) return 'win';
    if (pv === dv)                       return 'push';
    return 'lose';
}

function newBJGame() {
    // Two-deck shoe
    const deckA = (typeof createDeck === 'function') ? createDeck() : [];
    const deckB = (typeof createDeck === 'function') ? createDeck() : [];
    const deck = (typeof shuffle === 'function') ? shuffle(deckA.concat(deckB)) : deckA.concat(deckB);
    return { deck, player: [], dealer: [], phase: 'bet', bet: 0,
             chips: BJ_STARTING_CHIPS, result: null, canDouble: false };
}

function bjDeal(state, bet) {
    const deck = state.deck.slice();
    const pop  = () => deck.pop();
    const player = [pop(), pop()];
    const dealer = [pop(), pop()];
    const chips  = state.chips - bet;
    return { ...state, deck, player, dealer, phase: 'playing', bet,
             chips, result: null, canDouble: chips >= bet };
}

function bjHit(state) {
    const deck   = state.deck.slice();
    const player = [...state.player, deck.pop()];
    if (bjIsBust(player))
        return { ...state, deck, player, phase: 'result', result: 'lose', canDouble: false };
    return { ...state, deck, player, canDouble: false };
}

function bjDouble(state) {
    const deck   = state.deck.slice();
    const player = [...state.player, deck.pop()];
    const bet    = state.bet * 2;
    const chips  = state.chips - state.bet;
    if (bjIsBust(player))
        return { ...state, deck, player, phase: 'result', result: 'lose', bet, chips };
    return bjRunDealer({ ...state, deck, player, bet, chips, canDouble: false });
}

function bjStand(state) {
    return bjRunDealer(state);
}

function bjRunDealer(state) {
    let deck   = state.deck.slice();
    let dealer = state.dealer.slice();
    while (bjDealerShouldHit(dealer)) dealer.push(deck.pop());
    const result = bjResult(state.player, dealer);
    let chips = state.chips;
    if (result === 'blackjack') chips += Math.floor(state.bet * 2.5);
    else if (result === 'win')  chips += state.bet * 2;
    else if (result === 'push') chips += state.bet;
    return { ...state, deck, dealer, phase: 'result', result, chips };
}

if (typeof module !== 'undefined' && module.exports)
    module.exports = { BJ_STARTING_CHIPS, BJ_MAX_SCORE,
                       bjHandValue, bjIsBust, bjIsBlackjack, bjDealerShouldHit,
                       bjResult, newBJGame, bjDeal, bjHit, bjDouble, bjStand, bjRunDealer };
