'use strict';
const { RPS_CHOICES, rpsResult, getComputerChoice, countsFromResults } = require('../js/engines/rps-engine');

describe('RPS_CHOICES', () => {
    test('contains exactly rock, paper, scissors', () => {
        expect(RPS_CHOICES).toEqual(['rock', 'paper', 'scissors']);
    });
    test('is frozen', () => {
        expect(Object.isFrozen(RPS_CHOICES)).toBe(true);
    });
});

describe('rpsResult', () => {
    test('rock beats scissors', ()  => expect(rpsResult('rock', 'scissors')).toBe('win'));
    test('paper beats rock', ()     => expect(rpsResult('paper', 'rock')).toBe('win'));
    test('scissors beats paper', () => expect(rpsResult('scissors', 'paper')).toBe('win'));
    test('scissors loses to rock', ()  => expect(rpsResult('scissors', 'rock')).toBe('lose'));
    test('rock loses to paper', ()     => expect(rpsResult('rock', 'paper')).toBe('lose'));
    test('paper loses to scissors', () => expect(rpsResult('paper', 'scissors')).toBe('lose'));
    test('rock vs rock is draw', ()  => expect(rpsResult('rock', 'rock')).toBe('draw'));
    test('paper vs paper is draw', () => expect(rpsResult('paper', 'paper')).toBe('draw'));
    test('scissors vs scissors is draw', () => expect(rpsResult('scissors', 'scissors')).toBe('draw'));
    test('invalid player returns null', () => expect(rpsResult('lizard', 'rock')).toBeNull());
    test('invalid computer returns null', () => expect(rpsResult('rock', 'spock')).toBeNull());
});

describe('getComputerChoice', () => {
    test('returns a valid choice', () => {
        for (let d = 0; d <= 9; d++) {
            const c = getComputerChoice(d, ['rock', 'paper']);
            expect(RPS_CHOICES).toContain(c);
        }
    });
    test('difficulty 0 with empty history returns a valid choice', () => {
        expect(RPS_CHOICES).toContain(getComputerChoice(0, []));
    });
    test('handles null history gracefully', () => {
        expect(RPS_CHOICES).toContain(getComputerChoice(5, null));
    });
    test('handles non-array history', () => {
        expect(RPS_CHOICES).toContain(getComputerChoice(5, 'invalid'));
    });
    test('difficulty is clamped to 0-9', () => {
        expect(RPS_CHOICES).toContain(getComputerChoice(-5, []));
        expect(RPS_CHOICES).toContain(getComputerChoice(100, []));
    });
    test('at difficulty 9 frequently counters frequent move', () => {
        const history = Array(30).fill('rock');
        let paperCount = 0;
        for (let i = 0; i < 50; i++) {
            if (getComputerChoice(9, history) === 'paper') paperCount++;
        }
        expect(paperCount).toBeGreaterThan(25);  // paper beats rock
    });
});

describe('countsFromResults', () => {
    test('counts wins, losses, draws', () => {
        const r = countsFromResults(['win','win','lose','draw','win']);
        expect(r).toEqual({ win: 3, lose: 1, draw: 1 });
    });
    test('returns zeroes for empty array', () => {
        expect(countsFromResults([])).toEqual({ win: 0, lose: 0, draw: 0 });
    });
    test('ignores unknown result strings', () => {
        const r = countsFromResults(['win', 'unknown']);
        expect(r.win).toBe(1);
        expect(r.lose).toBe(0);
    });
});
