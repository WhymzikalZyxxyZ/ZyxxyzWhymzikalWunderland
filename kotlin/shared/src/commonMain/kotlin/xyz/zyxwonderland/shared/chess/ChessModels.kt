package xyz.zyxwonderland.shared.chess

// Piece constants — positive = white, negative = black
const val CH_EMPTY  = 0
const val CH_PAWN   = 1
const val CH_KNIGHT = 2
const val CH_BISHOP = 3
const val CH_ROOK   = 4
const val CH_QUEEN  = 5
const val CH_KING   = 6
const val CH_WHITE  = 1
const val CH_BLACK  = -1
const val CH_MAX_SCORE = 9999

enum class ChessStatus { ACTIVE, CHECK, CHECKMATE, STALEMATE, DRAW }

data class CastlingRights(
    val wK: Boolean = true,
    val wQ: Boolean = true,
    val bK: Boolean = true,
    val bQ: Boolean = true,
)

data class ChessPos(val r: Int, val c: Int)

data class ChessMove(
    val r: Int,
    val c: Int,
    val tr: Int,
    val tc: Int,
    val promo: Int?  = null,
    val castle: Char? = null,   // 'K' or 'Q'
    val ep: Boolean  = false,
    val double: Boolean = false,
)

data class ChessGame(
    val board: Array<IntArray>,
    val turn: Int,
    val castling: CastlingRights,
    val enPassant: ChessPos?,
    val halfMove: Int,
    val fullMove: Int,
    val status: ChessStatus,
    val legalMoves: List<ChessMove> = emptyList(),
) {
    fun copyBoard(): Array<IntArray> = Array(8) { board[it].copyOf() }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is ChessGame) return false
        return turn == other.turn &&
               castling == other.castling &&
               enPassant == other.enPassant &&
               halfMove == other.halfMove &&
               fullMove == other.fullMove &&
               status == other.status &&
               board.indices.all { r -> board[r].contentEquals(other.board[r]) }
    }

    override fun hashCode(): Int {
        var result = turn
        result = 31 * result + castling.hashCode()
        result = 31 * result + (enPassant?.hashCode() ?: 0)
        result = 31 * result + board.fold(0) { acc, row -> 31 * acc + row.contentHashCode() }
        return result
    }
}
