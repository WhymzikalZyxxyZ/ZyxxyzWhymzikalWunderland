package xyz.zyxwonderland.shared.chess

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ChessEngineTest {

    // ── Initial state ──────────────────────────────────────────────────────────

    @Test fun `newChessGame starts white to move`() {
        assertEquals(CH_WHITE, newChessGame().turn)
    }

    @Test fun `newChessGame board has correct piece counts`() {
        val board = newChessGame().board
        var whitePawns = 0; var blackPawns = 0
        for (r in 0..7) for (c in 0..7) {
            if (board[r][c] == CH_PAWN)  whitePawns++
            if (board[r][c] == -CH_PAWN) blackPawns++
        }
        assertEquals(8, whitePawns)
        assertEquals(8, blackPawns)
    }

    @Test fun `newChessGame all castling rights set`() {
        val c = newChessGame().castling
        assertTrue(c.wK); assertTrue(c.wQ); assertTrue(c.bK); assertTrue(c.bQ)
    }

    @Test fun `newChessGame has no en passant`() {
        assertNull(newChessGame().enPassant)
    }

    @Test fun `newChessGame status is ACTIVE`() {
        assertEquals(ChessStatus.ACTIVE, newChessGame().status)
    }

    // ── Legal moves ────────────────────────────────────────────────────────────

    @Test fun `white has 20 legal moves at start`() {
        assertEquals(20, getLegalMoves(newChessGame()).size)
    }

    @Test fun `pawn can advance two squares from starting row`() {
        val moves = getLegalMoves(newChessGame())
        val e2e4  = moves.any { it.r == 6 && it.c == 4 && it.tr == 4 && it.tc == 4 }
        assertTrue(e2e4)
    }

    @Test fun `knight moves are correct from starting position`() {
        val moves    = getLegalMoves(newChessGame())
        val knightMoves = moves.filter { it.r == 7 && it.c == 1 } // Nb1
        assertEquals(2, knightMoves.size)
    }

    // ── applyMove ─────────────────────────────────────────────────────────────

    @Test fun `applyMove e2-e4 sets en passant`() {
        val state = newChessGame()
        val move  = getLegalMoves(state).first { it.r == 6 && it.c == 4 && it.tr == 4 }
        val next  = applyMove(state, move)
        assertNotNull(next.enPassant)
        assertEquals(5, next.enPassant!!.r)
        assertEquals(4, next.enPassant!!.c)
    }

    @Test fun `applyMove flips turn`() {
        val state = newChessGame()
        val move  = getLegalMoves(state).first()
        assertEquals(CH_BLACK, applyMove(state, move).turn)
    }

    @Test fun `applyMove piece is moved on board`() {
        val state = newChessGame()
        val move  = getLegalMoves(state).first { it.r == 6 && it.c == 4 && it.tr == 4 }
        val next  = applyMove(state, move)
        assertEquals(0,        next.board[6][4])
        assertEquals(CH_PAWN,  next.board[4][4])
    }

    // ── isInCheck / isSquareAttacked ──────────────────────────────────────────

    @Test fun `white king is not in check at start`() {
        assertFalse(isInCheck(newChessGame().board, CH_WHITE))
    }

    @Test fun `black king is not in check at start`() {
        assertFalse(isInCheck(newChessGame().board, CH_BLACK))
    }

    @Test fun `isSquareAttacked detects rook attack`() {
        val board = Array(8) { IntArray(8) }
        board[0][0] = CH_ROOK  // white rook at a8
        assertTrue(isSquareAttacked(board, 0, 4, CH_WHITE))  // e8 attacked along rank
    }

    @Test fun `isSquareAttacked detects knight attack`() {
        val board = Array(8) { IntArray(8) }
        board[4][4] = CH_KNIGHT
        assertTrue(isSquareAttacked(board, 2, 3, CH_WHITE))
    }

    @Test fun `isSquareAttacked detects pawn attack`() {
        val board = Array(8) { IntArray(8) }
        board[5][4] = CH_PAWN  // white pawn at e3; attacks d2 and f2
        assertTrue(isSquareAttacked(board, 4, 3, CH_WHITE))
        assertTrue(isSquareAttacked(board, 4, 5, CH_WHITE))
    }

    // ── findKing ──────────────────────────────────────────────────────────────

    @Test fun `findKing locates white king at e1`() {
        val k = findKing(newChessGame().board, CH_WHITE)
        assertNotNull(k)
        assertEquals(7, k.r); assertEquals(4, k.c)
    }

    @Test fun `findKing locates black king at e8`() {
        val k = findKing(newChessGame().board, CH_BLACK)
        assertNotNull(k)
        assertEquals(0, k.r); assertEquals(4, k.c)
    }

    // ── updateStatus ──────────────────────────────────────────────────────────

    @Test fun `updateStatus returns legal moves`() {
        val updated = updateStatus(newChessGame())
        assertEquals(20, updated.legalMoves.size)
        assertEquals(ChessStatus.ACTIVE, updated.status)
    }

    @Test fun `updateStatus detects checkmate in scholar mate`() {
        // Set up a board position that is checkmate for black (Scholar's mate)
        var state = newChessGame()
        // e4
        state = applyMove(state, getLegalMoves(state).first { it.r==6 && it.c==4 && it.tr==4 })
        // e5
        state = applyMove(state, getLegalMoves(state).first { it.r==1 && it.c==4 && it.tr==3 })
        // Bc4
        state = applyMove(state, getLegalMoves(state).first { it.r==7 && it.c==5 && it.tr==4 && it.tc==2 })
        // Nc6
        state = applyMove(state, getLegalMoves(state).first { it.r==0 && it.c==1 && it.tr==2 && it.tc==2 })
        // Qh5
        state = applyMove(state, getLegalMoves(state).first { it.r==7 && it.c==3 && it.tr==3 && it.tc==7 })
        // Nf6?? (blunder)
        state = applyMove(state, getLegalMoves(state).first { it.r==0 && it.c==6 && it.tr==2 && it.tc==5 })
        // Qxf7#
        state = applyMove(state, getLegalMoves(state).first { it.r==3 && it.c==7 && it.tr==1 && it.tc==5 })
        val final = updateStatus(state)
        assertEquals(ChessStatus.CHECKMATE, final.status)
    }

    // ── evaluateBoard ─────────────────────────────────────────────────────────

    @Test fun `evaluateBoard returns 0 for starting position`() {
        assertEquals(0, evaluateBoard(newChessGame().board))
    }

    // ── getChessAIMove ────────────────────────────────────────────────────────

    @Test fun `getChessAIMove returns a legal move`() {
        val state  = updateStatus(newChessGame())
        val aiMove = getChessAIMove(state, difficulty = 2)
        assertNotNull(aiMove)
        assertTrue(state.legalMoves.contains(aiMove))
    }

    @Test fun `getChessAIMove returns null when no moves`() {
        val state = newChessGame().copy(
            board = Array(8) { IntArray(8) },
            legalMoves = emptyList(),
        )
        assertNull(getChessAIMove(state, 1))
    }

    @Test fun `castling rights revoked when king moves`() {
        val state = newChessGame()
        // Manually clear squares so king can move
        val board = state.copyBoard()
        board[7][5] = 0; board[7][6] = 0  // clear f1 and g1
        val s2 = state.copy(board = board)
        val kMove = getLegalMoves(s2).firstOrNull { it.r == 7 && it.c == 4 }
        assertNotNull(kMove)
        val next = applyMove(s2, kMove!!)
        assertFalse(next.castling.wK)
        assertFalse(next.castling.wQ)
    }
}
