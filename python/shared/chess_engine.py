"""Chess engine — pure Python, no dependencies. Mirrors Java/Kotlin/C# implementations."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

P, N, B, R, Q, K = 1, 2, 3, 4, 5, 6


class ChessStatus(Enum):
    ACTIVE = "active"
    CHECK = "check"
    CHECKMATE = "checkmate"
    STALEMATE = "stalemate"


@dataclass(frozen=True)
class ChessMove:
    r: int
    c: int
    tr: int
    tc: int
    promo: int | None = None
    castle: str | None = None
    ep: bool = False
    double: bool = False


@dataclass
class ChessGame:
    board: list[list[int]]
    turn: int  # 1=white, -1=black
    w_k: bool = True
    w_q: bool = True
    b_k: bool = True
    b_q: bool = True
    ep_r: int = -1
    ep_c: int = -1
    half_move: int = 0
    full_move: int = 1
    status: ChessStatus = ChessStatus.ACTIVE
    legal_moves: list[ChessMove] = field(default_factory=list)


# ── Piece-square tables ──────────────────────────────────────────────────────
_PST_P = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
]
_PST_N = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
]
_PST_B = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
]
_PST_R = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
]
_PST_Q = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
]
_PST_K = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
]
_PST = {P: _PST_P, N: _PST_N, B: _PST_B, R: _PST_R, Q: _PST_Q, K: _PST_K}
_VAL = {P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000}


def _in(r, c):
    return 0 <= r < 8 and 0 <= c < 8


# ── Move generation ──────────────────────────────────────────────────────────

def _pawn_moves(board, r, c, turn, ep_r, ep_c):
    d = -turn
    start, promo = (6, 0) if turn == 1 else (1, 7)
    if _in(r+d, c) and board[r+d][c] == 0:
        if r+d == promo:
            for p in [Q*turn, R*turn, B*turn, N*turn]:
                yield ChessMove(r, c, r+d, c, promo=p)
        else:
            yield ChessMove(r, c, r+d, c)
            if r == start and board[r+2*d][c] == 0:
                yield ChessMove(r, c, r+2*d, c, double=True)
    for dc in (-1, 1):
        tr, tc = r+d, c+dc
        if not _in(tr, tc):
            continue
        cap = board[tr][tc] != 0 and (board[tr][tc] > 0) != (turn > 0)
        ep  = tr == ep_r and tc == ep_c
        if cap or ep:
            if tr == promo:
                for p in [Q*turn, R*turn, B*turn, N*turn]:
                    yield ChessMove(r, c, tr, tc, promo=p, ep=ep)
            else:
                yield ChessMove(r, c, tr, tc, ep=ep)


def _knight_moves(board, r, c, turn):
    for dr, dc in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]:
        tr, tc = r+dr, c+dc
        if _in(tr, tc) and not (board[tr][tc] != 0 and (board[tr][tc] > 0) == (turn > 0)):
            yield ChessMove(r, c, tr, tc)


def _slider(board, r, c, turn, dirs):
    for dr, dc in dirs:
        tr, tc = r+dr, c+dc
        while _in(tr, tc):
            if board[tr][tc] != 0:
                if (board[tr][tc] > 0) != (turn > 0):
                    yield ChessMove(r, c, tr, tc)
                break
            yield ChessMove(r, c, tr, tc)
            tr += dr
            tc += dc


def _king_moves(board, r, c, turn, w_k, w_q, b_k, b_q):
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == dc == 0:
                continue
            tr, tc = r+dr, c+dc
            if _in(tr, tc) and not (board[tr][tc] != 0 and (board[tr][tc] > 0) == (turn > 0)):
                yield ChessMove(r, c, tr, tc)
    if turn == 1 and r == 7 and c == 4:
        if w_k and board[7][5] == board[7][6] == 0 and not _attacked(board, 7, 4, -1) and not _attacked(board, 7, 5, -1):
            yield ChessMove(7, 4, 7, 6, castle='K')
        if w_q and board[7][3] == board[7][2] == board[7][1] == 0 and not _attacked(board, 7, 4, -1) and not _attacked(board, 7, 3, -1):
            yield ChessMove(7, 4, 7, 2, castle='Q')
    if turn == -1 and r == 0 and c == 4:
        if b_k and board[0][5] == board[0][6] == 0 and not _attacked(board, 0, 4, 1) and not _attacked(board, 0, 5, 1):
            yield ChessMove(0, 4, 0, 6, castle='k')
        if b_q and board[0][3] == board[0][2] == board[0][1] == 0 and not _attacked(board, 0, 4, 1) and not _attacked(board, 0, 3, 1):
            yield ChessMove(0, 4, 0, 2, castle='q')


def _pseudo(board, r, c, turn, w_k, w_q, b_k, b_q, ep_r, ep_c):
    p = abs(board[r][c])
    if p == P:
        yield from _pawn_moves(board, r, c, turn, ep_r, ep_c)
    elif p == N:
        yield from _knight_moves(board, r, c, turn)
    elif p == B:
        yield from _slider(board, r, c, turn, [(1,1),(1,-1),(-1,1),(-1,-1)])
    elif p == R:
        yield from _slider(board, r, c, turn, [(1,0),(-1,0),(0,1),(0,-1)])
    elif p == Q:
        yield from _slider(board, r, c, turn, [(1,1),(1,-1),(-1,1),(-1,-1)])
        yield from _slider(board, r, c, turn, [(1,0),(-1,0),(0,1),(0,-1)])
    elif p == K:
        yield from _king_moves(board, r, c, turn, w_k, w_q, b_k, b_q)


def _apply_raw(board, m):
    b = [row[:] for row in board]
    piece = b[m.r][m.c]
    b[m.tr][m.tc] = m.promo if m.promo else piece
    b[m.r][m.c] = 0
    if m.ep:
        b[m.r][m.tc] = 0
    if m.castle == 'K':
        b[7][5] = R
        b[7][7] = 0
    if m.castle == 'Q':
        b[7][3] = R
        b[7][0] = 0
    if m.castle == 'k':
        b[0][5] = -R
        b[0][7] = 0
    if m.castle == 'q':
        b[0][3] = -R
        b[0][0] = 0
    return b


def _in_check(board, turn):
    for r in range(8):
        for c in range(8):
            if board[r][c] == K * turn:
                return _attacked(board, r, c, -turn)
    return False


def _attacked(board, r, c, by):
    for dr, dc in [(1,0),(-1,0),(0,1),(0,-1)]:
        tr, tc = r+dr, c+dc
        while _in(tr, tc):
            p = board[tr][tc]
            if p == 0:
                tr += dr
                tc += dc
                continue
            if p in (R*by, Q*by):
                return True
            break
    for dr, dc in [(1,1),(1,-1),(-1,1),(-1,-1)]:
        tr, tc = r+dr, c+dc
        while _in(tr, tc):
            p = board[tr][tc]
            if p == 0:
                tr += dr
                tc += dc
                continue
            if p in (B*by, Q*by):
                return True
            break
    for dr, dc in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]:
        if _in(r+dr, c+dc) and board[r+dr][c+dc] == N*by:
            return True
    pd = 1 if by == 1 else -1
    if _in(r+pd, c-1) and board[r+pd][c-1] == P*by:
        return True
    if _in(r+pd, c+1) and board[r+pd][c+1] == P*by:
        return True
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == dc == 0:
                continue
            if _in(r+dr, c+dc) and board[r+dr][c+dc] == K*by:
                return True
    return False


def get_legal_moves(board, turn, w_k, w_q, b_k, b_q, ep_r, ep_c):
    legal = []
    for r in range(8):
        for c in range(8):
            if board[r][c] != 0 and (board[r][c] > 0) == (turn > 0):
                for m in _pseudo(board, r, c, turn, w_k, w_q, b_k, b_q, ep_r, ep_c):
                    nb = _apply_raw(board, m)
                    if not _in_check(nb, turn):
                        legal.append(m)
    return legal


# ── Public API ───────────────────────────────────────────────────────────────

def new_game() -> ChessGame:
    board = [[0]*8 for _ in range(8)]
    back = [R, N, B, Q, K, B, N, R]
    for c in range(8):
        board[0][c] = -back[c]
        board[1][c] = -P
        board[6][c] = P
        board[7][c] = back[c]
    moves = get_legal_moves(board, 1, True, True, True, True, -1, -1)
    return ChessGame(board=board, turn=1, legal_moves=moves)


def apply_move(g: ChessGame, m: ChessMove) -> ChessGame:
    board = _apply_raw(g.board, m)
    w_k, w_q, b_k, b_q = g.w_k, g.w_q, g.b_k, g.b_q
    ep_r, ep_c = -1, -1
    piece = abs(g.board[m.r][m.c])
    if piece == K:
        if g.turn == 1:
            w_k = w_q = False
        else:
            b_k = b_q = False
    if piece == R:
        if m.r == 7 and m.c == 7:
            w_k = False
        if m.r == 7 and m.c == 0:
            w_q = False
        if m.r == 0 and m.c == 7:
            b_k = False
        if m.r == 0 and m.c == 0:
            b_q = False
    if m.double:
        ep_r, ep_c = (m.r + m.tr) // 2, m.c
    next_turn = -g.turn
    legal = get_legal_moves(board, next_turn, w_k, w_q, b_k, b_q, ep_r, ep_c)
    status = _update_status(board, next_turn, legal)
    half = 0 if piece == P or board[m.tr][m.tc] != 0 else g.half_move + 1
    full = g.full_move + (1 if g.turn == -1 else 0)
    return ChessGame(board=board, turn=next_turn, w_k=w_k, w_q=w_q, b_k=b_k, b_q=b_q,
                     ep_r=ep_r, ep_c=ep_c, half_move=half, full_move=full,
                     status=status, legal_moves=legal)


def _update_status(board, turn, legal):
    if not legal:
        return ChessStatus.CHECKMATE if _in_check(board, turn) else ChessStatus.STALEMATE
    return ChessStatus.CHECK if _in_check(board, turn) else ChessStatus.ACTIVE


def _evaluate(board):
    score = 0
    for r in range(8):
        for c in range(8):
            p = board[r][c]
            if p == 0:
                continue
            s = 1 if p > 0 else -1
            a = abs(p)
            idx = r*8+c if s == 1 else (7-r)*8+c
            score += s * (_VAL[a] + _PST[a][idx])
    return score


def _mvv_lva(board, m):
    victim = abs(board[m.tr][m.tc])
    attacker = abs(board[m.r][m.c])
    return _VAL.get(victim, 0) * 10 - _VAL.get(attacker, 0) if victim else 0


def _minimax(g, depth, alpha, beta, maximising):
    if depth == 0 or g.status in (ChessStatus.CHECKMATE, ChessStatus.STALEMATE):
        return _evaluate(g.board) * maximising
    moves = sorted(g.legal_moves, key=lambda m: _mvv_lva(g.board, m), reverse=True)
    best = -float('inf')
    for m in moves:
        score = -_minimax(apply_move(g, m), depth-1, -beta, -alpha, -maximising)
        best = max(best, score)
        alpha = max(alpha, score)
        if alpha >= beta:
            break
    return best


def get_ai_move(g: ChessGame) -> ChessMove | None:
    if not g.legal_moves:
        return None
    depths = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4]
    depth = depths[min(len(g.legal_moves), len(depths)-1)]
    best_score, best_move = -float('inf'), g.legal_moves[0]
    for m in g.legal_moves:
        score = -_minimax(apply_move(g, m), depth, -float('inf'), float('inf'), -g.turn)
        if score > best_score:
            best_score, best_move = score, m
    return best_move
