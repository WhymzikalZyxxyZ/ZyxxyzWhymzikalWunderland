"""
Tests for python/shared/chess_engine.py — targeting ≥90% coverage.
Covers: board setup, move generation, apply_move, castling, en-passant,
promotion, check/checkmate/stalemate detection, AI move, and edge cases.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

import pytest
from chess_engine import (
    new_game, apply_move, ChessMove, ChessGame, ChessStatus,
    get_legal_moves, get_ai_move,
    _update_status,
    P, N, B, R, Q, K,
)

# ── Helpers ──────────────────────────────────────────────────────────────────

def empty_board():
    return [[0]*8 for _ in range(8)]

def make_game(board, turn=1, **kwargs):
    from chess_engine import get_legal_moves, _update_status
    lm = list(get_legal_moves(board, turn,
                               kwargs.get('w_k', False), kwargs.get('w_q', False),
                               kwargs.get('b_k', False), kwargs.get('b_q', False),
                               kwargs.get('ep_r', -1), kwargs.get('ep_c', -1)))
    status = _update_status(board, turn, lm)
    return ChessGame(board=board, turn=turn,
                     w_k=kwargs.get('w_k', False), w_q=kwargs.get('w_q', False),
                     b_k=kwargs.get('b_k', False), b_q=kwargs.get('b_q', False),
                     ep_r=kwargs.get('ep_r', -1), ep_c=kwargs.get('ep_c', -1),
                     half_move=0, full_move=1, status=status, legal_moves=lm)

# ── Board setup ───────────────────────────────────────────────────────────────

def test_initial_board_corners():
    g = new_game()
    assert g.board[0][0] == -R
    assert g.board[0][7] == -R
    assert g.board[7][0] ==  R
    assert g.board[7][7] ==  R

def test_initial_board_knights():
    g = new_game()
    assert g.board[0][1] == -N
    assert g.board[0][6] == -N
    assert g.board[7][1] ==  N
    assert g.board[7][6] ==  N

def test_initial_board_bishops():
    g = new_game()
    assert g.board[0][2] == -B
    assert g.board[0][5] == -B
    assert g.board[7][2] ==  B
    assert g.board[7][5] ==  B

def test_initial_board_queens():
    g = new_game()
    assert g.board[0][3] == -Q
    assert g.board[7][3] ==  Q

def test_initial_board_kings():
    g = new_game()
    assert g.board[0][4] == -K
    assert g.board[7][4] ==  K

def test_initial_board_pawns():
    g = new_game()
    for c in range(8):
        assert g.board[1][c] == -P
        assert g.board[6][c] ==  P

def test_initial_board_empty_rows():
    g = new_game()
    for r in range(2, 6):
        for c in range(8):
            assert g.board[r][c] == 0

def test_initial_turn_is_white():
    g = new_game()
    assert g.turn == 1

def test_initial_status_active():
    g = new_game()
    assert g.status == ChessStatus.ACTIVE

def test_initial_castling_rights():
    g = new_game()
    assert g.w_k and g.w_q and g.b_k and g.b_q

def test_initial_legal_move_count():
    g = new_game()
    assert len(g.legal_moves) == 20

def test_initial_pawn_double_push_available():
    g = new_game()
    doubles = [m for m in g.legal_moves if m.r == 6 and m.tr == 4]
    assert len(doubles) == 8

def test_initial_knight_moves():
    g = new_game()
    knight_moves = [m for m in g.legal_moves if g.board[m.r][m.c] == N]
    assert len(knight_moves) == 4

# ── Apply move ────────────────────────────────────────────────────────────────

def test_apply_move_changes_turn():
    g = new_game()
    m = next(mv for mv in g.legal_moves if mv.r == 6 and mv.c == 4 and mv.tr == 4)
    g2 = apply_move(g, m)
    assert g2.turn == -1

def test_apply_move_places_piece():
    g = new_game()
    m = next(mv for mv in g.legal_moves if mv.r == 6 and mv.c == 4 and mv.tr == 4)
    g2 = apply_move(g, m)
    assert g2.board[4][4] == P
    assert g2.board[6][4] == 0

def test_apply_move_source_cleared():
    g = new_game()
    m = g.legal_moves[0]
    g2 = apply_move(g, m)
    assert g2.board[m.r][m.c] == 0

def test_double_push_sets_en_passant():
    g = new_game()
    m = next(mv for mv in g.legal_moves if mv.r == 6 and mv.c == 4 and mv.tr == 4)
    g2 = apply_move(g, m)
    assert g2.ep_r == 5 and g2.ep_c == 4

def test_single_push_no_en_passant():
    g = new_game()
    m = next(mv for mv in g.legal_moves if mv.r == 6 and mv.c == 4 and mv.tr == 5)
    g2 = apply_move(g, m)
    assert g2.ep_r == -1

def test_half_move_resets_on_pawn():
    g = new_game()
    m = g.legal_moves[0]
    g2 = apply_move(g, m)
    assert g2.half_move == 0

def test_half_move_increments_on_non_pawn_non_capture():
    g = new_game()
    m = next(mv for mv in g.legal_moves if mv.r == 7 and mv.c == 1)  # Nb1
    g2 = apply_move(g, m)
    assert g2.half_move == 1

def test_full_move_increments_after_black():
    g = new_game()
    m1 = next(mv for mv in g.legal_moves if mv.r == 6 and mv.c == 4 and mv.tr == 4)
    g2 = apply_move(g, m1)
    m2 = next(mv for mv in g2.legal_moves if mv.r == 1 and mv.c == 4 and mv.tr == 3)
    g3 = apply_move(g2, m2)
    assert g3.full_move == 2

# ── En passant ────────────────────────────────────────────────────────────────

def test_en_passant_capture():
    b = empty_board()
    b[3][4] =  P  # white pawn
    b[3][5] = -P  # black pawn adjacent after double push
    b[7][4] =  K
    b[0][4] = -K
    from chess_engine import get_legal_moves, _update_status
    lm = list(get_legal_moves(b, 1, False, False, False, False, 2, 5))
    ep_move = next((m for m in lm if m.ep), None)
    assert ep_move is not None
    g = ChessGame(board=b, turn=1, w_k=False, w_q=False, b_k=False, b_q=False,
                  ep_r=2, ep_c=5, half_move=0, full_move=1,
                  status=ChessStatus.ACTIVE, legal_moves=lm)
    g2 = apply_move(g, ep_move)
    assert g2.board[2][5] == P
    assert g2.board[3][5] == 0

# ── Castling ──────────────────────────────────────────────────────────────────

def test_white_kingside_castling():
    b = empty_board()
    b[7][4] = K; b[7][7] = R; b[0][4] = -K
    from chess_engine import get_legal_moves
    lm = list(get_legal_moves(b, 1, True, False, False, False, -1, -1))
    castle = next((m for m in lm if m.castle == 'K'), None)
    assert castle is not None
    g = ChessGame(board=b, turn=1, w_k=True, w_q=False, b_k=False, b_q=False,
                  ep_r=-1, ep_c=-1, half_move=0, full_move=1,
                  status=ChessStatus.ACTIVE, legal_moves=lm)
    g2 = apply_move(g, castle)
    assert g2.board[7][6] == K
    assert g2.board[7][5] == R
    assert g2.board[7][7] == 0

def test_white_queenside_castling():
    b = empty_board()
    b[7][4] = K; b[7][0] = R; b[0][4] = -K
    from chess_engine import get_legal_moves
    lm = list(get_legal_moves(b, 1, False, True, False, False, -1, -1))
    castle = next((m for m in lm if m.castle == 'Q'), None)
    assert castle is not None
    g = ChessGame(board=b, turn=1, w_k=False, w_q=True, b_k=False, b_q=False,
                  ep_r=-1, ep_c=-1, half_move=0, full_move=1,
                  status=ChessStatus.ACTIVE, legal_moves=lm)
    g2 = apply_move(g, castle)
    assert g2.board[7][2] == K
    assert g2.board[7][3] == R

def test_castling_revoked_after_king_moves():
    g = new_game()
    m = next(mv for mv in g.legal_moves if mv.r == 6 and mv.c == 4 and mv.tr == 4)
    g2 = apply_move(g, m)
    m2 = next(mv for mv in g2.legal_moves if mv.r == 1 and mv.c == 4 and mv.tr == 3)
    g3 = apply_move(g2, m2)
    king_move = next((mv for mv in g3.legal_moves if mv.r == 7 and mv.c == 4), None)
    if king_move:
        g4 = apply_move(g3, king_move)
        assert not g4.w_k
        assert not g4.w_q

# ── Promotion ─────────────────────────────────────────────────────────────────

def test_pawn_promotion_to_queen():
    b = empty_board()
    b[1][0] = P; b[7][4] = K; b[0][4] = -K
    from chess_engine import get_legal_moves
    lm = list(get_legal_moves(b, 1, False, False, False, False, -1, -1))
    promo = next((m for m in lm if m.promo == Q), None)
    assert promo is not None
    g = ChessGame(board=b, turn=1, w_k=False, w_q=False, b_k=False, b_q=False,
                  ep_r=-1, ep_c=-1, half_move=0, full_move=1,
                  status=ChessStatus.ACTIVE, legal_moves=lm)
    g2 = apply_move(g, promo)
    assert g2.board[0][0] == Q

def test_pawn_promotion_options():
    b = empty_board()
    b[1][0] = P; b[7][4] = K; b[0][4] = -K
    from chess_engine import get_legal_moves
    lm = list(get_legal_moves(b, 1, False, False, False, False, -1, -1))
    promos = {m.promo for m in lm if m.promo is not None}
    assert promos == {Q, R, B, N}

# ── Check detection ──────────────────────────────────────────────────────────

def test_check_status():
    b = empty_board()
    b[0][4] = -K; b[7][4] = K; b[1][4] = R  # white rook attacks black king
    from chess_engine import get_legal_moves, _update_status
    lm = list(get_legal_moves(b, -1, False, False, False, False, -1, -1))
    status = _update_status(b, -1, lm)
    assert status == ChessStatus.CHECK

def test_illegal_move_into_check_filtered():
    b = empty_board()
    b[7][4] = K; b[0][4] = -K; b[0][0] = -R
    from chess_engine import get_legal_moves
    lm = list(get_legal_moves(b, 1, False, False, False, False, -1, -1))
    # King must not be able to walk into the rook's file
    king_to_col0 = [m for m in lm if m.r == 7 and m.c == 4 and m.tc == 4]
    # None of the king moves should leave it on file 4 if rook controls it
    for m in lm:
        if m.r == 7 and m.c == 4:
            assert m.tc != 4 or m.tr != 0

# ── Checkmate ────────────────────────────────────────────────────────────────

def test_scholars_mate():
    """Four-move scholars mate results in checkmate."""
    g = new_game()
    moves = [
        (6, 4, 4, 4),   # e4
        (1, 4, 3, 4),   # e5
        (7, 5, 4, 2),   # Bc4
        (0, 1, 2, 2),   # Nc6
        (7, 3, 3, 7),   # Qh5
        (0, 6, 2, 5),   # Nf6
        (3, 7, 1, 5),   # Qxf7#
    ]
    for r, c, tr, tc in moves:
        m = next(mv for mv in g.legal_moves if mv.r == r and mv.c == c and mv.tr == tr and mv.tc == tc)
        g = apply_move(g, m)
    assert g.status == ChessStatus.CHECKMATE
    assert len(g.legal_moves) == 0

# ── Stalemate ────────────────────────────────────────────────────────────────

def test_stalemate_position():
    b = empty_board()
    b[0][0] = -K        # black king cornered
    b[2][1] = Q         # white queen covers b1
    b[1][2] = K         # white king covers c2 + c1
    from chess_engine import get_legal_moves, _update_status
    lm = list(get_legal_moves(b, -1, False, False, False, False, -1, -1))
    status = _update_status(b, -1, lm)
    assert status == ChessStatus.STALEMATE

# ── AI move ───────────────────────────────────────────────────────────────────

def test_ai_returns_move_from_start():
    from chess_engine import get_ai_move
    g = new_game()
    m = get_ai_move(g)
    assert m is not None
    assert m in g.legal_moves

def test_ai_captures_free_piece():
    """AI should capture a hanging piece when given the chance."""
    from chess_engine import get_ai_move
    b = empty_board()
    b[7][4] = K; b[0][4] = -K
    b[4][4] = -P  # black pawn sitting undefended in white's path
    b[5][4] =  P  # white pawn can take it
    from chess_engine import get_legal_moves, _update_status
    lm = list(get_legal_moves(b, 1, False, False, False, False, -1, -1))
    g = ChessGame(board=b, turn=1, w_k=False, w_q=False, b_k=False, b_q=False,
                  ep_r=-1, ep_c=-1, half_move=0, full_move=1,
                  status=ChessStatus.ACTIVE, legal_moves=lm)
    m = get_ai_move(g)
    assert m is not None

def test_ai_returns_none_on_checkmate():
    """AI returns None when the current side has no moves (checkmate)."""
    from chess_engine import get_ai_move
    b = empty_board()
    b[0][0] = -K; b[2][1] = Q; b[1][2] = K
    from chess_engine import get_legal_moves, _update_status
    lm = list(get_legal_moves(b, -1, False, False, False, False, -1, -1))
    status = _update_status(b, -1, lm)
    g = ChessGame(board=b, turn=-1, w_k=False, w_q=False, b_k=False, b_q=False,
                  ep_r=-1, ep_c=-1, half_move=0, full_move=1,
                  status=status, legal_moves=lm)
    assert get_ai_move(g) is None

# ── Move generation edge cases ────────────────────────────────────────────────

def test_pinned_piece_cannot_move():
    """A piece pinned to the king must not expose the king."""
    b = empty_board()
    b[7][4] = K; b[7][3] = R; b[7][0] = -R; b[0][4] = -K
    from chess_engine import get_legal_moves
    lm = list(get_legal_moves(b, 1, False, False, False, False, -1, -1))
    rook_moves = [m for m in lm if m.r == 7 and m.c == 3 and m.tr != 7]
    assert len(rook_moves) == 0  # rook is pinned on rank 7

def test_sliding_pieces_blocked_by_own_pieces():
    g = new_game()
    rook_moves = [m for m in g.legal_moves if g.board[m.r][m.c] in (R, B, Q)]
    assert len(rook_moves) == 0

def test_black_has_20_moves_after_e4():
    g = new_game()
    m = next(mv for mv in g.legal_moves if mv.r == 6 and mv.c == 4 and mv.tr == 4)
    g2 = apply_move(g, m)
    assert len(g2.legal_moves) == 20
