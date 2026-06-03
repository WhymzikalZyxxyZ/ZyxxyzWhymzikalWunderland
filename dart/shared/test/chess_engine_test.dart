import 'package:test/test.dart';
import 'package:chess_engine/chess_engine.dart';

void main() {
  group('Board setup', () {
    test('initial board corners are rooks', () {
      final g = newGame();
      expect(g.board[0][0], equals(-R));
      expect(g.board[0][7], equals(-R));
      expect(g.board[7][0], equals(R));
      expect(g.board[7][7], equals(R));
    });

    test('initial board kings', () {
      final g = newGame();
      expect(g.board[0][4], equals(-K));
      expect(g.board[7][4], equals(K));
    });

    test('initial board queens', () {
      final g = newGame();
      expect(g.board[0][3], equals(-Q));
      expect(g.board[7][3], equals(Q));
    });

    test('initial board pawns', () {
      final g = newGame();
      for (var c = 0; c < 8; c++) {
        expect(g.board[1][c], equals(-P));
        expect(g.board[6][c], equals(P));
      }
    });

    test('middle rows are empty', () {
      final g = newGame();
      for (var r = 2; r < 6; r++) {
        for (var c = 0; c < 8; c++) {
          expect(g.board[r][c], equals(0));
        }
      }
    });

    test('white to move first', () {
      expect(newGame().turn, equals(1));
    });

    test('initial status is active', () {
      expect(newGame().status, equals(ChessStatus.active));
    });

    test('initial castling rights all true', () {
      final g = newGame();
      expect(g.wK && g.wQ && g.bK && g.bQ, isTrue);
    });

    test('initial legal move count is 20', () {
      expect(newGame().legalMoves.length, equals(20));
    });
  });

  group('Apply move', () {
    test('e4 places pawn and clears source', () {
      final g = newGame();
      final m = g.legalMoves.firstWhere((m) => m.r == 6 && m.c == 4 && m.tr == 4);
      final g2 = applyMove(g, m);
      expect(g2.board[4][4], equals(P));
      expect(g2.board[6][4], equals(0));
    });

    test('e4 sets en passant square', () {
      final g = newGame();
      final m = g.legalMoves.firstWhere((m) => m.r == 6 && m.c == 4 && m.tr == 4);
      final g2 = applyMove(g, m);
      expect(g2.epR, equals(5));
      expect(g2.epC, equals(4));
    });

    test('single push does not set en passant', () {
      final g = newGame();
      final m = g.legalMoves.firstWhere((m) => m.r == 6 && m.c == 4 && m.tr == 5);
      final g2 = applyMove(g, m);
      expect(g2.epR, equals(-1));
    });

    test('turn flips after move', () {
      final g = newGame();
      final m = g.legalMoves.first;
      expect(applyMove(g, m).turn, equals(-1));
    });

    test('full move increments after black moves', () {
      var g = newGame();
      g = applyMove(g, g.legalMoves.firstWhere((m) => m.r == 6 && m.c == 4 && m.tr == 4));
      g = applyMove(g, g.legalMoves.firstWhere((m) => m.r == 1 && m.c == 4 && m.tr == 3));
      expect(g.fullMove, equals(2));
    });
  });

  group('Castling', () {
    test('white kingside castle moves king and rook', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[7][7] = R; b[0][4] = -K;
      final g = _makeGame(b, 1, wK: true);
      final castle = g.legalMoves.firstWhere((m) => m.castle == 'K');
      final g2 = applyMove(g, castle);
      expect(g2.board[7][6], equals(K));
      expect(g2.board[7][5], equals(R));
      expect(g2.board[7][7], equals(0));
    });

    test('white queenside castle moves king and rook', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[7][0] = R; b[0][4] = -K;
      final g = _makeGame(b, 1, wQ: true);
      final castle = g.legalMoves.firstWhere((m) => m.castle == 'Q');
      final g2 = applyMove(g, castle);
      expect(g2.board[7][2], equals(K));
      expect(g2.board[7][3], equals(R));
    });
  });

  group('Promotion', () {
    test('pawn on rank 1 produces promotion moves', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[1][0] = P; b[7][4] = K; b[0][4] = -K;
      final g = _makeGame(b, 1);
      final promoTypes = g.legalMoves.where((m) => m.promo != null).map((m) => m.promo).toSet();
      expect(promoTypes, containsAll([Q, R, B, N]));
    });

    test('promotion to queen places queen', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[1][0] = P; b[7][4] = K; b[0][4] = -K;
      final g = _makeGame(b, 1);
      final promo = g.legalMoves.firstWhere((m) => m.promo == Q);
      final g2 = applyMove(g, promo);
      expect(g2.board[0][0], equals(Q));
    });
  });

  group('Check / checkmate / stalemate', () {
    test('scholar\'s mate is checkmate', () {
      var g = newGame();
      final moves = [
        [6,4,4,4], [1,4,3,4], [7,5,4,2], [0,1,2,2],
        [7,3,3,7], [0,6,2,5], [3,7,1,5],
      ];
      for (final mv in moves) {
        final m = g.legalMoves.firstWhere(
          (m) => m.r == mv[0] && m.c == mv[1] && m.tr == mv[2] && m.tc == mv[3]);
        g = applyMove(g, m);
      }
      expect(g.status, equals(ChessStatus.checkmate));
      expect(g.legalMoves, isEmpty);
    });

    test('stalemate position has no legal moves', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][0] = -K; b[2][1] = Q; b[1][2] = K;
      final g = _makeGame(b, -1);
      expect(g.status, equals(ChessStatus.stalemate));
      expect(g.legalMoves, isEmpty);
    });

    test('check status is reported', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][4] = -K; b[7][4] = K; b[1][4] = R;
      final g = _makeGame(b, -1);
      expect(g.status, equals(ChessStatus.check));
    });
  });

  group('AI', () {
    test('returns a legal move from start position', () {
      final g = newGame();
      final m = getAiMove(g);
      expect(m, isNotNull);
      expect(g.legalMoves, contains(m));
    });

    test('returns null when no moves available', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][0] = -K; b[2][1] = Q; b[1][2] = K;
      final g = _makeGame(b, -1);
      expect(getAiMove(g), isNull);
    });
  });
}

// Helper: construct a ChessGame from a raw board.
// Infers check by probing whether the king can be captured by the opponent.
ChessGame _makeGame(List<List<int>> board, int turn,
    {bool wK = false, bool wQ = false, bool bK = false, bool bQ = false,
     int epR = -1, int epC = -1}) {
  final lm = getLegalMoves(board, turn, wK, wQ, bK, bQ, epR, epC).toList();
  // Determine if the side to move is in check by trying all opponent pseudo-moves.
  final oppMoves = getLegalMoves(board, -turn, false, false, false, false, -1, -1);
  int? kr, kc;
  for (var r = 0; r < 8; r++) {
    for (var c = 0; c < 8; c++) {
      if (board[r][c] == K * turn) { kr = r; kc = c; }
    }
  }
  final inCheck = kr != null && oppMoves.any((m) => m.tr == kr && m.tc == kc);
  ChessStatus status;
  if (lm.isEmpty) {
    status = inCheck ? ChessStatus.checkmate : ChessStatus.stalemate;
  } else {
    status = inCheck ? ChessStatus.check : ChessStatus.active;
  }
  return ChessGame(board: board, turn: turn, wK: wK, wQ: wQ, bK: bK, bQ: bQ,
      epR: epR, epC: epC, halfMove: 0, fullMove: 1, status: status, legalMoves: lm);
}
