'use strict';

const RPS_CHOICES = Object.freeze(['rock', 'paper', 'scissors']);

function rpsResult(player, computer) {
    if (!RPS_CHOICES.includes(player) || !RPS_CHOICES.includes(computer)) return null;
    if (player === computer) return 'draw';
    if ((player === 'rock'     && computer === 'scissors') ||
        (player === 'paper'    && computer === 'rock')     ||
        (player === 'scissors' && computer === 'paper'))   return 'win';
    return 'lose';
}

// difficulty 0-2: random; 3-5: mild counter-bias; 6-9: counter last-move + frequency analysis
function getComputerChoice(difficulty, history) {
    if (!Array.isArray(history)) history = [];
    const clamp = Math.max(0, Math.min(9, Math.floor(difficulty)));

    if (clamp <= 2 || history.length === 0) {
        return RPS_CHOICES[Math.floor(Math.random() * 3)];
    }

    const counters = { rock: 'paper', paper: 'scissors', scissors: 'rock' };

    if (clamp <= 5) {
        // 50% chance to counter last player move
        if (Math.random() < 0.5) {
            return counters[history[history.length - 1]];
        }
        return RPS_CHOICES[Math.floor(Math.random() * 3)];
    }

    // difficulty 6-9: frequency analysis — counter the most played choice
    const freq = { rock: 0, paper: 0, scissors: 0 };
    for (const c of history) if (freq[c] !== undefined) freq[c]++;
    const mostPlayed = Object.keys(freq).reduce((a, b) => freq[a] >= freq[b] ? a : b);
    // blend last-move counter and frequency counter by difficulty
    const useFreq = Math.random() < (clamp - 5) / 4;
    return useFreq ? counters[mostPlayed] : counters[history[history.length - 1]];
}

function countsFromResults(results) {
    return results.reduce(
        (acc, r) => { if (acc[r] !== undefined) acc[r]++; return acc; },
        { win: 0, lose: 0, draw: 0 }
    );
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RPS_CHOICES, rpsResult, getComputerChoice, countsFromResults };
}
