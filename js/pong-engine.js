'use strict';

const PONG_W       = 800;
const PONG_H       = 500;
const PADDLE_W     = 12;
const PADDLE_H     = 80;
const BALL_R       = 8;
const BALL_SPEED   = 5;
const PONG_MAX_SCORE = 999;

function newPongState() {
    return {
        ball:   { x: PONG_W / 2, y: PONG_H / 2, vx: BALL_SPEED, vy: 2 },
        left:   { y: PONG_H / 2 - PADDLE_H / 2 },
        right:  { y: PONG_H / 2 - PADDLE_H / 2 },
        score:  { left: 0, right: 0 },
        paused: false,
    };
}

function clampPaddleY(y) {
    return Math.max(0, Math.min(PONG_H - PADDLE_H, y));
}

// Returns how many centred-ball diameters off the hit point is (0 = centre, 1 = edge)
function hitOffset(ball, paddleY) {
    const centre = paddleY + PADDLE_H / 2;
    return (ball.y - centre) / (PADDLE_H / 2);
}

function pongTick(state, leftY, rightY) {
    if (state.paused) return state;

    const b   = { ...state.ball };
    const lY  = clampPaddleY(leftY  !== undefined ? leftY  : state.left.y);
    const rY  = clampPaddleY(rightY !== undefined ? rightY : state.right.y);
    const sc  = { ...state.score };

    b.x += b.vx;
    b.y += b.vy;

    // Top / bottom wall bounce
    if (b.y - BALL_R <= 0)         { b.y = BALL_R;          b.vy = Math.abs(b.vy); }
    if (b.y + BALL_R >= PONG_H)    { b.y = PONG_H - BALL_R; b.vy = -Math.abs(b.vy); }

    // Left paddle collision
    if (b.vx < 0 && b.x - BALL_R <= PADDLE_W && b.y >= lY && b.y <= lY + PADDLE_H) {
        b.x  = PADDLE_W + BALL_R;
        const off = hitOffset(b, lY);
        const spd = Math.min(Math.sqrt(b.vx * b.vx + b.vy * b.vy) + 0.3, 18);
        b.vx = Math.abs(spd * Math.cos(off * Math.PI / 4));
        b.vy = spd * Math.sin(off * Math.PI / 3);
    }

    // Right paddle collision
    if (b.vx > 0 && b.x + BALL_R >= PONG_W - PADDLE_W &&
            b.y >= rY && b.y <= rY + PADDLE_H) {
        b.x  = PONG_W - PADDLE_W - BALL_R;
        const off = hitOffset(b, rY);
        const spd = Math.min(Math.sqrt(b.vx * b.vx + b.vy * b.vy) + 0.3, 18);
        b.vx = -Math.abs(spd * Math.cos(off * Math.PI / 4));
        b.vy = spd * Math.sin(off * Math.PI / 3);
    }

    // Score: ball exits left or right
    let scored = null;
    if (b.x - BALL_R < 0) {
        scored = 'right';
        sc.right = Math.min(sc.right + 1, PONG_MAX_SCORE);
        Object.assign(b, resetBall(-1));
    } else if (b.x + BALL_R > PONG_W) {
        scored = 'left';
        sc.left = Math.min(sc.left + 1, PONG_MAX_SCORE);
        Object.assign(b, resetBall(1));
    }

    return { ball: b, left: { y: lY }, right: { y: rY }, score: sc, paused: false, scored };
}

function resetBall(dirX) {
    const angle = (Math.random() * 30 - 15) * Math.PI / 180;
    return {
        x:  PONG_W / 2,
        y:  PONG_H / 2,
        vx: dirX * BALL_SPEED * Math.cos(angle),
        vy: BALL_SPEED * Math.sin(angle),
    };
}

// Returns the ideal paddle Y for the AI side given state and difficulty (0-9)
function getAIPaddleY(state, side, difficulty) {
    const clamp = Math.max(0, Math.min(9, Math.floor(difficulty)));
    const paddle = state[side];
    const ball   = state.ball;
    const target = ball.y - PADDLE_H / 2;

    if (clamp === 0) return paddle.y + (Math.random() - 0.5) * 20;

    // Speed of paddle movement: difficulty scales 1-9 → 2-16 px/tick
    const speed   = 2 + (clamp - 1) * 1.75;
    // Perfect tracking at high difficulty; add jitter at low
    const jitter  = (9 - clamp) * 8;
    const aim     = target + (Math.random() - 0.5) * jitter;
    const delta   = aim - paddle.y;
    const stepped = paddle.y + Math.sign(delta) * Math.min(Math.abs(delta), speed);
    return clampPaddleY(stepped);
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PONG_W, PONG_H, PADDLE_W, PADDLE_H, BALL_R, BALL_SPEED, PONG_MAX_SCORE,
        newPongState, pongTick, resetBall, getAIPaddleY, clampPaddleY
    };
}
