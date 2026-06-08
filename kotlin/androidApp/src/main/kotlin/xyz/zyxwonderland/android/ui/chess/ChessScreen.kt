package xyz.zyxwonderland.android.ui.chess

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import xyz.zyxwonderland.shared.chess.CH_BISHOP
import xyz.zyxwonderland.shared.chess.CH_KING
import xyz.zyxwonderland.shared.chess.CH_KNIGHT
import xyz.zyxwonderland.shared.chess.CH_PAWN
import xyz.zyxwonderland.shared.chess.CH_QUEEN
import xyz.zyxwonderland.shared.chess.CH_ROOK
import kotlin.math.abs

private val LIGHT_SQUARE = Color(0xFFF0D9B5)
private val DARK_SQUARE = Color(0xFFB58863)
private val HIGHLIGHT = Color(0x8800C853)
private val SELECTED = Color(0xAAFFEB3B)

@Composable
fun ChessScreen(vm: ChessViewModel = viewModel()) {
    val ui by vm.ui.collectAsState()

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            "Chess vs AI",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Spacer(Modifier.height(8.dp))

        if (ui.message.isNotEmpty()) {
            Text(
                ui.message,
                color = MaterialTheme.colorScheme.secondary,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
            )
            Spacer(Modifier.height(8.dp))
        }

        ChessBoard(
            ui = ui,
            onSquare = { r, c -> vm.onSquareTapped(r, c) },
            modifier = Modifier.fillMaxWidth().aspectRatio(1f),
        )

        Spacer(Modifier.height(12.dp))

        if (ui.isAiThinking) {
            Text("AI is thinking…", color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
        }

        Spacer(Modifier.height(8.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Difficulty: ${ui.aiDifficulty}", color = MaterialTheme.colorScheme.onBackground)
            Spacer(Modifier.size(8.dp))
            Slider(
                value = ui.aiDifficulty.toFloat(),
                onValueChange = { vm.setDifficulty(it.toInt()) },
                valueRange = 1f..9f,
                steps = 7,
                modifier = Modifier.weight(1f),
            )
        }

        Spacer(Modifier.height(8.dp))

        Button(onClick = vm::newGame) {
            Text("New Game")
        }
    }
}

@Composable
private fun ChessBoard(
    ui: ChessUiState,
    onSquare: (Int, Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    val board = ui.game.board

    Column(modifier = modifier) {
        for (r in 0..7) {
            Row(modifier = Modifier.weight(1f)) {
                for (c in 0..7) {
                    val isSelected = ui.selected == (r to c)
                    val isHighlight = (r to c) in ui.highlights
                    val isLight = (r + c) % 2 == 0
                    val baseColor = if (isLight) LIGHT_SQUARE else DARK_SQUARE
                    val squareColor = when {
                        isSelected -> SELECTED
                        isHighlight -> HIGHLIGHT
                        else -> baseColor
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(1f)
                            .background(squareColor)
                            .clickable { onSquare(r, c) },
                        contentAlignment = Alignment.Center,
                    ) {
                        val piece = board[r][c]
                        if (piece != 0) {
                            Text(
                                text = pieceGlyph(piece),
                                fontSize = 28.sp,
                                textAlign = TextAlign.Center,
                            )
                        }
                    }
                }
            }
        }
    }
}

private fun pieceGlyph(piece: Int): String {
    val white = piece > 0
    return when (abs(piece)) {
        CH_KING -> if (white) "♔" else "♚"
        CH_QUEEN -> if (white) "♕" else "♛"
        CH_ROOK -> if (white) "♖" else "♜"
        CH_BISHOP -> if (white) "♗" else "♝"
        CH_KNIGHT -> if (white) "♘" else "♞"
        CH_PAWN -> if (white) "♙" else "♟"
        else -> ""
    }
}
