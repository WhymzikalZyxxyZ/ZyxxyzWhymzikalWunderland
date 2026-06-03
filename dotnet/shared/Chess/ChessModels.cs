namespace ZyxxyzShared.Chess;

public enum ChessStatus { Active, Check, Checkmate, Stalemate }

public sealed record CastlingRights(
    bool WK = true, bool WQ = true,
    bool BK = true, bool BQ = true);

public sealed record ChessMove(
    int R, int C, int Tr, int Tc,
    int?  Promo  = null,
    char? Castle = null,
    bool  Ep     = false,
    bool  Double = false);

public sealed record ChessGame(
    int[][]                 Board,
    int                     Turn,
    CastlingRights          Castling,
    (int R, int C)?         EnPassant,
    int                     HalfMove,
    int                     FullMove,
    ChessStatus             Status,
    IReadOnlyList<ChessMove> LegalMoves);
