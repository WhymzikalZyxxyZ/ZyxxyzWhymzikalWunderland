package xyz.zyxwonderland.shared.chess

import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

// Material values in centipawns indexed by piece type
private val MATERIAL = intArrayOf(0, 100, 320, 330, 500, 900, 20000)

// Piece-square tables (white's perspective, row 0 = rank 8, row 7 = rank 1)
private val PST: Map<Int, Array<IntArray>> = mapOf(
    CH_PAWN to arrayOf(
        intArrayOf(0, 0, 0, 0, 0, 0, 0, 0),
        intArrayOf(50, 50, 50, 50, 50, 50, 50, 50),
        intArrayOf(10, 10, 20, 30, 30, 20, 10, 10),
        intArrayOf(5, 5, 10, 25, 25, 10, 5, 5),
        intArrayOf(0, 0, 0, 20, 20, 0, 0, 0),
        intArrayOf(5, -5, -10, 0, 0, -10, -5, 5),
        intArrayOf(5, 10, 10, -20, -20, 10, 10, 5),
        intArrayOf(0, 0, 0, 0, 0, 0, 0, 0),
    ),
    CH_KNIGHT to arrayOf(
        intArrayOf(-50, -40, -30, -30, -30, -30, -40, -50),
        intArrayOf(-40, -20, 0, 0, 0, 0, -20, -40),
        intArrayOf(-30, 0, 10, 15, 15, 10, 0, -30),
        intArrayOf(-30, 5, 15, 20, 20, 15, 5, -30),
        intArrayOf(-30, 0, 15, 20, 20, 15, 0, -30),
        intArrayOf(-30, 5, 10, 15, 15, 10, 5, -30),
        intArrayOf(-40, -20, 0, 5, 5, 0, -20, -40),
        intArrayOf(-50, -40, -30, -30, -30, -30, -40, -50),
    ),
    CH_BISHOP to arrayOf(
        intArrayOf(-20, -10, -10, -10, -10, -10, -10, -20),
        intArrayOf(-10, 0, 0, 0, 0, 0, 0, -10),
        intArrayOf(-10, 0, 5, 10, 10, 5, 0, -10),
        intArrayOf(-10, 5, 5, 10, 10, 5, 5, -10),
        intArrayOf(-10, 0, 10, 10, 10, 10, 0, -10),
        intArrayOf(-10, 10, 10, 10, 10, 10, 10, -10),
        intArrayOf(-10, 5, 0, 0, 0, 0, 5, -10),
        intArrayOf(-20, -10, -10, -10, -10, -10, -10, -20),
    ),
    CH_ROOK to arrayOf(
        intArrayOf(0, 0, 0, 0, 0, 0, 0, 0),
        intArrayOf(5, 10, 10, 10, 10, 10, 10, 5),
        intArrayOf(-5, 0, 0, 0, 0, 0, 0, -5),
        intArrayOf(-5, 0, 0, 0, 0, 0, 0, -5),
        intArrayOf(-5, 0, 0, 0, 0, 0, 0, -5),
        intArrayOf(-5, 0, 0, 0, 0, 0, 0, -5),
        intArrayOf(-5, 0, 0, 0, 0, 0, 0, -5),
        intArrayOf(0, 0, 0, 5, 5, 0, 0, 0),
    ),
    CH_QUEEN to arrayOf(
        intArrayOf(-20, -10, -10, -5, -5, -10, -10, -20),
        intArrayOf(-10, 0, 0, 0, 0, 0, 0, -10),
        intArrayOf(-10, 0, 5, 5, 5, 5, 0, -10),
        intArrayOf(-5, 0, 5, 5, 5, 5, 0, -5),
        intArrayOf(0, 0, 5, 5, 5, 5, 0, -5),
        intArrayOf(-10, 5, 5, 5, 5, 5, 0, -10),
        intArrayOf(-10, 0, 5, 0, 0, 0, 0, -10),
        intArrayOf(-20, -10, -10, -5, -5, -10, -10, -20),
    ),
    CH_KING to arrayOf(
        intArrayOf(-30, -40, -40, -50, -50, -40, -40, -30),
        intArrayOf(-30, -40, -40, -50, -50, -40, -40, -30),
        intArrayOf(-30, -40, -40, -50, -50, -40, -40, -30),
        intArrayOf(-30, -40, -40, -50, -50, -40, -40, -30),
        intArrayOf(-20, -30, -30, -40, -40, -30, -30, -20),
        intArrayOf(-10, -20, -20, -20, -20, -20, -20, -10),
        intArrayOf(20, 20, 0, 0, 0, 0, 20, 20),
        intArrayOf(20, 30, 10, 0, 0, 10, 30, 20),
    ),
)

// ── Helpers ────────────────────────────────────────────────────────────────────

private fun inBounds(r: Int, c: Int) = r in 0..7 && c in 0..7
private fun colorOf(p: Int) = if (p > 0) CH_WHITE else CH_BLACK
private fun owns(p: Int, color: Int) = p != 0 && colorOf(p) == color
private fun enemy(p: Int, color: Int) = p != 0 && colorOf(p) != color

fun newChessGame(): ChessGame {
    val board = arrayOf(
        intArrayOf(-4, -2, -3, -5, -6, -3, -2, -4),
        intArrayOf(-1, -1, -1, -1, -1, -1, -1, -1),
        intArrayOf(0, 0, 0, 0, 0, 0, 0, 0),
        intArrayOf(0, 0, 0, 0, 0, 0, 0, 0),
        intArrayOf(0, 0, 0, 0, 0, 0, 0, 0),
        intArrayOf(0, 0, 0, 0, 0, 0, 0, 0),
        intArrayOf(1, 1, 1, 1, 1, 1, 1, 1),
        intArrayOf(4, 2, 3, 5, 6, 3, 2, 4),
    )
    return ChessGame(
        board = board,
        turn = CH_WHITE,
        castling = CastlingRights(),
        enPassant = null,
        halfMove = 0,
        fullMove = 1,
        status = ChessStatus.ACTIVE,
    )
}

// ── Raw pseudo-legal move generation ──────────────────────────────────────────

fun rawMoves(
    board: Array<IntArray>,
    r: Int, c: Int,
    ep: ChessPos?,
    castling: CastlingRights,
): List<ChessMove> {
    val piece = board[r][c]
    if (piece == 0) return emptyList()
    val color = colorOf(piece)
    val type = abs(piece)
    val moves = mutableListOf<ChessMove>()

    fun push(tr: Int, tc: Int, extra: ChessMove.() -> ChessMove = { this }) {
        if (inBounds(tr, tc)) moves.add(ChessMove(r, c, tr, tc).extra())
    }

    fun slide(dr: Int, dc: Int) {
        var s = 1
        while (s < 8) {
            val nr = r + dr * s; val nc = c + dc * s
            if (!inBounds(nr, nc) || owns(board[nr][nc], color)) break
            moves.add(ChessMove(r, c, nr, nc))
            if (board[nr][nc] != 0) break
            s++
        }
    }

    when (type) {
        CH_PAWN -> {
            val dir = if (color == CH_WHITE) -1 else 1
            val startRow = if (color == CH_WHITE) 6 else 1
            val promRow = if (color == CH_WHITE) 0 else 7
            val nr = r + dir
            if (inBounds(nr, c) && board[nr][c] == 0) {
                if (nr == promRow) {
                    for (pt in listOf(CH_QUEEN, CH_ROOK, CH_BISHOP, CH_KNIGHT))
                        moves.add(ChessMove(r, c, nr, c, promo = pt * color))
                } else {
                    push(nr, c)
                    if (r == startRow && board[nr + dir][c] == 0)
                        moves.add(ChessMove(r, c, nr + dir, c, double = true))
                }
            }
            for (dc in listOf(-1, 1)) {
                val ac = c + dc
                if (!inBounds(nr, ac)) continue
                when {
                    enemy(board[nr][ac], color) -> {
                        if (nr == promRow) {
                            for (pt in listOf(CH_QUEEN, CH_ROOK, CH_BISHOP, CH_KNIGHT))
                                moves.add(ChessMove(r, c, nr, ac, promo = pt * color))
                        } else push(nr, ac)
                    }
                    ep != null && ep.r == nr && ep.c == ac ->
                        moves.add(ChessMove(r, c, nr, ac, ep = true))
                }
            }
        }
        CH_KNIGHT -> {
            for ((dr, dc) in listOf(-2 to -1, -2 to 1, -1 to -2, -1 to 2,
                                     1 to -2, 1 to 2, 2 to -1, 2 to 1))
                if (inBounds(r + dr, c + dc) && !owns(board[r + dr][c + dc], color))
                    push(r + dr, c + dc)
        }
        CH_BISHOP -> for ((dr, dc) in listOf(-1 to -1, -1 to 1, 1 to -1, 1 to 1)) slide(dr, dc)
        CH_ROOK -> for ((dr, dc) in listOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1)) slide(dr, dc)
        CH_QUEEN -> for ((dr, dc) in listOf(-1 to -1, -1 to 0, -1 to 1, 0 to -1,
                                             0 to 1, 1 to -1, 1 to 0, 1 to 1)) slide(dr, dc)
        CH_KING -> {
            for ((dr, dc) in listOf(-1 to -1, -1 to 0, -1 to 1, 0 to -1,
                                     0 to 1, 1 to -1, 1 to 0, 1 to 1))
                if (inBounds(r + dr, c + dc) && !owns(board[r + dr][c + dc], color))
                    push(r + dr, c + dc)
            val row = if (color == CH_WHITE) 7 else 0
            if (r == row && c == 4) {
                if ((if (color == CH_WHITE) castling.wK else castling.bK) &&
                        board[row][5] == 0 && board[row][6] == 0)
                    moves.add(ChessMove(r, c, row, 6, castle = 'K'))
                if ((if (color == CH_WHITE) castling.wQ else castling.bQ) &&
                        board[row][3] == 0 && board[row][2] == 0 && board[row][1] == 0)
                    moves.add(ChessMove(r, c, row, 2, castle = 'Q'))
            }
        }
    }
    return moves
}

// ── Attack detection ───────────────────────────────────────────────────────────

fun isSquareAttacked(board: Array<IntArray>, r: Int, c: Int, byColor: Int): Boolean {
    val pDir = if (byColor == CH_WHITE) 1 else -1
    for (dc in listOf(-1, 1)) {
        val pr = r + pDir; val pc = c + dc
        if (inBounds(pr, pc) && board[pr][pc] == CH_PAWN * byColor) return true
    }
    for ((dr, dc) in listOf(-2 to -1, -2 to 1, -1 to -2, -1 to 2,
                              1 to -2, 1 to 2, 2 to -1, 2 to 1)) {
        val nr = r + dr; val nc = c + dc
        if (inBounds(nr, nc) && board[nr][nc] == CH_KNIGHT * byColor) return true
    }
    for ((dr, dc) in listOf(-1 to -1, -1 to 1, 1 to -1, 1 to 1)) {
        var s = 1
        while (s < 8) {
            val nr = r + dr * s; val nc = c + dc * s
            if (!inBounds(nr, nc)) break
            val p = board[nr][nc]
            if (p != 0) {
                if ((abs(p) == CH_BISHOP || abs(p) == CH_QUEEN) && colorOf(p) == byColor) return true
                break
            }
            s++
        }
    }
    for ((dr, dc) in listOf(-1 to 0, 1 to 0, 0 to -1, 0 to 1)) {
        var s = 1
        while (s < 8) {
            val nr = r + dr * s; val nc = c + dc * s
            if (!inBounds(nr, nc)) break
            val p = board[nr][nc]
            if (p != 0) {
                if ((abs(p) == CH_ROOK || abs(p) == CH_QUEEN) && colorOf(p) == byColor) return true
                break
            }
            s++
        }
    }
    for ((dr, dc) in listOf(-1 to -1, -1 to 0, -1 to 1, 0 to -1,
                              0 to 1, 1 to -1, 1 to 0, 1 to 1)) {
        val nr = r + dr; val nc = c + dc
        if (inBounds(nr, nc) && board[nr][nc] == CH_KING * byColor) return true
    }
    return false
}

fun findKing(board: Array<IntArray>, color: Int): ChessPos? {
    val king = CH_KING * color
    for (r in 0..7) for (c in 0..7) if (board[r][c] == king) return ChessPos(r, c)
    return null
}

fun isInCheck(board: Array<IntArray>, color: Int): Boolean {
    val k = findKing(board, color) ?: return false
    return isSquareAttacked(board, k.r, k.c, -color)
}

// ── Move application ───────────────────────────────────────────────────────────

fun applyMove(state: ChessGame, move: ChessMove): ChessGame {
    val board = state.copyBoard()
    val (r, c, tr, tc) = move

    if (move.ep) board[r][tc] = 0

    if (move.castle != null) {
        val row = r
        if (move.castle == 'K') { board[row][5] = board[row][7]; board[row][7] = 0 }
        else { board[row][3] = board[row][0]; board[row][0] = 0 }
    }

    board[tr][tc] = move.promo ?: board[r][c]
    board[r][c] = 0

    val castling = state.castling.let {
        var wK = it.wK; var wQ = it.wQ; var bK = it.bK; var bQ = it.bQ
        if (r == 7 && c == 4) { wK = false; wQ = false }
        if (r == 0 && c == 4) { bK = false; bQ = false }
        if (r == 7 && c == 0) wQ = false
        if (r == 7 && c == 7) wK = false
        if (r == 0 && c == 0) bQ = false
        if (r == 0 && c == 7) bK = false
        CastlingRights(wK, wQ, bK, bQ)
    }

    val enPassant = if (move.double)
        ChessPos(r + if (state.turn == CH_WHITE) -1 else 1, tc) else null

    val nextTurn = -state.turn
    val halfMove = if (abs(board[r][c]) == CH_PAWN || state.board[tr][tc] != 0) 0 else state.halfMove + 1
    val fullMove = if (state.turn == CH_BLACK) state.fullMove + 1 else state.fullMove

    return ChessGame(board, nextTurn, castling, enPassant, halfMove, fullMove, ChessStatus.ACTIVE)
}

// ── Legal move generation ──────────────────────────────────────────────────────

fun getLegalMoves(state: ChessGame): List<ChessMove> {
    val pseudo = mutableListOf<ChessMove>()
    for (r in 0..7) for (c in 0..7)
        if (owns(state.board[r][c], state.turn))
            pseudo.addAll(rawMoves(state.board, r, c, state.enPassant, state.castling))

    return pseudo.filter { m ->
        val next = applyMove(state, m)
        if (isInCheck(next.board, state.turn)) return@filter false
        if (m.castle != null) {
            val row = m.r
            val passTc = if (m.castle == 'K') 5 else 3
            val tmp = state.copyBoard()
            tmp[row][passTc] = tmp[row][4]; tmp[row][4] = 0
            if (isInCheck(tmp, state.turn)) return@filter false
            if (isInCheck(state.board, state.turn)) return@filter false
        }
        true
    }
}

fun updateStatus(state: ChessGame): ChessGame {
    val moves = getLegalMoves(state)
    return when {
        moves.isNotEmpty() -> state.copy(
            status = if (isInCheck(state.board, state.turn)) ChessStatus.CHECK else ChessStatus.ACTIVE,
            legalMoves = moves,
        )
        isInCheck(state.board, state.turn) -> state.copy(status = ChessStatus.CHECKMATE, legalMoves = emptyList())
        else -> state.copy(status = ChessStatus.STALEMATE, legalMoves = emptyList())
    }
}

// ── Board evaluation ───────────────────────────────────────────────────────────

fun evaluateBoard(board: Array<IntArray>): Int {
    var score = 0
    for (r in 0..7) for (c in 0..7) {
        val p = board[r][c]
        if (p == 0) continue
        val color = colorOf(p)
        val type = abs(p)
        val table = PST[type]
        val pst = if (table != null) {
            val row = if (color == CH_WHITE) r else 7 - r
            color * table[row][c]
        } else 0
        score += color * MATERIAL[type] + pst
    }
    return score
}

private fun mvvLva(board: Array<IntArray>, m: ChessMove): Int {
    val victim = board[m.tr][m.tc]
    return if (victim != 0) MATERIAL[abs(victim)] * 10 - MATERIAL[abs(board[m.r][m.c])] else 0
}

private fun orderMoves(board: Array<IntArray>, moves: List<ChessMove>): List<ChessMove> =
    moves.sortedByDescending { mvvLva(board, it) }

// ── Minimax with alpha-beta pruning ───────────────────────────────────────────

private fun minimax(
    state: ChessGame,
    depth: Int,
    alpha: Int,
    beta: Int,
    maximizing: Boolean,
): Int {
    val legalMoves = getLegalMoves(state)
    if (depth == 0 || legalMoves.isEmpty()) {
        if (legalMoves.isEmpty()) {
            return if (isInCheck(state.board, state.turn))
                if (maximizing) -99999 else 99999
            else 0
        }
        return evaluateBoard(state.board)
    }
    val ordered = orderMoves(state.board, legalMoves)
    var a = alpha; var b = beta
    return if (maximizing) {
        var best = Int.MIN_VALUE
        for (m in ordered) {
            best = max(best, minimax(applyMove(state, m), depth - 1, a, b, false))
            a = max(a, best)
            if (b <= a) break
        }
        best
    } else {
        var best = Int.MAX_VALUE
        for (m in ordered) {
            best = min(best, minimax(applyMove(state, m), depth - 1, a, b, true))
            b = min(b, best)
            if (b <= a) break
        }
        best
    }
}

private val DEPTH_MAP = intArrayOf(0, 1, 1, 2, 2, 2, 3, 3, 4, 4)

fun getChessAIMove(state: ChessGame, difficulty: Int): ChessMove? {
    val moves = getLegalMoves(state)
    if (moves.isEmpty()) return null
    val depth = DEPTH_MAP[difficulty.coerceIn(0, 9)]
    if (depth == 0) return moves.random()

    val ordered = orderMoves(state.board, moves)
    val maximizing = state.turn == CH_WHITE
    var bestScore = if (maximizing) Int.MIN_VALUE else Int.MAX_VALUE
    var bestMove = ordered.first()

    for (m in ordered) {
        val s = minimax(applyMove(state, m), depth - 1, Int.MIN_VALUE, Int.MAX_VALUE, !maximizing)
        if (if (maximizing) s > bestScore else s < bestScore) {
            bestScore = s; bestMove = m
        }
    }
    return bestMove
}
