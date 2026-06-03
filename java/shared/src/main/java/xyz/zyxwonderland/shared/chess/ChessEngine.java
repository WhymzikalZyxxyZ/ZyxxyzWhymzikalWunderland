package xyz.zyxwonderland.shared.chess;

import java.util.ArrayList;
import java.util.List;

public final class ChessEngine {

    private ChessEngine() {}

    // ── Piece constants ──────────────────────────────────────────────
    private static final int P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;

    // ── Piece-square tables (white perspective; black mirrors) ───────
    private static final int[] PST_P = {
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0
    };
    private static final int[] PST_N = {
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50
    };
    private static final int[] PST_B = {
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20
    };
    private static final int[] PST_R = {
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         0,  0,  0,  5,  5,  0,  0,  0
    };
    private static final int[] PST_Q = {
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20
    };
    private static final int[] PST_K = {
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20
    };

    private static final int[] PIECE_VALUE = { 0, 100, 320, 330, 500, 900, 20000 };

    // ── Public API ───────────────────────────────────────────────────

    public static ChessGame newGame() {
        int[][] board = new int[8][8];
        int[] back = { R, N, B, Q, K, B, N, R };
        for (int c = 0; c < 8; c++) {
            board[0][c] = -back[c];
            board[1][c] = -P;
            board[6][c] = P;
            board[7][c] = back[c];
        }
        List<ChessMove> moves = getLegalMoves(board, 1, true, true, true, true, -1, -1);
        return new ChessGame(board, 1, true, true, true, true, -1, -1, 0, 1, ChessStatus.ACTIVE, moves);
    }

    public static ChessGame applyMove(ChessGame g, ChessMove m) {
        int[][] board = copyBoard(g.board);
        boolean wK = g.wK, wQ = g.wQ, bK = g.bK, bQ = g.bQ;
        int epR = -1, epC = -1;
        int piece = board[m.r][m.c];

        board[m.tr][m.tc] = (m.promo != null) ? m.promo : piece;
        board[m.r][m.c] = 0;

        if (m.ep) board[m.r][m.tc] = 0;
        if (m.castle != null) {
            if (m.castle == 'K') { board[7][5] = R;  board[7][7] = 0; }
            if (m.castle == 'Q') { board[7][3] = R;  board[7][0] = 0; }
            if (m.castle == 'k') { board[0][5] = -R; board[0][7] = 0; }
            if (m.castle == 'q') { board[0][3] = -R; board[0][0] = 0; }
        }
        if (m.doublePush) { epR = (m.r + m.tr) / 2; epC = m.c; }

        int abs = Math.abs(piece);
        if (abs == K) { if (g.turn == 1) { wK = false; wQ = false; } else { bK = false; bQ = false; } }
        if (abs == R) {
            if (m.r == 7 && m.c == 7) wK = false;
            if (m.r == 7 && m.c == 0) wQ = false;
            if (m.r == 0 && m.c == 7) bK = false;
            if (m.r == 0 && m.c == 0) bQ = false;
        }

        int half = (abs == P || board[m.tr][m.tc] != 0) ? 0 : g.halfMove + 1;
        int full = g.fullMove + (g.turn == -1 ? 1 : 0);
        int next = -g.turn;

        List<ChessMove> legal = getLegalMoves(board, next, wK, wQ, bK, bQ, epR, epC);
        ChessStatus status = updateStatus(board, next, legal);
        return new ChessGame(board, next, wK, wQ, bK, bQ, epR, epC, half, full, status, legal);
    }

    public static ChessMove getAIMove(ChessGame g) {
        if (g.legalMoves.isEmpty()) return null;
        int[] depths = { 0, 1, 1, 2, 2, 2, 3, 3, 4, 4 };
        int depth = depths[Math.min(g.legalMoves.size(), depths.length - 1)];
        int[] best = { Integer.MIN_VALUE };
        ChessMove[] bestMove = { g.legalMoves.get(0) };
        for (ChessMove m : g.legalMoves) {
            ChessGame next = applyMove(g, m);
            int score = -minimax(next, depth, Integer.MIN_VALUE + 1, Integer.MAX_VALUE, -g.turn);
            if (score > best[0]) { best[0] = score; bestMove[0] = m; }
        }
        return bestMove[0];
    }

    // ── Move generation ──────────────────────────────────────────────

    public static List<ChessMove> getLegalMoves(int[][] board, int turn,
            boolean wK, boolean wQ, boolean bK, boolean bQ, int epR, int epC) {
        List<ChessMove> pseudo = new ArrayList<>();
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
                if (board[r][c] != 0 && Integer.signum(board[r][c]) == turn)
                    addPseudo(pseudo, board, r, c, turn, wK, wQ, bK, bQ, epR, epC);

        List<ChessMove> legal = new ArrayList<>();
        for (ChessMove m : pseudo) {
            int[][] nb = copyBoard(board);
            applyRaw(nb, m);
            if (!isInCheck(nb, turn)) legal.add(m);
        }
        return legal;
    }

    private static void addPseudo(List<ChessMove> moves, int[][] b, int r, int c, int turn,
            boolean wK, boolean wQ, boolean bK, boolean bQ, int epR, int epC) {
        int piece = Math.abs(b[r][c]);
        switch (piece) {
            case P -> addPawnMoves(moves, b, r, c, turn, epR, epC);
            case N -> addKnightMoves(moves, b, r, c, turn);
            case B -> addSlider(moves, b, r, c, turn, new int[][]{{1,1},{1,-1},{-1,1},{-1,-1}});
            case R -> addSlider(moves, b, r, c, turn, new int[][]{{1,0},{-1,0},{0,1},{0,-1}});
            case Q -> {
                addSlider(moves, b, r, c, turn, new int[][]{{1,1},{1,-1},{-1,1},{-1,-1}});
                addSlider(moves, b, r, c, turn, new int[][]{{1,0},{-1,0},{0,1},{0,-1}});
            }
            case K -> addKingMoves(moves, b, r, c, turn, wK, wQ, bK, bQ);
        }
    }

    private static void addPawnMoves(List<ChessMove> m, int[][] b, int r, int c, int turn, int epR, int epC) {
        int dir = -turn, start = turn == 1 ? 6 : 1, promo = turn == 1 ? 0 : 7;
        if (inBounds(r + dir, c) && b[r + dir][c] == 0) {
            if (r + dir == promo) for (int p : new int[]{Q * turn, R * turn, B * turn, N * turn})
                m.add(new ChessMove(r, c, r + dir, c, p, null, false, false));
            else {
                m.add(ChessMove.of(r, c, r + dir, c));
                if (r == start && b[r + 2 * dir][c] == 0)
                    m.add(new ChessMove(r, c, r + 2 * dir, c, null, null, false, true));
            }
        }
        for (int dc : new int[]{-1, 1}) {
            int tr = r + dir, tc = c + dc;
            if (!inBounds(tr, tc)) continue;
            boolean capture = b[tr][tc] != 0 && Integer.signum(b[tr][tc]) != turn;
            boolean epCap = tr == epR && tc == epC;
            if (capture || epCap) {
                if (tr == promo) for (int p : new int[]{Q * turn, R * turn, B * turn, N * turn})
                    m.add(new ChessMove(r, c, tr, tc, p, null, epCap, false));
                else m.add(new ChessMove(r, c, tr, tc, null, null, epCap, false));
            }
        }
    }

    private static void addKnightMoves(List<ChessMove> m, int[][] b, int r, int c, int turn) {
        for (int[] d : new int[][]{{-2,-1},{-2,1},{-1,-2},{-1,2},{1,-2},{1,2},{2,-1},{2,1}}) {
            int tr = r + d[0], tc = c + d[1];
            if (inBounds(tr, tc) && Integer.signum(b[tr][tc]) != turn)
                m.add(ChessMove.of(r, c, tr, tc));
        }
    }

    private static void addSlider(List<ChessMove> m, int[][] b, int r, int c, int turn, int[][] dirs) {
        for (int[] d : dirs) {
            int tr = r + d[0], tc = c + d[1];
            while (inBounds(tr, tc)) {
                if (b[tr][tc] != 0) {
                    if (Integer.signum(b[tr][tc]) != turn) m.add(ChessMove.of(r, c, tr, tc));
                    break;
                }
                m.add(ChessMove.of(r, c, tr, tc));
                tr += d[0]; tc += d[1];
            }
        }
    }

    private static void addKingMoves(List<ChessMove> m, int[][] b, int r, int c, int turn,
            boolean wK, boolean wQ, boolean bK, boolean bQ) {
        for (int dr = -1; dr <= 1; dr++) for (int dc = -1; dc <= 1; dc++) {
            if (dr == 0 && dc == 0) continue;
            int tr = r + dr, tc = c + dc;
            if (inBounds(tr, tc) && Integer.signum(b[tr][tc]) != turn)
                m.add(ChessMove.of(r, c, tr, tc));
        }
        if (turn == 1 && r == 7 && c == 4) {
            if (wK && b[7][5] == 0 && b[7][6] == 0 && !isAttacked(b, 7, 4, -1) && !isAttacked(b, 7, 5, -1))
                m.add(new ChessMove(7, 4, 7, 6, null, 'K', false, false));
            if (wQ && b[7][3] == 0 && b[7][2] == 0 && b[7][1] == 0 && !isAttacked(b, 7, 4, -1) && !isAttacked(b, 7, 3, -1))
                m.add(new ChessMove(7, 4, 7, 2, null, 'Q', false, false));
        }
        if (turn == -1 && r == 0 && c == 4) {
            if (bK && b[0][5] == 0 && b[0][6] == 0 && !isAttacked(b, 0, 4, 1) && !isAttacked(b, 0, 5, 1))
                m.add(new ChessMove(0, 4, 0, 6, null, 'k', false, false));
            if (bQ && b[0][3] == 0 && b[0][2] == 0 && b[0][1] == 0 && !isAttacked(b, 0, 4, 1) && !isAttacked(b, 0, 3, 1))
                m.add(new ChessMove(0, 4, 0, 2, null, 'q', false, false));
        }
    }

    // ── Check detection ──────────────────────────────────────────────

    public static boolean isInCheck(int[][] b, int turn) {
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
                if (b[r][c] == K * turn) return isAttacked(b, r, c, -turn);
        return false;
    }

    public static boolean isAttacked(int[][] b, int r, int c, int by) {
        for (int[] d : new int[][]{{1,0},{-1,0},{0,1},{0,-1}}) {
            int tr = r + d[0], tc = c + d[1];
            while (inBounds(tr, tc)) {
                int p = b[tr][tc]; if (p == 0) { tr += d[0]; tc += d[1]; continue; }
                if (p == R * by || p == Q * by) return true; break;
            }
        }
        for (int[] d : new int[][]{{1,1},{1,-1},{-1,1},{-1,-1}}) {
            int tr = r + d[0], tc = c + d[1];
            while (inBounds(tr, tc)) {
                int p = b[tr][tc]; if (p == 0) { tr += d[0]; tc += d[1]; continue; }
                if (p == B * by || p == Q * by) return true; break;
            }
        }
        for (int[] d : new int[][]{{-2,-1},{-2,1},{-1,-2},{-1,2},{1,-2},{1,2},{2,-1},{2,1}})
            if (inBounds(r+d[0],c+d[1]) && b[r+d[0]][c+d[1]] == N * by) return true;
        int pd = by == 1 ? 1 : -1;
        if (inBounds(r+pd,c-1) && b[r+pd][c-1] == P * by) return true;
        if (inBounds(r+pd,c+1) && b[r+pd][c+1] == P * by) return true;
        for (int dr = -1; dr <= 1; dr++) for (int dc = -1; dc <= 1; dc++)
            if ((dr!=0||dc!=0) && inBounds(r+dr,c+dc) && b[r+dr][c+dc] == K * by) return true;
        return false;
    }

    // ── Evaluation ───────────────────────────────────────────────────

    private static int evaluate(int[][] b) {
        int score = 0;
        for (int r = 0; r < 8; r++) for (int c = 0; c < 8; c++) {
            int p = b[r][c]; if (p == 0) continue;
            int abs = Math.abs(p), sign = Integer.signum(p);
            int idx = sign == 1 ? r * 8 + c : (7 - r) * 8 + c;
            int pst = switch (abs) {
                case P -> PST_P[idx]; case N -> PST_N[idx]; case B -> PST_B[idx];
                case R -> PST_R[idx]; case Q -> PST_Q[idx]; case K -> PST_K[idx];
                default -> 0;
            };
            score += sign * (PIECE_VALUE[abs] + pst);
        }
        return score;
    }

    private static int minimax(ChessGame g, int depth, int alpha, int beta, int maximising) {
        if (depth == 0 || g.status == ChessStatus.CHECKMATE || g.status == ChessStatus.STALEMATE)
            return evaluate(g.board) * maximising;
        List<ChessMove> moves = ordered(g);
        int best = Integer.MIN_VALUE + 1;
        for (ChessMove m : moves) {
            int score = -minimax(applyMove(g, m), depth - 1, -beta, -alpha, -maximising);
            best = Math.max(best, score);
            alpha = Math.max(alpha, score);
            if (alpha >= beta) break;
        }
        return best;
    }

    private static List<ChessMove> ordered(ChessGame g) {
        List<ChessMove> moves = new ArrayList<>(g.legalMoves);
        moves.sort((a, b) -> mvvLva(g.board, b) - mvvLva(g.board, a));
        return moves;
    }

    private static int mvvLva(int[][] b, ChessMove m) {
        int victim = Math.abs(b[m.tr][m.tc]), attacker = Math.abs(b[m.r][m.c]);
        return victim > 0 ? PIECE_VALUE[victim] * 10 - PIECE_VALUE[attacker] : 0;
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private static ChessStatus updateStatus(int[][] b, int turn, List<ChessMove> legal) {
        if (legal.isEmpty()) return isInCheck(b, turn) ? ChessStatus.CHECKMATE : ChessStatus.STALEMATE;
        return isInCheck(b, turn) ? ChessStatus.CHECK : ChessStatus.ACTIVE;
    }

    private static void applyRaw(int[][] b, ChessMove m) {
        int piece = b[m.r][m.c];
        b[m.tr][m.tc] = (m.promo != null) ? m.promo : piece;
        b[m.r][m.c] = 0;
        if (m.ep) b[m.r][m.tc] = 0;
        if (m.castle != null) switch (m.castle) {
            case 'K' -> { b[7][5] = R;  b[7][7] = 0; }
            case 'Q' -> { b[7][3] = R;  b[7][0] = 0; }
            case 'k' -> { b[0][5] = -R; b[0][7] = 0; }
            case 'q' -> { b[0][3] = -R; b[0][0] = 0; }
        }
    }

    private static int[][] copyBoard(int[][] b) {
        int[][] n = new int[8][8];
        for (int i = 0; i < 8; i++) n[i] = b[i].clone();
        return n;
    }

    private static boolean inBounds(int r, int c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }
}
