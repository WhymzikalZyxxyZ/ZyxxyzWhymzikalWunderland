package xyz.zyxwonderland.desktop.chess;

import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.shape.Rectangle;
import javafx.scene.text.Font;
import xyz.zyxwonderland.shared.chess.ChessEngine;
import xyz.zyxwonderland.shared.chess.ChessGame;
import xyz.zyxwonderland.shared.chess.ChessMove;
import xyz.zyxwonderland.shared.chess.ChessStatus;

import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

public class ChessView extends BorderPane {

    private static final int SQ = 60;
    private static final Color LIGHT      = Color.web("#f0d9b5");
    private static final Color DARK       = Color.web("#b58863");
    private static final Color SELECTED   = Color.web("#7fc97f");
    private static final Color TARGET     = Color.web("#aed67a");
    private static final Color BG         = Color.web("#1a1a2e");
    private static final String[] GLYPHS  = { "", "♙", "♘", "♗", "♖", "♕", "♔" };
    private static final String[] BGLYPHS = { "", "♟", "♞", "♝", "♜", "♛", "♚" };

    private ChessGame game = ChessEngine.newGame();
    private Integer selR, selC;
    private boolean aiThinking = false;

    private final GridPane board = new GridPane();
    private final Label statusLabel = new Label("White to move");
    private final Button newGameBtn = new Button("New Game");

    public ChessView() {
        board.setBackground(new Background(new BackgroundFill(BG, null, null)));

        statusLabel.setStyle("-fx-text-fill: #aaa; -fx-font-size: 14px; -fx-font-family: 'Courier New';");
        newGameBtn.setStyle("-fx-background-color: #e94560; -fx-text-fill: white; -fx-cursor: hand; -fx-background-radius: 6;");
        newGameBtn.setOnAction(e -> { game = ChessEngine.newGame(); selR = null; selC = null; aiThinking = false; rebuild(); });

        HBox top = new HBox(statusLabel);
        top.setAlignment(Pos.CENTER);
        top.setPadding(new Insets(12, 0, 8, 0));
        top.setBackground(new Background(new BackgroundFill(BG, null, null)));

        HBox bottom = new HBox(newGameBtn);
        bottom.setAlignment(Pos.CENTER);
        bottom.setPadding(new Insets(12));
        bottom.setBackground(new Background(new BackgroundFill(BG, null, null)));

        setTop(top);
        setCenter(board);
        setBottom(bottom);
        setBackground(new Background(new BackgroundFill(BG, null, null)));

        rebuild();
    }

    private void rebuild() {
        board.getChildren().clear();
        Set<String> targets = new HashSet<>();
        if (selR != null)
            for (ChessMove m : game.legalMoves)
                if (m.r == selR && m.c == selC) targets.add(m.tr + "," + m.tc);

        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                boolean light = (r + c) % 2 == 0;
                boolean sel = selR != null && selR == r && selC == c;
                boolean tgt = targets.contains(r + "," + c);

                Color bg = sel ? SELECTED : tgt ? TARGET : light ? LIGHT : DARK;
                Rectangle sq = new Rectangle(SQ, SQ, bg);

                int piece = game.board[r][c];
                String glyph = piece > 0 ? GLYPHS[piece] : piece < 0 ? BGLYPHS[-piece] : "";

                Label pieceLabel = new Label(glyph);
                pieceLabel.setFont(Font.font(36));
                pieceLabel.setTextFill(Color.web("#1a1a1a"));
                pieceLabel.setMinSize(SQ, SQ);
                pieceLabel.setAlignment(Pos.CENTER);
                pieceLabel.setMouseTransparent(true);

                StackPane cell = new StackPane(sq, pieceLabel);
                int fr = r, fc = c;
                cell.setOnMouseClicked(e -> handleClick(fr, fc));
                board.add(cell, c, r);
            }
        }
        statusLabel.setText(statusText());
    }

    private void handleClick(int r, int c) {
        if (aiThinking) return;

        if (selR == null) {
            int p = game.board[r][c];
            if (p != 0 && Integer.signum(p) == game.turn) { selR = r; selC = c; rebuild(); }
            return;
        }

        ChessMove move = game.legalMoves.stream()
            .filter(m -> m.r == selR && m.c == selC && m.tr == r && m.tc == c)
            .findFirst().orElse(null);

        if (move == null) {
            int p = game.board[r][c];
            selR = (p != 0 && Integer.signum(p) == game.turn) ? r : null;
            selC = selR != null ? c : null;
            rebuild(); return;
        }

        if (move.promo != null) move = move.withPromo(5 * game.turn);
        game = ChessEngine.applyMove(game, move);
        selR = null; selC = null;
        rebuild();

        if ((game.status == ChessStatus.ACTIVE || game.status == ChessStatus.CHECK) && game.turn == -1)
            runAi();
    }

    private void runAi() {
        aiThinking = true;
        statusLabel.setText("AI thinking…");
        ChessGame snap = game;
        CompletableFuture.supplyAsync(() -> ChessEngine.getAIMove(snap))
            .thenAcceptAsync(move -> {
                if (move != null) game = ChessEngine.applyMove(game, move);
                aiThinking = false;
                rebuild();
            }, Platform::runLater);
    }

    private String statusText() {
        return switch (game.status) {
            case CHECKMATE -> game.turn == 1 ? "Black wins by checkmate" : "White wins by checkmate";
            case STALEMATE -> "Draw by stalemate";
            case CHECK     -> game.turn == 1 ? "White is in check" : "Black is in check";
            default        -> game.turn == 1 ? "White to move" : "Black to move";
        };
    }
}
