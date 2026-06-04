package xyz.zyxwonderland.shared.chess;

import java.util.Objects;

public final class ChessMove {
    public final int r, c, tr, tc;
    public final Integer promo;
    public final Character castle;
    public final boolean ep;
    public final boolean doublePush;

    public ChessMove(int r, int c, int tr, int tc, Integer promo, Character castle, boolean ep, boolean doublePush) {
        this.r = r; this.c = c; this.tr = tr; this.tc = tc;
        this.promo = promo; this.castle = castle; this.ep = ep; this.doublePush = doublePush;
    }

    public static ChessMove of(int r, int c, int tr, int tc) {
        return new ChessMove(r, c, tr, tc, null, null, false, false);
    }

    public ChessMove withPromo(int promo) {
        return new ChessMove(r, c, tr, tc, promo, castle, ep, doublePush);
    }

    @Override public boolean equals(Object o) {
        if (!(o instanceof ChessMove m)) return false;
        return r == m.r && c == m.c && tr == m.tr && tc == m.tc && Objects.equals(promo, m.promo);
    }
    @Override public int hashCode() { return Objects.hash(r, c, tr, tc, promo); }
}
