package xyz.zyxwonderland.shared.chess;

import org.junit.jupiter.api.Test;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ChessEngineTest {

    private static final int P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;

    // Build a ChessGame from a raw board, mirroring the helper used in the
    // Python/Dart test suites: compute legal moves and infer check status by
    // probing whether the opponent could capture the king.
    private static ChessGame makeGame(int[][] board, int turn,
            boolean wK, boolean wQ, boolean bK, boolean bQ, int epR, int epC) {
        List<ChessMove> legal = ChessEngine.getLegalMoves(board, turn, wK, wQ, bK, bQ, epR, epC);
        boolean inCheck = ChessEngine.isInCheck(board, turn);
        ChessStatus status = legal.isEmpty()
                ? (inCheck ? ChessStatus.CHECKMATE : ChessStatus.STALEMATE)
                : (inCheck ? ChessStatus.CHECK : ChessStatus.ACTIVE);
        return new ChessGame(board, turn, wK, wQ, bK, bQ, epR, epC, 0, 1, status, legal);
    }

    private static int[][] emptyBoard() {
        return new int[8][8];
    }

    // ── Board setup ─────────────────────────────────────────────────────────

    @Test void initialBoardCornersAreRooks() {
        ChessGame g = ChessEngine.newGame();
        assertEquals(-R, g.board[0][0]);
        assertEquals(-R, g.board[0][7]);
        assertEquals(R, g.board[7][0]);
        assertEquals(R, g.board[7][7]);
    }

    @Test void initialBoardKings() {
        ChessGame g = ChessEngine.newGame();
        assertEquals(-K, g.board[0][4]);
        assertEquals(K, g.board[7][4]);
    }

    @Test void whiteToMoveFirst() {
        assertEquals(1, ChessEngine.newGame().turn);
    }

    @Test void initialStatusIsActive() {
        assertEquals(ChessStatus.ACTIVE, ChessEngine.newGame().status);
    }

    @Test void initialLegalMoveCountIs20() {
        assertEquals(20, ChessEngine.newGame().legalMoves.size());
    }

    // ── Apply move ──────────────────────────────────────────────────────────

    @Test void e4PlacesPawnAndClearsSource() {
        ChessGame g = ChessEngine.newGame();
        ChessMove m = g.legalMoves.stream().filter(mv -> mv.r == 6 && mv.c == 4 && mv.tr == 4).findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, m);
        assertEquals(P, g2.board[4][4]);
        assertEquals(0, g2.board[6][4]);
    }

    @Test void e4SetsEnPassantSquare() {
        ChessGame g = ChessEngine.newGame();
        ChessMove m = g.legalMoves.stream().filter(mv -> mv.r == 6 && mv.c == 4 && mv.tr == 4).findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, m);
        assertEquals(5, g2.epR);
        assertEquals(4, g2.epC);
    }

    @Test void turnFlipsAfterMove() {
        ChessGame g = ChessEngine.newGame();
        assertEquals(-1, ChessEngine.applyMove(g, g.legalMoves.get(0)).turn);
    }

    @Test void fullMoveIncrementsAfterBlackMoves() {
        ChessGame g = ChessEngine.newGame();
        g = ChessEngine.applyMove(g, g.legalMoves.stream().filter(mv -> mv.r == 6 && mv.c == 4 && mv.tr == 4).findFirst().get());
        g = ChessEngine.applyMove(g, g.legalMoves.stream().filter(mv -> mv.r == 1 && mv.c == 4 && mv.tr == 3).findFirst().get());
        assertEquals(2, g.fullMove);
    }

    @Test void halfMoveResetsOnPawnMove() {
        ChessGame g = ChessEngine.newGame();
        assertEquals(0, ChessEngine.applyMove(g, g.legalMoves.get(0)).halfMove);
    }

    // Regression: applyMove computed the capture check against the already-
    // mutated post-move board, so the destination square was never empty and
    // halfMove silently reset to 0 on every move — breaking the fifty-move-
    // rule clock. See commit history for details.
    @Test void halfMoveIncrementsOnNonPawnNonCapture() {
        ChessGame g = ChessEngine.newGame();
        ChessMove m = g.legalMoves.stream().filter(mv -> mv.r == 7 && mv.c == 1).findFirst().get(); // Nb1
        ChessGame g2 = ChessEngine.applyMove(g, m);
        assertEquals(1, g2.halfMove);
    }

    // ── Castling ────────────────────────────────────────────────────────────

    @Test void whiteKingsideCastleMovesKingAndRook() {
        int[][] b = emptyBoard();
        b[7][4] = K; b[7][7] = R; b[0][4] = -K;
        ChessGame g = makeGame(b, 1, true, false, false, false, -1, -1);
        ChessMove castle = g.legalMoves.stream().filter(m -> m.castle != null && m.castle == 'K').findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, castle);
        assertEquals(K, g2.board[7][6]);
        assertEquals(R, g2.board[7][5]);
        assertEquals(0, g2.board[7][7]);
    }

    @Test void whiteQueensideCastleMovesKingAndRook() {
        int[][] b = emptyBoard();
        b[7][4] = K; b[7][0] = R; b[0][4] = -K;
        ChessGame g = makeGame(b, 1, false, true, false, false, -1, -1);
        ChessMove castle = g.legalMoves.stream().filter(m -> m.castle != null && m.castle == 'Q').findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, castle);
        assertEquals(K, g2.board[7][2]);
        assertEquals(R, g2.board[7][3]);
    }

    @Test void blackKingsideCastleMovesKingAndRook() {
        int[][] b = emptyBoard();
        b[0][4] = -K; b[0][7] = -R; b[7][4] = K;
        ChessGame g = makeGame(b, -1, false, false, true, false, -1, -1);
        ChessMove castle = g.legalMoves.stream().filter(m -> m.castle != null && m.castle == 'k').findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, castle);
        assertEquals(-K, g2.board[0][6]);
        assertEquals(-R, g2.board[0][5]);
        assertEquals(0, g2.board[0][7]);
    }

    @Test void movingKingsideRookLosesWKCastleRight() {
        int[][] b = emptyBoard();
        b[7][4] = K; b[7][7] = R; b[0][4] = -K;
        ChessGame g = makeGame(b, 1, true, true, false, false, -1, -1);
        ChessMove rookMove = g.legalMoves.stream().filter(m -> m.r == 7 && m.c == 7 && m.castle == null).findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, rookMove);
        assertFalse(g2.wK);
        assertTrue(g2.wQ);
    }

    @Test void movingKingLosesAllCastleRights() {
        int[][] b = emptyBoard();
        b[7][4] = K; b[0][4] = -K;
        ChessGame g = makeGame(b, 1, true, true, false, false, -1, -1);
        ChessMove kingMove = g.legalMoves.stream().filter(m -> m.r == 7 && m.c == 4).findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, kingMove);
        assertFalse(g2.wK);
        assertFalse(g2.wQ);
    }

    // ── Promotion ───────────────────────────────────────────────────────────

    @Test void pawnOnRank1ProducesPromotionMoves() {
        int[][] b = emptyBoard();
        b[1][0] = P; b[7][4] = K; b[0][4] = -K;
        ChessGame g = makeGame(b, 1, false, false, false, false, -1, -1);
        long promoTypes = g.legalMoves.stream().filter(m -> m.promo != null).map(m -> m.promo).distinct().count();
        assertEquals(4, promoTypes);
    }

    @Test void promotionToQueenPlacesQueen() {
        int[][] b = emptyBoard();
        b[1][0] = P; b[7][4] = K; b[0][4] = -K;
        ChessGame g = makeGame(b, 1, false, false, false, false, -1, -1);
        ChessMove promo = g.legalMoves.stream().filter(m -> m.promo != null && m.promo == Q).findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, promo);
        assertEquals(Q, g2.board[0][0]);
    }

    // ── En passant ──────────────────────────────────────────────────────────

    @Test void enPassantCaptureRemovesCapturedPawn() {
        int[][] b = emptyBoard();
        b[7][7] = K; b[0][0] = -K; b[3][4] = P; b[3][3] = -P;
        ChessGame g = makeGame(b, 1, false, false, false, false, 2, 3);
        ChessMove epMove = g.legalMoves.stream().filter(m -> m.ep).findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, epMove);
        assertEquals(P, g2.board[2][3]);
        assertEquals(0, g2.board[3][3]);
        assertEquals(0, g2.board[3][4]);
    }

    // ── Piece moves ─────────────────────────────────────────────────────────

    @Test void rookCanMoveAndCapture() {
        int[][] b = emptyBoard();
        b[7][4] = K; b[0][4] = -K; b[4][0] = R; b[4][7] = -R;
        ChessGame g = makeGame(b, 1, false, false, false, false, -1, -1);
        assertTrue(g.legalMoves.stream().anyMatch(m -> m.r == 4 && m.c == 0 && m.tr == 4 && m.tc == 7));
    }

    @Test void bishopCanMoveDiagonally() {
        int[][] b = emptyBoard();
        b[7][4] = K; b[0][4] = -K; b[4][4] = B;
        ChessGame g = makeGame(b, 1, false, false, false, false, -1, -1);
        assertTrue(g.legalMoves.stream().anyMatch(m -> m.r == 4 && m.c == 4 && m.tr == 3 && m.tc == 3));
    }

    @Test void queenCombinesRookAndBishopMovement() {
        int[][] b = emptyBoard();
        b[7][4] = K; b[0][4] = -K; b[4][4] = Q;
        ChessGame g = makeGame(b, 1, false, false, false, false, -1, -1);
        assertTrue(g.legalMoves.stream().anyMatch(m -> m.r == 4 && m.c == 4 && m.tr == 4 && m.tc == 0));
        assertTrue(g.legalMoves.stream().anyMatch(m -> m.r == 4 && m.c == 4 && m.tr == 0 && m.tc == 0));
    }

    // ── Check / checkmate / stalemate ──────────────────────────────────────

    @Test void scholarsMateIsCheckmate() {
        ChessGame g = ChessEngine.newGame();
        int[][] moves = {
            {6,4,4,4}, {1,4,3,4}, {7,5,4,2}, {0,1,2,2},
            {7,3,3,7}, {0,6,2,5}, {3,7,1,5},
        };
        for (int[] mv : moves) {
            ChessMove m = g.legalMoves.stream()
                    .filter(x -> x.r == mv[0] && x.c == mv[1] && x.tr == mv[2] && x.tc == mv[3])
                    .findFirst().get();
            g = ChessEngine.applyMove(g, m);
        }
        assertEquals(ChessStatus.CHECKMATE, g.status);
        assertTrue(g.legalMoves.isEmpty());
    }

    @Test void stalematePositionHasNoLegalMoves() {
        int[][] b = emptyBoard();
        b[0][0] = -K; b[2][1] = Q; b[1][2] = K;
        ChessGame g = makeGame(b, -1, false, false, false, false, -1, -1);
        assertEquals(ChessStatus.STALEMATE, g.status);
        assertTrue(g.legalMoves.isEmpty());
    }

    @Test void checkStatusIsReported() {
        int[][] b = emptyBoard();
        b[0][4] = -K; b[7][4] = K; b[1][4] = R;
        ChessGame g = makeGame(b, -1, false, false, false, false, -1, -1);
        assertEquals(ChessStatus.CHECK, g.status);
    }

    @Test void knightCheckIsDetected() {
        int[][] b = emptyBoard();
        b[0][4] = -K; b[7][4] = K; b[2][3] = N;
        ChessGame g = makeGame(b, -1, false, false, false, false, -1, -1);
        assertEquals(ChessStatus.CHECK, g.status);
    }

    // ── AI ──────────────────────────────────────────────────────────────────

    @Test void aiReturnsALegalMoveFromStartPosition() {
        ChessGame g = ChessEngine.newGame();
        ChessMove m = ChessEngine.getAIMove(g);
        assertNotNull(m);
        assertTrue(g.legalMoves.contains(m));
    }

    @Test void aiReturnsNullWhenNoMovesAvailable() {
        int[][] b = emptyBoard();
        b[0][0] = -K; b[2][1] = Q; b[1][2] = K;
        ChessGame g = makeGame(b, -1, false, false, false, false, -1, -1);
        assertNull(ChessEngine.getAIMove(g));
    }

    // ── Additional coverage ───────────────────────────────────────────────

    @Test void singlePushDoesNotSetEnPassant() {
        ChessGame g = ChessEngine.newGame();
        ChessMove m = g.legalMoves.stream().filter(mv -> mv.r == 6 && mv.c == 4 && mv.tr == 5).findFirst().get();
        assertEquals(-1, ChessEngine.applyMove(g, m).epR);
    }

    @Test void enPassantOnlyAvailableWhenEpSquareIsSet() {
        int[][] b = emptyBoard();
        b[7][7] = K; b[0][0] = -K; b[3][4] = P; b[3][3] = -P;
        ChessGame g = makeGame(b, 1, false, false, false, false, -1, -1);
        assertFalse(g.legalMoves.stream().anyMatch(m -> m.ep));
    }

    @Test void blackPawnPromotesOnRank8() {
        int[][] b = emptyBoard();
        b[6][0] = -P; b[0][4] = -K; b[7][4] = K;
        ChessGame g = makeGame(b, -1, false, false, false, false, -1, -1);
        long promoTypes = g.legalMoves.stream().filter(m -> m.promo != null).map(m -> m.promo).distinct().count();
        assertEquals(4, promoTypes);
    }

    @Test void blackQueensideCastleMovesKingAndRook() {
        int[][] b = emptyBoard();
        b[0][4] = -K; b[0][0] = -R; b[7][4] = K;
        ChessGame g = makeGame(b, -1, false, false, false, true, -1, -1);
        ChessMove castle = g.legalMoves.stream().filter(m -> m.castle != null && m.castle == 'q').findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, castle);
        assertEquals(-K, g2.board[0][2]);
        assertEquals(-R, g2.board[0][3]);
        assertEquals(0, g2.board[0][0]);
    }

    @Test void movingBlackKingsideRookLosesBKCastleRight() {
        int[][] b = emptyBoard();
        b[0][4] = -K; b[0][7] = -R; b[7][4] = K;
        ChessGame g = makeGame(b, -1, false, false, true, true, -1, -1);
        ChessMove rookMove = g.legalMoves.stream().filter(m -> m.r == 0 && m.c == 7 && m.castle == null).findFirst().get();
        ChessGame g2 = ChessEngine.applyMove(g, rookMove);
        assertFalse(g2.bK);
        assertTrue(g2.bQ);
    }

    @Test void bishopCanCaptureDiagonally() {
        int[][] b = emptyBoard();
        b[7][4] = K; b[0][4] = -K; b[4][4] = B; b[2][2] = -P;
        ChessGame g = makeGame(b, 1, false, false, false, false, -1, -1);
        assertTrue(g.legalMoves.stream().anyMatch(m -> m.r == 4 && m.c == 4 && m.tr == 2 && m.tc == 2));
    }

    @Test void pawnCheckIsDetected() {
        int[][] b = emptyBoard();
        b[0][4] = -K; b[7][4] = K; b[1][3] = P;
        ChessGame g = makeGame(b, -1, false, false, false, false, -1, -1);
        assertEquals(ChessStatus.CHECK, g.status);
    }

    @Test void diagonalQueenCheckIsDetected() {
        int[][] b = emptyBoard();
        b[0][4] = -K; b[7][4] = K; b[2][2] = Q;
        ChessGame g = makeGame(b, -1, false, false, false, false, -1, -1);
        assertEquals(ChessStatus.CHECK, g.status);
    }

    @Test void chessGameHasEnPassantReflectsEpR() {
        int[][] b = emptyBoard();
        b[7][7] = K; b[0][0] = -K;
        ChessGame withEp = makeGame(b, 1, false, false, false, false, 2, 3);
        ChessGame withoutEp = makeGame(b, 1, false, false, false, false, -1, -1);
        assertTrue(withEp.hasEnPassant());
        assertFalse(withoutEp.hasEnPassant());
    }

    @Test void chessMoveEqualsAndHashCodeMatchOnSameCoordinatesAndPromo() {
        ChessMove a = ChessMove.of(6, 4, 4, 4);
        ChessMove b = ChessMove.of(6, 4, 4, 4);
        assertEquals(a, b);
        assertEquals(a.hashCode(), b.hashCode());
    }

    @Test void chessMoveWithPromoSetsPromoField() {
        ChessMove m = ChessMove.of(1, 0, 0, 0).withPromo(Q);
        assertEquals(Integer.valueOf(Q), m.promo);
    }
}
