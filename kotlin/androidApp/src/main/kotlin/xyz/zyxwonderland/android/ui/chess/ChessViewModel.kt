package xyz.zyxwonderland.android.ui.chess

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import xyz.zyxwonderland.shared.chess.CH_BLACK
import xyz.zyxwonderland.shared.chess.CH_WHITE
import xyz.zyxwonderland.shared.chess.ChessGame
import xyz.zyxwonderland.shared.chess.ChessMove
import xyz.zyxwonderland.shared.chess.ChessStatus
import xyz.zyxwonderland.shared.chess.applyMove
import xyz.zyxwonderland.shared.chess.getChessAIMove
import xyz.zyxwonderland.shared.chess.newChessGame
import xyz.zyxwonderland.shared.chess.updateStatus

data class ChessUiState(
    val game: ChessGame = updateStatus(newChessGame()),
    val selected: Pair<Int, Int>? = null,
    val highlights: Set<Pair<Int, Int>> = emptySet(),
    val playerColor: Int = CH_WHITE,
    val aiDifficulty: Int = 3,
    val isAiThinking: Boolean = false,
    val message: String = "",
)

class ChessViewModel : ViewModel() {

    private val _ui = MutableStateFlow(ChessUiState())
    val ui = _ui.asStateFlow()

    fun onSquareTapped(r: Int, c: Int) {
        val state = _ui.value
        if (state.isAiThinking) return
        if (state.game.status == ChessStatus.CHECKMATE ||
            state.game.status == ChessStatus.STALEMATE) return

        // It's not the player's turn
        if (state.game.turn != state.playerColor) return

        val sel = state.selected
        if (sel != null) {
            val move = state.game.legalMoves.firstOrNull {
                it.r == sel.first && it.c == sel.second && it.tr == r && it.tc == c
            }
            if (move != null) {
                applyPlayerMove(move)
                return
            }
        }

        // Select a piece that has legal moves from this square
        val movesFromHere = state.game.legalMoves.filter { it.r == r && it.c == c }
        if (movesFromHere.isNotEmpty()) {
            _ui.update {
                it.copy(
                    selected   = r to c,
                    highlights = movesFromHere.map { m -> m.tr to m.tc }.toSet(),
                )
            }
        } else {
            _ui.update { it.copy(selected = null, highlights = emptySet()) }
        }
    }

    private fun applyPlayerMove(move: ChessMove) {
        _ui.update { it.copy(selected = null, highlights = emptySet()) }
        val nextGame = updateStatus(applyMove(_ui.value.game, move))
        _ui.update { it.copy(game = nextGame, message = statusMessage(nextGame)) }

        if (nextGame.status == ChessStatus.ACTIVE || nextGame.status == ChessStatus.CHECK) {
            scheduleAiMove()
        }
    }

    private fun scheduleAiMove() {
        _ui.update { it.copy(isAiThinking = true) }
        viewModelScope.launch(Dispatchers.Default) {
            val state    = _ui.value
            val aiMove   = getChessAIMove(state.game, state.aiDifficulty)
            if (aiMove != null) {
                val nextGame = updateStatus(applyMove(state.game, aiMove))
                _ui.update { it.copy(game = nextGame, isAiThinking = false, message = statusMessage(nextGame)) }
            } else {
                _ui.update { it.copy(isAiThinking = false) }
            }
        }
    }

    fun newGame() {
        _ui.update { ChessUiState(aiDifficulty = it.aiDifficulty, playerColor = it.playerColor) }
    }

    fun setDifficulty(d: Int) {
        _ui.update { it.copy(aiDifficulty = d) }
    }

    private fun statusMessage(game: ChessGame) = when (game.status) {
        ChessStatus.CHECKMATE -> if (game.turn == CH_BLACK) "Checkmate — you win!" else "Checkmate — AI wins!"
        ChessStatus.STALEMATE -> "Stalemate — draw!"
        ChessStatus.CHECK     -> "Check!"
        else                  -> ""
    }
}
