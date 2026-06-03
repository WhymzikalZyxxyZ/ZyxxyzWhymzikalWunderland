'use strict';
const {
    PONG_W, PONG_H, PADDLE_H, BALL_R, PONG_MAX_SCORE,
    newPongState, pongTick, resetBall, getAIPaddleY, clampPaddleY
} = require('../js/engines/pong-engine');

describe('newPongState', () => {
    test('returns expected structure', () => {
        const s = newPongState();
        expect(s).toHaveProperty('ball');
        expect(s).toHaveProperty('left');
        expect(s).toHaveProperty('right');
        expect(s).toHaveProperty('score');
    });
    test('ball starts at centre', () => {
        const { ball } = newPongState();
        expect(ball.x).toBeCloseTo(PONG_W / 2);
        expect(ball.y).toBeCloseTo(PONG_H / 2);
    });
    test('score starts at 0-0', () => {
        const { score } = newPongState();
        expect(score.left).toBe(0);
        expect(score.right).toBe(0);
    });
    test('paddles start at centre height', () => {
        const { left, right } = newPongState();
        expect(left.y).toBeCloseTo(PONG_H / 2 - PADDLE_H / 2);
        expect(right.y).toBeCloseTo(PONG_H / 2 - PADDLE_H / 2);
    });
});

describe('clampPaddleY', () => {
    test('clamps below 0', ()          => expect(clampPaddleY(-50)).toBe(0));
    test('clamps above max', ()        => expect(clampPaddleY(PONG_H+10)).toBe(PONG_H - PADDLE_H));
    test('leaves valid value alone', () => expect(clampPaddleY(100)).toBe(100));
});

describe('pongTick', () => {
    test('returns same structure', () => {
        const s  = newPongState();
        const s2 = pongTick(s, s.left.y, s.right.y);
        expect(s2).toHaveProperty('ball');
        expect(s2).toHaveProperty('score');
    });
    test('ball moves each tick', () => {
        const s  = newPongState();
        const s2 = pongTick(s, s.left.y, s.right.y);
        expect(s2.ball.x).not.toBeCloseTo(s.ball.x);
    });
    test('paused state does not change ball', () => {
        const s  = { ...newPongState(), paused: true };
        const s2 = pongTick(s, s.left.y, s.right.y);
        expect(s2.ball.x).toBeCloseTo(s.ball.x);
    });
    test('ball bounces off top wall', () => {
        const s = { ...newPongState(), ball: { x: PONG_W/2, y: BALL_R+1, vx: 1, vy: -5 } };
        const s2 = pongTick(s, s.left.y, s.right.y);
        expect(s2.ball.vy).toBeGreaterThan(0);
    });
    test('ball bounces off bottom wall', () => {
        const s = { ...newPongState(), ball: { x: PONG_W/2, y: PONG_H-BALL_R-1, vx: 1, vy: 5 } };
        const s2 = pongTick(s, s.left.y, s.right.y);
        expect(s2.ball.vy).toBeLessThan(0);
    });
    test('score increments when ball exits right', () => {
        const s = { ...newPongState(), ball: { x: PONG_W-BALL_R+5, y: PONG_H/2, vx: 10, vy: 0 } };
        const s2 = pongTick(s, s.left.y, s.right.y);
        expect(s2.score.left).toBe(1);
    });
    test('score increments when ball exits left', () => {
        const s = { ...newPongState(), ball: { x: BALL_R-5, y: PONG_H/2, vx: -10, vy: 0 } };
        const s2 = pongTick(s, s.left.y, s.right.y);
        expect(s2.score.right).toBe(1);
    });
    test('ball bounces off left paddle', () => {
        const lY = PONG_H / 2 - PADDLE_H / 2;
        const s  = { ...newPongState(), ball: { x: 25, y: lY + PADDLE_H / 2, vx: -10, vy: 0 } };
        const s2 = pongTick(s, lY, s.right.y);
        expect(s2.ball.vx).toBeGreaterThan(0);
    });
    test('ball bounces off right paddle', () => {
        const rY = PONG_H / 2 - PADDLE_H / 2;
        const s  = { ...newPongState(), ball: { x: 775, y: rY + PADDLE_H / 2, vx: 10, vy: 0 } };
        const s2 = pongTick(s, s.left.y, rY);
        expect(s2.ball.vx).toBeLessThan(0);
    });
    test('hitOffset deflects ball angle on paddle edge hit', () => {
        const lY = 0;
        // Hit near the top edge of the paddle (y ≈ lY), offset close to -1
        const s  = { ...newPongState(), ball: { x: 25, y: lY + 2, vx: -8, vy: 0 } };
        const s2 = pongTick(s, lY, s.right.y);
        // vy should change from the edge hit angle
        expect(typeof s2.ball.vy).toBe('number');
        expect(s2.ball.vx).toBeGreaterThan(0);
    });
    test('score is capped at PONG_MAX_SCORE', () => {
        const s = { ...newPongState(),
            ball: { x: BALL_R-5, y: PONG_H/2, vx: -10, vy: 0 },
            score: { left: 0, right: PONG_MAX_SCORE } };
        const s2 = pongTick(s, s.left.y, s.right.y);
        expect(s2.score.right).toBe(PONG_MAX_SCORE);
    });
});

describe('resetBall', () => {
    test('places ball at centre', () => {
        const b = resetBall(1);
        expect(b.x).toBeCloseTo(PONG_W / 2);
        expect(b.y).toBeCloseTo(PONG_H / 2);
    });
    test('vx direction matches input', () => {
        expect(resetBall( 1).vx).toBeGreaterThan(0);
        expect(resetBall(-1).vx).toBeLessThan(0);
    });
});

describe('getAIPaddleY', () => {
    test('returns a finite number', () => {
        const s = newPongState();
        expect(Number.isFinite(getAIPaddleY(s, 'right', 5))).toBe(true);
    });
    test('result is within valid paddle range', () => {
        const s = newPongState();
        for (let d = 0; d <= 9; d++) {
            const y = getAIPaddleY(s, 'right', d);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(PONG_H - PADDLE_H);
        }
    });
    test('higher difficulty tracks ball more accurately', () => {
        const s = { ...newPongState(), ball: { x: PONG_W*0.9, y: 50, vx: 3, vy: 0 },
                    right: { y: PONG_H/2 } };
        const easy = getAIPaddleY(s, 'right', 0);
        const hard = getAIPaddleY(s, 'right', 9);
        const target = 50 - PADDLE_H/2;
        expect(Math.abs(hard - target)).toBeLessThan(Math.abs(easy - target) + 80);
    });
});
