//! Chess engine — Rust. Zero GC, zero unsafe, same PST/alpha-beta as all other implementations.

pub const P: i8 = 1; pub const N: i8 = 2; pub const B: i8 = 3;
pub const R: i8 = 4; pub const Q: i8 = 5; pub const K: i8 = 6;

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum ChessStatus { Active, Check, Checkmate, Stalemate }

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct ChessMove {
    pub r: u8, pub c: u8, pub tr: u8, pub tc: u8,
    pub promo: Option<i8>,
    pub castle: Option<u8>,  // b'K' | b'Q' | b'k' | b'q'
    pub ep: bool,
    pub double_push: bool,
}

impl ChessMove {
    pub fn new(r: u8, c: u8, tr: u8, tc: u8) -> Self {
        Self { r, c, tr, tc, promo: None, castle: None, ep: false, double_push: false }
    }
}

pub type Board = [[i8; 8]; 8];

#[derive(Clone)]
pub struct ChessGame {
    pub board: Board,
    pub turn: i8,          // 1 = white, -1 = black
    pub w_k: bool, pub w_q: bool, pub b_k: bool, pub b_q: bool,
    pub ep_r: i8, pub ep_c: i8,
    pub half_move: u16, pub full_move: u16,
    pub status: ChessStatus,
    pub legal_moves: Vec<ChessMove>,
}

// ── Piece-square tables ──────────────────────────────────────────────────────
const PST_P: [i32; 64] = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
];
const PST_N: [i32; 64] = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
];
const PST_B: [i32; 64] = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
];
const PST_R: [i32; 64] = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
];
const PST_Q: [i32; 64] = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
];
const PST_K: [i32; 64] = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
];

fn pst(piece: i8, r: usize, c: usize) -> i32 {
    let idx = if piece > 0 { r * 8 + c } else { (7 - r) * 8 + c };
    match piece.unsigned_abs() {
        1 => PST_P[idx], 2 => PST_N[idx], 3 => PST_B[idx],
        4 => PST_R[idx], 5 => PST_Q[idx], 6 => PST_K[idx],
        _ => 0,
    }
}

fn piece_val(p: i8) -> i32 {
    match p.unsigned_abs() {
        1 => 100, 2 => 320, 3 => 330, 4 => 500, 5 => 900, 6 => 20000, _ => 0,
    }
}

// ── Move generation ──────────────────────────────────────────────────────────
fn inb(r: i8, c: i8) -> bool { (0..8).contains(&r) && (0..8).contains(&c) }

fn enemy_or_empty(b: &Board, r: i8, c: i8, turn: i8) -> bool {
    let (r, c) = (r as usize, c as usize);
    b[r][c] == 0 || (b[r][c] > 0) != (turn > 0)
}

fn pawn_moves(b: &Board, r: u8, c: u8, turn: i8, ep_r: i8, ep_c: i8, out: &mut Vec<ChessMove>) {
    let (ri, ci) = (r as i8, c as i8);
    let d = -turn;
    let (start, promo_row) = if turn == 1 { (6i8, 0i8) } else { (1i8, 7i8) };
    let nr = ri + d;
    if inb(nr, ci) && b[nr as usize][ci as usize] == 0 {
        if nr == promo_row {
            for &p in &[Q * turn, R * turn, B * turn, N * turn] {
                out.push(ChessMove { r, c, tr: nr as u8, tc: c, promo: Some(p), ..ChessMove::new(r,c,nr as u8,c) });
            }
        } else {
            out.push(ChessMove::new(r, c, nr as u8, c));
            if ri == start && b[(nr + d) as usize][ci as usize] == 0 {
                out.push(ChessMove { r, c, tr: (nr+d) as u8, tc: c, double_push: true, ..ChessMove::new(r,c,0,0) });
            }
        }
    }
    for &dc in &[-1i8, 1] {
        let (tr, tc) = (nr, ci + dc);
        if !inb(tr, tc) { continue; }
        let cap = b[tr as usize][tc as usize] != 0 && (b[tr as usize][tc as usize] > 0) != (turn > 0);
        let ep = tr == ep_r && tc == ep_c;
        if cap || ep {
            if tr == promo_row {
                for &p in &[Q * turn, R * turn, B * turn, N * turn] {
                    out.push(ChessMove { r, c, tr: tr as u8, tc: tc as u8, promo: Some(p), ep, ..ChessMove::new(r,c,0,0) });
                }
            } else {
                out.push(ChessMove { r, c, tr: tr as u8, tc: tc as u8, ep, ..ChessMove::new(r,c,0,0) });
            }
        }
    }
}

fn knight_moves(b: &Board, r: u8, c: u8, turn: i8, out: &mut Vec<ChessMove>) {
    for &(dr, dc) in &[(-2i8,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)] {
        let (tr, tc) = (r as i8 + dr, c as i8 + dc);
        if inb(tr, tc) && enemy_or_empty(b, tr, tc, turn) {
            out.push(ChessMove::new(r, c, tr as u8, tc as u8));
        }
    }
}

fn slider_moves(b: &Board, r: u8, c: u8, turn: i8, dirs: &[(i8,i8)], out: &mut Vec<ChessMove>) {
    for &(dr, dc) in dirs {
        let (mut tr, mut tc) = (r as i8 + dr, c as i8 + dc);
        while inb(tr, tc) {
            let (tur, tuc) = (tr as usize, tc as usize);
            if b[tur][tuc] != 0 {
                if (b[tur][tuc] > 0) != (turn > 0) { out.push(ChessMove::new(r, c, tr as u8, tc as u8)); }
                break;
            }
            out.push(ChessMove::new(r, c, tr as u8, tc as u8));
            tr += dr; tc += dc;
        }
    }
}

fn attacked(b: &Board, r: usize, c: usize, by: i8) -> bool {
    for &(dr, dc) in &[(1i8,0),(-1,0),(0,1),(0,-1)] {
        let (mut tr, mut tc) = (r as i8 + dr, c as i8 + dc);
        while inb(tr, tc) {
            let p = b[tr as usize][tc as usize];
            if p == 0 { tr += dr; tc += dc; continue; }
            if p == R * by || p == Q * by { return true; }
            break;
        }
    }
    for &(dr, dc) in &[(1i8,1),(1,-1),(-1,1),(-1,-1)] {
        let (mut tr, mut tc) = (r as i8 + dr, c as i8 + dc);
        while inb(tr, tc) {
            let p = b[tr as usize][tc as usize];
            if p == 0 { tr += dr; tc += dc; continue; }
            if p == B * by || p == Q * by { return true; }
            break;
        }
    }
    for &(dr, dc) in &[(-2i8,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)] {
        let (tr, tc) = (r as i8 + dr, c as i8 + dc);
        if inb(tr, tc) && b[tr as usize][tc as usize] == N * by { return true; }
    }
    let pd: i8 = if by == 1 { 1 } else { -1 };
    for &dc in &[-1i8, 1] {
        let (tr, tc) = (r as i8 + pd, c as i8 + dc);
        if inb(tr, tc) && b[tr as usize][tc as usize] == P * by { return true; }
    }
    for dr in -1i8..=1 { for dc in -1i8..=1 {
        if dr == 0 && dc == 0 { continue; }
        let (tr, tc) = (r as i8 + dr, c as i8 + dc);
        if inb(tr, tc) && b[tr as usize][tc as usize] == K * by { return true; }
    }}
    false
}

fn in_check(b: &Board, turn: i8) -> bool {
    for r in 0..8usize { for c in 0..8usize {
        if b[r][c] == K * turn { return attacked(b, r, c, -turn); }
    }}
    false
}

fn apply_raw(board: &Board, m: &ChessMove) -> Board {
    let mut b = *board;
    let piece = b[m.r as usize][m.c as usize];
    b[m.tr as usize][m.tc as usize] = m.promo.unwrap_or(piece);
    b[m.r as usize][m.c as usize] = 0;
    if m.ep { b[m.r as usize][m.tc as usize] = 0; }
    match m.castle {
        Some(b'K') => { b[7][5] = R;  b[7][7] = 0; }
        Some(b'Q') => { b[7][3] = R;  b[7][0] = 0; }
        Some(b'k') => { b[0][5] = -R; b[0][7] = 0; }
        Some(b'q') => { b[0][3] = -R; b[0][0] = 0; }
        _ => {}
    }
    b
}

#[allow(clippy::too_many_arguments)]
fn pseudo_moves(b: &Board, r: u8, c: u8, turn: i8,
                w_k: bool, w_q: bool, bk: bool, bq: bool,
                ep_r: i8, ep_c: i8) -> Vec<ChessMove> {
    let mut out = Vec::new();
    let p = b[r as usize][c as usize].unsigned_abs();
    match p {
        1 => pawn_moves(b, r, c, turn, ep_r, ep_c, &mut out),
        2 => knight_moves(b, r, c, turn, &mut out),
        3 => slider_moves(b, r, c, turn, &[(1,1),(1,-1),(-1,1),(-1,-1)], &mut out),
        4 => slider_moves(b, r, c, turn, &[(1,0),(-1,0),(0,1),(0,-1)], &mut out),
        5 => {
            slider_moves(b, r, c, turn, &[(1,1),(1,-1),(-1,1),(-1,-1)], &mut out);
            slider_moves(b, r, c, turn, &[(1,0),(-1,0),(0,1),(0,-1)], &mut out);
        }
        6 => {
            for dr in -1i8..=1 { for dc in -1i8..=1 {
                if dr == 0 && dc == 0 { continue; }
                let (tr, tc) = (r as i8 + dr, c as i8 + dc);
                if inb(tr, tc) && enemy_or_empty(b, tr, tc, turn) {
                    out.push(ChessMove::new(r, c, tr as u8, tc as u8));
                }
            }}
            if turn == 1 && r == 7 && c == 4 {
                if w_k && b[7][5]==0&&b[7][6]==0&&!attacked(b,7,4,-1)&&!attacked(b,7,5,-1) {
                    out.push(ChessMove{castle:Some(b'K'),..ChessMove::new(7,4,7,6)});
                }
                if w_q && b[7][3]==0&&b[7][2]==0&&b[7][1]==0&&!attacked(b,7,4,-1)&&!attacked(b,7,3,-1) {
                    out.push(ChessMove{castle:Some(b'Q'),..ChessMove::new(7,4,7,2)});
                }
            }
            if turn == -1 && r == 0 && c == 4 {
                if bk && b[0][5]==0&&b[0][6]==0&&!attacked(b,0,4,1)&&!attacked(b,0,5,1) {
                    out.push(ChessMove{castle:Some(b'k'),..ChessMove::new(0,4,0,6)});
                }
                if bq && b[0][3]==0&&b[0][2]==0&&b[0][1]==0&&!attacked(b,0,4,1)&&!attacked(b,0,3,1) {
                    out.push(ChessMove{castle:Some(b'q'),..ChessMove::new(0,4,0,2)});
                }
            }
        }
        _ => {}
    }
    out
}

#[allow(clippy::too_many_arguments)]
pub fn get_legal_moves(board: &Board, turn: i8, w_k: bool, w_q: bool, bk: bool, bq: bool, ep_r: i8, ep_c: i8) -> Vec<ChessMove> {
    let mut legal = Vec::new();
    for r in 0..8u8 { for c in 0..8u8 {
        let p = board[r as usize][c as usize];
        if p != 0 && (p > 0) == (turn > 0) {
            for m in pseudo_moves(board, r, c, turn, w_k, w_q, bk, bq, ep_r, ep_c) {
                let nb = apply_raw(board, &m);
                if !in_check(&nb, turn) { legal.push(m); }
            }
        }
    }}
    legal
}

// ── Public API ───────────────────────────────────────────────────────────────
pub fn new_game() -> ChessGame {
    let mut board = [[0i8; 8]; 8];
    let back = [R, N, B, Q, K, B, N, R];
    for c in 0..8usize { board[0][c] = -back[c]; board[1][c] = -P; board[6][c] = P; board[7][c] = back[c]; }
    let legal_moves = get_legal_moves(&board, 1, true, true, true, true, -1, -1);
    ChessGame { board, turn: 1, w_k: true, w_q: true, b_k: true, b_q: true,
                ep_r: -1, ep_c: -1, half_move: 0, full_move: 1,
                status: ChessStatus::Active, legal_moves }
}

pub fn apply_move(g: &ChessGame, m: &ChessMove) -> ChessGame {
    let board = apply_raw(&g.board, m);
    let (mut w_k, mut w_q, mut b_k, mut b_q) = (g.w_k, g.w_q, g.b_k, g.b_q);
    let (mut ep_r, mut ep_c) = (-1i8, -1i8);
    let piece = g.board[m.r as usize][m.c as usize].unsigned_abs();
    if piece == 6 { if g.turn == 1 { w_k = false; w_q = false; } else { b_k = false; b_q = false; } }
    if piece == 4 {
        if m.r==7&&m.c==7 { w_k=false; }
        if m.r==7&&m.c==0 { w_q=false; }
        if m.r==0&&m.c==7 { b_k=false; }
        if m.r==0&&m.c==0 { b_q=false; }
    }
    if m.double_push { ep_r = (m.r as i8 + m.tr as i8) / 2; ep_c = m.c as i8; }
    let next_turn = -g.turn;
    let legal_moves = get_legal_moves(&board, next_turn, w_k, w_q, b_k, b_q, ep_r, ep_c);
    let status = update_status(&board, next_turn, &legal_moves);
    let half_move = if piece == 1 || g.board[m.tr as usize][m.tc as usize] != 0 { 0 } else { g.half_move + 1 };
    let full_move = g.full_move + if g.turn == -1 { 1 } else { 0 };
    ChessGame { board, turn: next_turn, w_k, w_q, b_k, b_q, ep_r, ep_c, half_move, full_move, status, legal_moves }
}

fn update_status(board: &Board, turn: i8, legal: &[ChessMove]) -> ChessStatus {
    if legal.is_empty() {
        if in_check(board, turn) { ChessStatus::Checkmate } else { ChessStatus::Stalemate }
    } else if in_check(board, turn) { ChessStatus::Check } else { ChessStatus::Active }
}

#[allow(clippy::needless_range_loop)]
fn evaluate(board: &Board) -> i32 {
    let mut score = 0i32;
    for r in 0..8usize { for c in 0..8usize {
        let p = board[r][c]; if p == 0 { continue; }
        let s = if p > 0 { 1 } else { -1 };
        score += s * (piece_val(p) + pst(p, r, c));
    }}
    score
}

fn mvv_lva(board: &Board, m: &ChessMove) -> i32 {
    let victim = board[m.tr as usize][m.tc as usize].unsigned_abs();
    let attacker = board[m.r as usize][m.c as usize].unsigned_abs();
    if victim != 0 { piece_val(victim as i8) * 10 - piece_val(attacker as i8) } else { 0 }
}

fn minimax(g: &ChessGame, depth: u8, mut alpha: i32, beta: i32, maximising: i32) -> i32 {
    if depth == 0 || matches!(g.status, ChessStatus::Checkmate | ChessStatus::Stalemate) {
        return evaluate(&g.board) * maximising;
    }
    let mut moves = g.legal_moves.clone();
    moves.sort_by_key(|m| -mvv_lva(&g.board, m));
    let mut best = i32::MIN / 2;
    for m in &moves {
        let score = -minimax(&apply_move(g, m), depth - 1, -beta, -alpha, -maximising);
        best = best.max(score); alpha = alpha.max(score);
        if alpha >= beta { break; }
    }
    best
}

pub fn get_ai_move(g: &ChessGame) -> Option<ChessMove> {
    if g.legal_moves.is_empty() { return None; }
    let depths = [0u8, 1, 1, 2, 2, 2, 3, 3, 4, 4];
    let depth = depths[g.legal_moves.len().min(depths.len() - 1)];
    let mut best_score = i32::MIN / 2;
    let mut best_move = g.legal_moves[0];
    for m in &g.legal_moves {
        let score = -minimax(&apply_move(g, m), depth, i32::MIN / 2, i32::MAX / 2, -g.turn as i32);
        if score > best_score { best_score = score; best_move = *m; }
    }
    Some(best_move)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn empty_board() -> Board { [[0i8; 8]; 8] }

    // ── Board setup ──────────────────────────────────────────────────────────

    #[test]
    fn initial_board_corners_are_rooks() {
        let g = new_game();
        assert_eq!(g.board[0][0], -R);
        assert_eq!(g.board[0][7], -R);
        assert_eq!(g.board[7][0],  R);
        assert_eq!(g.board[7][7],  R);
    }

    #[test]
    fn initial_board_kings() {
        let g = new_game();
        assert_eq!(g.board[0][4], -K);
        assert_eq!(g.board[7][4],  K);
    }

    #[test]
    fn initial_board_queens() {
        let g = new_game();
        assert_eq!(g.board[0][3], -Q);
        assert_eq!(g.board[7][3],  Q);
    }

    #[test]
    fn initial_board_pawns() {
        let g = new_game();
        for c in 0..8usize {
            assert_eq!(g.board[1][c], -P);
            assert_eq!(g.board[6][c],  P);
        }
    }

    #[test]
    fn initial_middle_rows_empty() {
        let g = new_game();
        for r in 2..6usize {
            for c in 0..8usize { assert_eq!(g.board[r][c], 0); }
        }
    }

    #[test]
    fn initial_turn_is_white() { assert_eq!(new_game().turn, 1); }

    #[test]
    fn initial_status_active() {
        assert_eq!(new_game().status, ChessStatus::Active);
    }

    #[test]
    fn initial_castling_rights_all_true() {
        let g = new_game();
        assert!(g.w_k && g.w_q && g.b_k && g.b_q);
    }

    #[test]
    fn initial_legal_move_count_20() {
        assert_eq!(new_game().legal_moves.len(), 20);
    }

    // ── Apply move ───────────────────────────────────────────────────────────

    #[test]
    fn e4_places_pawn_and_clears_source() {
        let g = new_game();
        let m = *g.legal_moves.iter().find(|m| m.r==6 && m.c==4 && m.tr==4).unwrap();
        let g2 = apply_move(&g, &m);
        assert_eq!(g2.board[4][4], P);
        assert_eq!(g2.board[6][4], 0);
    }

    #[test]
    fn e4_sets_en_passant_square() {
        let g = new_game();
        let m = *g.legal_moves.iter().find(|m| m.r==6 && m.c==4 && m.tr==4).unwrap();
        let g2 = apply_move(&g, &m);
        assert_eq!(g2.ep_r, 5);
        assert_eq!(g2.ep_c, 4);
    }

    #[test]
    fn single_push_no_en_passant() {
        let g = new_game();
        let m = *g.legal_moves.iter().find(|m| m.r==6 && m.c==4 && m.tr==5).unwrap();
        let g2 = apply_move(&g, &m);
        assert_eq!(g2.ep_r, -1);
    }

    #[test]
    fn turn_flips_after_move() {
        let g = new_game();
        let m = g.legal_moves[0];
        assert_eq!(apply_move(&g, &m).turn, -1);
    }

    #[test]
    fn full_move_increments_after_black() {
        let g = new_game();
        let m1 = *g.legal_moves.iter().find(|m| m.r==6&&m.c==4&&m.tr==4).unwrap();
        let g2 = apply_move(&g, &m1);
        let m2 = *g2.legal_moves.iter().find(|m| m.r==1&&m.c==4&&m.tr==3).unwrap();
        let g3 = apply_move(&g2, &m2);
        assert_eq!(g3.full_move, 2);
    }

    // ── Castling ─────────────────────────────────────────────────────────────

    #[test]
    fn white_kingside_castle_moves_king_and_rook() {
        let mut b = empty_board();
        b[7][4]=K; b[7][7]=R; b[0][4]=-K;
        let lm = get_legal_moves(&b, 1, true, false, false, false, -1, -1);
        let castle = *lm.iter().find(|m| m.castle==Some(b'K')).unwrap();
        let g = ChessGame { board: b, turn: 1, w_k: true, w_q: false, b_k: false, b_q: false,
            ep_r: -1, ep_c: -1, half_move: 0, full_move: 1,
            status: ChessStatus::Active, legal_moves: lm };
        let g2 = apply_move(&g, &castle);
        assert_eq!(g2.board[7][6], K);
        assert_eq!(g2.board[7][5], R);
        assert_eq!(g2.board[7][7], 0);
    }

    #[test]
    fn white_queenside_castle_moves_king_and_rook() {
        let mut b = empty_board();
        b[7][4]=K; b[7][0]=R; b[0][4]=-K;
        let lm = get_legal_moves(&b, 1, false, true, false, false, -1, -1);
        let castle = *lm.iter().find(|m| m.castle==Some(b'Q')).unwrap();
        let g = ChessGame { board: b, turn: 1, w_k: false, w_q: true, b_k: false, b_q: false,
            ep_r: -1, ep_c: -1, half_move: 0, full_move: 1,
            status: ChessStatus::Active, legal_moves: lm };
        let g2 = apply_move(&g, &castle);
        assert_eq!(g2.board[7][2], K);
        assert_eq!(g2.board[7][3], R);
    }

    // ── Promotion ────────────────────────────────────────────────────────────

    #[test]
    fn pawn_promotion_produces_queen_option() {
        let mut b = empty_board();
        b[1][0]=P; b[7][4]=K; b[0][4]=-K;
        let lm = get_legal_moves(&b, 1, false, false, false, false, -1, -1);
        let promos: std::collections::HashSet<i8> =
            lm.iter().filter_map(|m| m.promo).collect();
        assert!(promos.contains(&Q));
        assert!(promos.contains(&R));
        assert!(promos.contains(&B));
        assert!(promos.contains(&N));
    }

    #[test]
    fn promotion_to_queen_places_queen() {
        let mut b = empty_board();
        b[1][0]=P; b[7][4]=K; b[0][4]=-K;
        let lm = get_legal_moves(&b, 1, false, false, false, false, -1, -1);
        let promo = *lm.iter().find(|m| m.promo==Some(Q)).unwrap();
        let g = ChessGame { board: b, turn: 1, w_k: false, w_q: false, b_k: false, b_q: false,
            ep_r: -1, ep_c: -1, half_move: 0, full_move: 1,
            status: ChessStatus::Active, legal_moves: lm };
        let g2 = apply_move(&g, &promo);
        assert_eq!(g2.board[0][0], Q);
    }

    // ── Checkmate ────────────────────────────────────────────────────────────

    #[test]
    fn scholars_mate_is_checkmate() {
        let mut g = new_game();
        let moves = [(6,4,4,4),(1,4,3,4),(7,5,4,2),(0,1,2,2),
                     (7,3,3,7),(0,6,2,5),(3,7,1,5u8)];
        for (r,c,tr,tc) in moves {
            let m = *g.legal_moves.iter()
                .find(|m| m.r==r&&m.c==c&&m.tr==tr&&m.tc==tc).unwrap();
            g = apply_move(&g, &m);
        }
        assert_eq!(g.status, ChessStatus::Checkmate);
        assert!(g.legal_moves.is_empty());
    }

    // ── Stalemate ────────────────────────────────────────────────────────────

    #[test]
    fn stalemate_position() {
        let mut b = empty_board();
        b[0][0]=-K; b[2][1]=Q; b[1][2]=K;
        let lm = get_legal_moves(&b, -1, false, false, false, false, -1, -1);
        let g = ChessGame { board: b, turn: -1, w_k: false, w_q: false, b_k: false, b_q: false,
            ep_r: -1, ep_c: -1, half_move: 0, full_move: 1,
            status: ChessStatus::Stalemate, legal_moves: lm };
        assert_eq!(g.status, ChessStatus::Stalemate);
        assert!(g.legal_moves.is_empty());
    }

    // ── AI ───────────────────────────────────────────────────────────────────

    #[test]
    fn ai_returns_legal_move_from_start() {
        let g = new_game();
        let m = get_ai_move(&g).unwrap();
        assert!(g.legal_moves.contains(&m));
    }

    #[test]
    fn ai_returns_none_when_no_moves() {
        let mut b = empty_board();
        b[0][0]=-K; b[2][1]=Q; b[1][2]=K;
        let lm = get_legal_moves(&b, -1, false, false, false, false, -1, -1);
        let g = ChessGame { board: b, turn: -1, w_k: false, w_q: false, b_k: false, b_q: false,
            ep_r: -1, ep_c: -1, half_move: 0, full_move: 1,
            status: ChessStatus::Stalemate, legal_moves: lm };
        assert!(get_ai_move(&g).is_none());
    }

    // ── En passant ───────────────────────────────────────────────────────────

    #[test]
    fn en_passant_move_exists_when_eligible() {
        let mut b = empty_board();
        b[3][4]=P; b[3][5]=-P; b[7][4]=K; b[0][4]=-K;
        let lm = get_legal_moves(&b, 1, false, false, false, false, 2, 5);
        let ep = lm.iter().find(|m| m.ep);
        assert!(ep.is_some());
    }

    #[test]
    fn en_passant_capture_removes_captured_pawn() {
        let mut b = empty_board();
        b[3][4]=P; b[3][5]=-P; b[7][4]=K; b[0][4]=-K;
        let lm = get_legal_moves(&b, 1, false, false, false, false, 2, 5);
        let ep = *lm.iter().find(|m| m.ep).unwrap();
        let g = ChessGame { board: b, turn: 1, w_k: false, w_q: false, b_k: false, b_q: false,
            ep_r: 2, ep_c: 5, half_move: 0, full_move: 1,
            status: ChessStatus::Active, legal_moves: lm };
        let g2 = apply_move(&g, &ep);
        assert_eq!(g2.board[2][5], P);
        assert_eq!(g2.board[3][5], 0);
    }
}
