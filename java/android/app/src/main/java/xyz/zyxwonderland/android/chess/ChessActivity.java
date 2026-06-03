package xyz.zyxwonderland.android.chess;

import android.os.Bundle;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import java.util.concurrent.Executors;

import xyz.zyxwonderland.android.R;
import xyz.zyxwonderland.shared.chess.ChessEngine;
import xyz.zyxwonderland.shared.chess.ChessGame;
import xyz.zyxwonderland.shared.chess.ChessMove;
import xyz.zyxwonderland.shared.chess.ChessStatus;

public class ChessActivity extends AppCompatActivity {

    private ChessGame game = ChessEngine.newGame();
    private Integer selR, selC;
    private boolean aiThinking = false;

    private ChessBoardView boardView;
    private TextView statusText;
    private Button newGameBtn;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_chess);

        boardView  = findViewById(R.id.boardView);
        statusText = findViewById(R.id.statusText);
        newGameBtn = findViewById(R.id.newGameBtn);

        boardView.setGame(game);
        boardView.setOnSquareTapped(this::handleTap);
        newGameBtn.setOnClickListener(v -> {
            game = ChessEngine.newGame(); selR = null; selC = null; aiThinking = false;
            boardView.setGame(game); boardView.setSelection(null, null); updateStatus();
        });

        updateStatus();
    }

    private void handleTap(int r, int c) {
        if (aiThinking) return;

        if (selR == null) {
            int p = game.board[r][c];
            if (p != 0 && Integer.signum(p) == game.turn) {
                selR = r; selC = c; boardView.setSelection(r, c);
            }
            return;
        }

        ChessMove move = game.legalMoves.stream()
            .filter(m -> m.r == selR && m.c == selC && m.tr == r && m.tc == c)
            .findFirst().orElse(null);

        if (move == null) {
            int p = game.board[r][c];
            if (p != 0 && Integer.signum(p) == game.turn) { selR = r; selC = c; boardView.setSelection(r, c); }
            else { selR = null; selC = null; boardView.setSelection(null, null); }
            return;
        }

        if (move.promo != null) move = move.withPromo(5 * game.turn);
        game = ChessEngine.applyMove(game, move);
        selR = null; selC = null;
        boardView.setGame(game); boardView.setSelection(null, null); updateStatus();

        if ((game.status == ChessStatus.ACTIVE || game.status == ChessStatus.CHECK) && game.turn == -1)
            runAi();
    }

    private void runAi() {
        aiThinking = true;
        statusText.setText("AI thinking…");
        ChessGame snap = game;
        Executors.newSingleThreadExecutor().execute(() -> {
            ChessMove m = ChessEngine.getAIMove(snap);
            runOnUiThread(() -> {
                if (m != null) game = ChessEngine.applyMove(game, m);
                aiThinking = false;
                boardView.setGame(game); updateStatus();
            });
        });
    }

    private void updateStatus() {
        statusText.setText(switch (game.status) {
            case CHECKMATE -> game.turn == 1 ? "Black wins" : "White wins";
            case STALEMATE -> "Draw by stalemate";
            case CHECK     -> game.turn == 1 ? "White in check" : "Black in check";
            default        -> game.turn == 1 ? "White to move" : "Black to move";
        });
    }
}
