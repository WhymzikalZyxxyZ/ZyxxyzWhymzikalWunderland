package xyz.zyxwonderland.android.chess;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;

import xyz.zyxwonderland.shared.chess.ChessGame;
import xyz.zyxwonderland.shared.chess.ChessMove;

import java.util.HashSet;
import java.util.Set;

public class ChessBoardView extends View {

    public interface OnSquareTapped { void onTap(int r, int c); }

    private static final int[] LIGHT_COLOR    = { 0xFFF0D9B5 };
    private static final int DARK_COLOR       = 0xFFB58863;
    private static final int LIGHT_SQ         = 0xFFF0D9B5;
    private static final int DARK_SQ          = 0xFFB58863;
    private static final int SELECTED_COLOR   = 0xFF7FC97F;
    private static final int TARGET_COLOR     = 0xFFAED67A;

    private static final String[] W_GLYPHS = { "", "♙", "♘", "♗", "♖", "♕", "♔" };
    private static final String[] B_GLYPHS = { "", "♟", "♞", "♝", "♜", "♛", "♚" };

    private final Paint sqPaint = new Paint();
    private final Paint piecePaint = new Paint(Paint.ANTI_ALIAS_FLAG);

    private ChessGame game;
    private Integer selR, selC;
    private Set<String> targets = new HashSet<>();
    private OnSquareTapped listener;

    public ChessBoardView(Context ctx, AttributeSet attrs) {
        super(ctx, attrs);
        piecePaint.setTextAlign(Paint.Align.CENTER);
    }

    public void setGame(ChessGame g) { game = g; invalidate(); }
    public void setSelection(Integer r, Integer c) {
        selR = r; selC = c;
        targets.clear();
        if (r != null && game != null)
            for (ChessMove m : game.legalMoves)
                if (m.r == r && m.c == c) targets.add(m.tr + "," + m.tc);
        invalidate();
    }
    public void setOnSquareTapped(OnSquareTapped l) { listener = l; }

    @Override
    protected void onMeasure(int wSpec, int hSpec) {
        int size = Math.min(MeasureSpec.getSize(wSpec), MeasureSpec.getSize(hSpec));
        setMeasuredDimension(size, size);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        if (game == null) return;
        float sq = getWidth() / 8f;
        piecePaint.setTextSize(sq * 0.72f);

        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                boolean light = (r + c) % 2 == 0;
                boolean sel = selR != null && selR == r && selC == c;
                boolean tgt = targets.contains(r + "," + c);

                sqPaint.setColor(sel ? SELECTED_COLOR : tgt ? TARGET_COLOR : light ? LIGHT_SQ : DARK_SQ);
                canvas.drawRect(c * sq, r * sq, (c + 1) * sq, (r + 1) * sq, sqPaint);

                int piece = game.board[r][c];
                String glyph = piece > 0 ? W_GLYPHS[piece] : piece < 0 ? B_GLYPHS[-piece] : "";
                if (!glyph.isEmpty()) {
                    piecePaint.setColor(Color.BLACK);
                    canvas.drawText(glyph, (c + 0.5f) * sq, (r + 0.78f) * sq, piecePaint);
                }
            }
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        if (e.getAction() == MotionEvent.ACTION_UP && listener != null) {
            float sq = getWidth() / 8f;
            int c = (int)(e.getX() / sq), r = (int)(e.getY() / sq);
            if (r >= 0 && r < 8 && c >= 0 && c < 8) listener.onTap(r, c);
        }
        return true;
    }
}
