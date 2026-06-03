namespace ZyxxyzShared.Chess;

public static class ChessEngine
{
    public const int Empty = 0, Pawn = 1, Knight = 2, Bishop = 3, Rook = 4, Queen = 5, King = 6;
    public const int White = 1, Black = -1;

    private static readonly int[] PieceValue = [0, 100, 320, 330, 500, 900, 20000];
    private static readonly int[] DepthMap   = [0, 1, 1, 2, 2, 2, 3, 3, 4, 4];

    private static readonly int[] PawnPst = [
         0,  0,  0,  0,  0,  0,  0,  0,
        50, 50, 50, 50, 50, 50, 50, 50,
        10, 10, 20, 30, 30, 20, 10, 10,
         5,  5, 10, 25, 25, 10,  5,  5,
         0,  0,  0, 20, 20,  0,  0,  0,
         5, -5,-10,  0,  0,-10, -5,  5,
         5, 10, 10,-20,-20, 10, 10,  5,
         0,  0,  0,  0,  0,  0,  0,  0,
    ];
    private static readonly int[] KnightPst = [
        -50,-40,-30,-30,-30,-30,-40,-50,
        -40,-20,  0,  0,  0,  0,-20,-40,
        -30,  0, 10, 15, 15, 10,  0,-30,
        -30,  5, 15, 20, 20, 15,  5,-30,
        -30,  0, 15, 20, 20, 15,  0,-30,
        -30,  5, 10, 15, 15, 10,  5,-30,
        -40,-20,  0,  5,  5,  0,-20,-40,
        -50,-40,-30,-30,-30,-30,-40,-50,
    ];
    private static readonly int[] BishopPst = [
        -20,-10,-10,-10,-10,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5, 10, 10,  5,  0,-10,
        -10,  5,  5, 10, 10,  5,  5,-10,
        -10,  0, 10, 10, 10, 10,  0,-10,
        -10, 10, 10, 10, 10, 10, 10,-10,
        -10,  5,  0,  0,  0,  0,  5,-10,
        -20,-10,-10,-10,-10,-10,-10,-20,
    ];
    private static readonly int[] RookPst = [
         0,  0,  0,  0,  0,  0,  0,  0,
         5, 10, 10, 10, 10, 10, 10,  5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
        -5,  0,  0,  0,  0,  0,  0, -5,
         0,  0,  0,  5,  5,  0,  0,  0,
    ];
    private static readonly int[] QueenPst = [
        -20,-10,-10, -5, -5,-10,-10,-20,
        -10,  0,  0,  0,  0,  0,  0,-10,
        -10,  0,  5,  5,  5,  5,  0,-10,
         -5,  0,  5,  5,  5,  5,  0, -5,
          0,  0,  5,  5,  5,  5,  0, -5,
        -10,  5,  5,  5,  5,  5,  0,-10,
        -10,  0,  5,  0,  0,  0,  0,-10,
        -20,-10,-10, -5, -5,-10,-10,-20,
    ];
    private static readonly int[] KingPst = [
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -30,-40,-40,-50,-50,-40,-40,-30,
        -20,-30,-30,-40,-40,-30,-30,-20,
        -10,-20,-20,-20,-20,-20,-20,-10,
         20, 20,  0,  0,  0,  0, 20, 20,
         20, 30, 10,  0,  0, 10, 30, 20,
    ];

    private static int Pst(int[] t, int r, int c, int color)
        => t[color == White ? r * 8 + c : (7 - r) * 8 + c];

    private static bool Ib(int r, int c) => (uint)r < 8u && (uint)c < 8u;

    private static int[][] CopyBoard(int[][] b)
        => b.Select(row => (int[])row.Clone()).ToArray();

    public static ChessGame NewGame()
    {
        var b = new int[8][];
        for (int i = 0; i < 8; i++) b[i] = new int[8];
        int[] back = [Rook, Knight, Bishop, Queen, King, Bishop, Knight, Rook];
        for (int c = 0; c < 8; c++) { b[0][c] = -back[c]; b[7][c] = back[c]; }
        for (int c = 0; c < 8; c++) { b[1][c] = -Pawn;    b[6][c] = Pawn; }
        var g = new ChessGame(b, White, new CastlingRights(), null, 0, 1, ChessStatus.Active, []);
        g = g with { LegalMoves = GetLegalMoves(g) };
        return UpdateStatus(g);
    }

    private static List<ChessMove> RawMoves(ChessGame g, int r, int c)
    {
        var ms = new List<ChessMove>(32);
        int pc = Math.Abs(g.Board[r][c]);
        int co = g.Board[r][c] > 0 ? White : Black;
        var b  = g.Board;

        void A(int tr, int tc, int? pr = null, char? ca = null, bool ep = false, bool db = false)
        { if (Ib(tr, tc)) ms.Add(new ChessMove(r, c, tr, tc, pr, ca, ep, db)); }

        void Slide(int dr, int dc)
        {
            for (int rr = r+dr, rc = c+dc; Ib(rr, rc); rr += dr, rc += dc)
            {
                if (b[rr][rc] == Empty)      { A(rr, rc); continue; }
                if (b[rr][rc] * co < 0) A(rr, rc);
                break;
            }
        }

        switch (pc)
        {
            case Pawn:
            {
                int dir = co == White ? -1 : 1;
                int src = co == White ?  6 : 1;
                int pro = co == White ?  0 : 7;
                int t1  = r + dir;
                if (Ib(t1, c) && b[t1][c] == Empty)
                {
                    if (t1 == pro) foreach (int p in (int[])[Queen, Rook, Bishop, Knight]) A(t1, c, p);
                    else { A(t1, c); if (r == src && b[r + 2*dir][c] == Empty) A(r + 2*dir, c, db: true); }
                }
                foreach (int dc in (int[])[-1, 1])
                {
                    int tc = c + dc;
                    if (!Ib(t1, tc)) continue;
                    if (b[t1][tc] * co < 0)
                    { if (t1 == pro) foreach (int p in (int[])[Queen, Rook, Bishop, Knight]) A(t1, tc, p); else A(t1, tc); }
                    else if (g.EnPassant == (t1, tc)) A(t1, tc, ep: true);
                }
                break;
            }
            case Knight:
            {
                int[] ds = [-2,-1, -2,1, -1,-2, -1,2, 1,-2, 1,2, 2,-1, 2,1];
                for (int i = 0; i < ds.Length; i += 2)
                    if (Ib(r+ds[i], c+ds[i+1]) && b[r+ds[i]][c+ds[i+1]] * co <= 0)
                        A(r+ds[i], c+ds[i+1]);
                break;
            }
            case Bishop: Slide(-1,-1); Slide(-1,1); Slide(1,-1); Slide(1,1); break;
            case Rook:   Slide(-1, 0); Slide( 1,0); Slide(0,-1); Slide(0,1); break;
            case Queen:  Slide(-1,-1); Slide(-1,1); Slide(1,-1); Slide(1,1);
                         Slide(-1, 0); Slide( 1,0); Slide(0,-1); Slide(0,1); break;
            case King:
            {
                int[] ds = [-1,-1,-1,0,-1,1,0,-1,0,1,1,-1,1,0,1,1];
                for (int i = 0; i < ds.Length; i += 2)
                    if (Ib(r+ds[i], c+ds[i+1]) && b[r+ds[i]][c+ds[i+1]] * co <= 0)
                        A(r+ds[i], c+ds[i+1]);
                int kr = co == White ? 7 : 0;
                if (r != kr || c != 4) break;
                var cr = g.Castling;
                if ((co == White ? cr.WK : cr.BK) &&
                    b[kr][5]==0 && b[kr][6]==0 &&
                    !IsAttacked(b,kr,4,-co) && !IsAttacked(b,kr,5,-co) && !IsAttacked(b,kr,6,-co))
                    A(kr, 6, ca: 'K');
                if ((co == White ? cr.WQ : cr.BQ) &&
                    b[kr][3]==0 && b[kr][2]==0 && b[kr][1]==0 &&
                    !IsAttacked(b,kr,4,-co) && !IsAttacked(b,kr,3,-co) && !IsAttacked(b,kr,2,-co))
                    A(kr, 2, ca: 'Q');
                break;
            }
        }
        return ms;
    }

    public static bool IsAttacked(int[][] b, int r, int c, int by)
    {
        int dir = by == White ? 1 : -1;
        foreach (int dc in (int[])[-1, 1])
            if (Ib(r+dir, c+dc) && b[r+dir][c+dc] == by*Pawn) return true;

        int[] nd = [-2,-1,-2,1,-1,-2,-1,2,1,-2,1,2,2,-1,2,1];
        for (int i = 0; i < nd.Length; i += 2)
            if (Ib(r+nd[i], c+nd[i+1]) && b[r+nd[i]][c+nd[i+1]] == by*Knight) return true;

        int[] diags = [-1,-1,-1,1,1,-1,1,1];
        for (int i = 0; i < diags.Length; i += 2)
            for (int rr=r+diags[i],rc=c+diags[i+1]; Ib(rr,rc); rr+=diags[i],rc+=diags[i+1])
            { int p=b[rr][rc]; if(p!=0){if(p*by>0&&(Math.Abs(p)==Bishop||Math.Abs(p)==Queen))return true;break;} }

        int[] lines = [-1,0,1,0,0,-1,0,1];
        for (int i = 0; i < lines.Length; i += 2)
            for (int rr=r+lines[i],rc=c+lines[i+1]; Ib(rr,rc); rr+=lines[i],rc+=lines[i+1])
            { int p=b[rr][rc]; if(p!=0){if(p*by>0&&(Math.Abs(p)==Rook||Math.Abs(p)==Queen))return true;break;} }

        int[] kd = [-1,-1,-1,0,-1,1,0,-1,0,1,1,-1,1,0,1,1];
        for (int i = 0; i < kd.Length; i += 2)
            if (Ib(r+kd[i], c+kd[i+1]) && b[r+kd[i]][c+kd[i+1]] == by*King) return true;

        return false;
    }

    private static (int R, int C) FindKing(int[][] b, int color)
    {
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
                if (b[r][c] == color * King) return (r, c);
        return (-1, -1);
    }

    public static bool IsInCheck(ChessGame g, int color)
    {
        var (kr, kc) = FindKing(g.Board, color);
        return kr >= 0 && IsAttacked(g.Board, kr, kc, -color);
    }

    public static List<ChessMove> GetLegalMoves(ChessGame g)
    {
        var legal = new List<ChessMove>(50);
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
            {
                if (g.Board[r][c] * g.Turn <= 0) continue;
                foreach (var m in RawMoves(g, r, c))
                {
                    var next = ApplyMoveRaw(g, m);
                    if (!IsInCheck(next, g.Turn)) legal.Add(m);
                }
            }
        return legal;
    }

    // Does not populate LegalMoves — used only for in-check testing
    private static ChessGame ApplyMoveRaw(ChessGame g, ChessMove m)
    {
        var b   = CopyBoard(g.Board);
        int pc  = Math.Abs(b[m.R][m.C]);
        int co  = b[m.R][m.C] > 0 ? White : Black;
        b[m.Tr][m.Tc] = b[m.R][m.C];
        b[m.R][m.C]   = Empty;
        if (m.Ep)             b[m.R][m.Tc]   = Empty;
        if (m.Promo.HasValue) b[m.Tr][m.Tc]  = co * m.Promo.Value;
        if (m.Castle == 'K') { b[m.R][5]=b[m.R][7]; b[m.R][7]=Empty; }
        if (m.Castle == 'Q') { b[m.R][3]=b[m.R][0]; b[m.R][0]=Empty; }
        var cr = g.Castling;
        if (pc == King)
            cr = co == White ? cr with { WK=false, WQ=false } : cr with { BK=false, BQ=false };
        if ((m.R==7&&m.C==0)||(m.Tr==7&&m.Tc==0)) cr = cr with { WQ=false };
        if ((m.R==7&&m.C==7)||(m.Tr==7&&m.Tc==7)) cr = cr with { WK=false };
        if ((m.R==0&&m.C==0)||(m.Tr==0&&m.Tc==0)) cr = cr with { BQ=false };
        if ((m.R==0&&m.C==7)||(m.Tr==0&&m.Tc==7)) cr = cr with { BK=false };
        (int R, int C)? ep = m.Double ? (m.R + (co==White ? -1 : 1), m.C) : null;
        int hm = (pc==Pawn || g.Board[m.Tr][m.Tc]!=Empty) ? 0 : g.HalfMove + 1;
        int fm = g.FullMove + (co==Black ? 1 : 0);
        return new ChessGame(b, -co, cr, ep, hm, fm, ChessStatus.Active, []);
    }

    public static ChessGame ApplyMove(ChessGame g, ChessMove m)
    {
        var next = ApplyMoveRaw(g, m);
        next = next with { LegalMoves = GetLegalMoves(next) };
        return UpdateStatus(next);
    }

    public static ChessGame UpdateStatus(ChessGame g)
    {
        bool inCheck = IsInCheck(g, g.Turn);
        bool noMoves = g.LegalMoves.Count == 0;
        return g with
        {
            Status = (inCheck, noMoves) switch
            {
                (true,  true)  => ChessStatus.Checkmate,
                (false, true)  => ChessStatus.Stalemate,
                (true,  false) => ChessStatus.Check,
                _              => ChessStatus.Active,
            }
        };
    }

    private static int Evaluate(ChessGame g)
    {
        int score = 0;
        for (int r = 0; r < 8; r++)
            for (int c = 0; c < 8; c++)
            {
                int p = g.Board[r][c];
                if (p == Empty) continue;
                int co = p > 0 ? White : Black, ab = Math.Abs(p);
                int[] t = ab switch
                {
                    Pawn   => PawnPst, Knight => KnightPst, Bishop => BishopPst,
                    Rook   => RookPst, Queen  => QueenPst,  _      => KingPst,
                };
                score += co * (PieceValue[ab] + Pst(t, r, c, co));
            }
        return score;
    }

    private static int MvvLva(ChessGame g, ChessMove m)
    {
        int victim   = Math.Abs(g.Board[m.Tr][m.Tc]);
        int attacker = Math.Abs(g.Board[m.R][m.C]);
        return victim > 0 ? PieceValue[victim] * 10 - PieceValue[attacker] : 0;
    }

    private static List<ChessMove> Ordered(ChessGame g)
    {
        var ms = new List<ChessMove>(g.LegalMoves);
        ms.Sort((a, b) => MvvLva(g, b).CompareTo(MvvLva(g, a)));
        return ms;
    }

    private static int Minimax(ChessGame g, int depth, int alpha, int beta, bool maximizing)
    {
        if (depth == 0 || g.Status is ChessStatus.Checkmate or ChessStatus.Stalemate)
            return Evaluate(g);

        if (maximizing)
        {
            int best = int.MinValue;
            foreach (var m in Ordered(g))
            {
                best  = Math.Max(best, Minimax(ApplyMove(g, m), depth - 1, alpha, beta, false));
                alpha = Math.Max(alpha, best);
                if (beta <= alpha) break;
            }
            return best;
        }
        else
        {
            int best = int.MaxValue;
            foreach (var m in Ordered(g))
            {
                best = Math.Min(best, Minimax(ApplyMove(g, m), depth - 1, alpha, beta, true));
                beta = Math.Min(beta, best);
                if (beta <= alpha) break;
            }
            return best;
        }
    }

    public static ChessMove? GetAIMove(ChessGame g, int difficulty)
    {
        if (g.LegalMoves.Count == 0) return null;
        int  depth = DepthMap[Math.Clamp(difficulty, 0, 9)];
        bool max   = g.Turn == White;
        ChessMove? best      = null;
        int        bestScore = max ? int.MinValue : int.MaxValue;
        foreach (var m in Ordered(g))
        {
            int score = Minimax(ApplyMove(g, m), depth - 1, int.MinValue, int.MaxValue, !max);
            if (max ? score > bestScore : score < bestScore) { bestScore = score; best = m; }
        }
        return best;
    }
}
