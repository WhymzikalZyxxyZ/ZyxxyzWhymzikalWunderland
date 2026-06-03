package xyz.zyxwonderland.shared.chess;

import java.util.List;

public final class ChessGame {
    public final int[][] board;
    public final int turn;
    public final boolean wK, wQ, bK, bQ;
    public final int epR, epC;
    public final int halfMove, fullMove;
    public final ChessStatus status;
    public final List<ChessMove> legalMoves;

    public ChessGame(int[][] board, int turn,
                     boolean wK, boolean wQ, boolean bK, boolean bQ,
                     int epR, int epC, int halfMove, int fullMove,
                     ChessStatus status, List<ChessMove> legalMoves) {
        this.board = board; this.turn = turn;
        this.wK = wK; this.wQ = wQ; this.bK = bK; this.bQ = bQ;
        this.epR = epR; this.epC = epC;
        this.halfMove = halfMove; this.fullMove = fullMove;
        this.status = status; this.legalMoves = legalMoves;
    }

    public boolean hasEnPassant() { return epR >= 0; }
}
