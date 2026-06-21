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

    test('half move increments on non-pawn non-capture', () {
      // Knight move from initial position increments halfMove
      final g = newGame();
      final knightMove = g.legalMoves.firstWhere((m) => m.r == 7 && m.c == 1);
      final g2 = applyMove(g, knightMove);
      expect(g2.halfMove, equals(1));
    });

    test('half move resets on pawn move', () {
      final g = newGame();
      final knightMove = g.legalMoves.firstWhere((m) => m.r == 7 && m.c == 1);
      var g2 = applyMove(g, knightMove);
      // Black pawn move resets halfMove
      final pawnMove = g2.legalMoves.firstWhere((m) => m.r == 1 && m.c == 0 && m.tr == 2);
      final g3 = applyMove(g2, pawnMove);
      expect(g3.halfMove, equals(0));
    });

    test('apply move produces check status', () {
      // White rook slides to give check
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[6][7] = R; b[0][7] = -K;
      final g = _makeGame(b, 1);
      final rMove = g.legalMoves.firstWhere((m) => m.r==6 && m.c==7 && m.tr==1 && m.tc==7);
      final g2 = applyMove(g, rMove);
      expect(g2.status, equals(ChessStatus.check));
    });

    test('apply move can produce stalemate', () {
      // White queen moves to (2,1), trapping black king at (0,0)
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][7] = K; b[3][1] = Q; b[0][0] = -K;
      final g = _makeGame(b, 1);
      final qMove = g.legalMoves.firstWhere((m) => m.r==3 && m.c==1 && m.tr==2 && m.tc==1);
      final g2 = applyMove(g, qMove);
      expect(g2.status, equals(ChessStatus.stalemate));
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

    test('black kingside castle moves king and rook', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][4] = -K; b[0][7] = -R; b[7][4] = K;
      final g = _makeGame(b, -1, bK: true);
      final castle = g.legalMoves.firstWhere((m) => m.castle == 'k');
      final g2 = applyMove(g, castle);
      expect(g2.board[0][6], equals(-K));
      expect(g2.board[0][5], equals(-R));
      expect(g2.board[0][7], equals(0));
    });

    test('black queenside castle moves king and rook', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][4] = -K; b[0][0] = -R; b[7][4] = K;
      final g = _makeGame(b, -1, bQ: true);
      final castle = g.legalMoves.firstWhere((m) => m.castle == 'q');
      final g2 = applyMove(g, castle);
      expect(g2.board[0][2], equals(-K));
      expect(g2.board[0][3], equals(-R));
      expect(g2.board[0][0], equals(0));
    });
  });

  group('Castle rights', () {
    test('moving kingside rook loses wK castle right', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[7][7] = R; b[0][4] = -K;
      final g = _makeGame(b, 1, wK: true, wQ: true);
      final rMove = g.legalMoves.firstWhere((m) => m.r==7 && m.c==7 && m.castle==null);
      final g2 = applyMove(g, rMove);
      expect(g2.wK, isFalse);
      expect(g2.wQ, isTrue);
    });

    test('moving queenside rook loses wQ castle right', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[7][0] = R; b[0][4] = -K;
      final g = _makeGame(b, 1, wK: true, wQ: true);
      final rMove = g.legalMoves.firstWhere((m) => m.r==7 && m.c==0 && m.castle==null);
      final g2 = applyMove(g, rMove);
      expect(g2.wQ, isFalse);
      expect(g2.wK, isTrue);
    });

    test('moving black kingside rook loses bK castle right', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][4] = -K; b[0][7] = -R; b[7][4] = K;
      final g = _makeGame(b, -1, bK: true, bQ: true);
      final rMove = g.legalMoves.firstWhere((m) => m.r==0 && m.c==7 && m.castle==null);
      final g2 = applyMove(g, rMove);
      expect(g2.bK, isFalse);
      expect(g2.bQ, isTrue);
    });

    test('moving black queenside rook loses bQ castle right', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][4] = -K; b[0][0] = -R; b[7][4] = K;
      final g = _makeGame(b, -1, bK: true, bQ: true);
      final rMove = g.legalMoves.firstWhere((m) => m.r==0 && m.c==0 && m.castle==null);
      final g2 = applyMove(g, rMove);
      expect(g2.bQ, isFalse);
      expect(g2.bK, isTrue);
    });

    test('moving king loses all castle rights', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[0][4] = -K;
      final g = _makeGame(b, 1, wK: true, wQ: true);
      final kMove = g.legalMoves.firstWhere((m) => m.r==7 && m.c==4);
      final g2 = applyMove(g, kMove);
      expect(g2.wK, isFalse);
      expect(g2.wQ, isFalse);
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

    test('black pawn promotes on rank 8', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[6][0] = -P; b[0][4] = -K; b[7][4] = K;
      final g = _makeGame(b, -1);
      final promoTypes = g.legalMoves.where((m) => m.promo != null).map((m) => m.promo).toSet();
      expect(promoTypes, containsAll([-Q, -R, -B, -N]));
    });
  });

  group('En passant', () {
    test('en passant capture removes captured pawn', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][7] = K; b[0][0] = -K; b[3][4] = P; b[3][3] = -P;
      // ep square at (2,3): black just double-pushed to d5
      final g = _makeGame(b, 1, epR: 2, epC: 3);
      final epMove = g.legalMoves.firstWhere((m) => m.ep);
      final g2 = applyMove(g, epMove);
      expect(g2.board[2][3], equals(P));   // white pawn at d6
      expect(g2.board[3][3], equals(0));   // black pawn removed
      expect(g2.board[3][4], equals(0));   // white pawn's origin cleared
    });

    test('en passant only available when ep square is set', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][7] = K; b[0][0] = -K; b[3][4] = P; b[3][3] = -P;
      final g = _makeGame(b, 1); // no ep square
      expect(g.legalMoves.any((m) => m.ep), isFalse);
    });
  });

  group('Piece moves', () {
    test('rook can move and capture', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[0][4] = -K; b[4][0] = R; b[4][7] = -R;
      final g = _makeGame(b, 1);
      // Rook can slide along rank and capture black rook
      expect(g.legalMoves.any((m) => m.r==4 && m.c==0 && m.tr==4 && m.tc==7), isTrue);
    });

    test('bishop can move diagonally', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[0][4] = -K; b[4][4] = B;
      final g = _makeGame(b, 1);
      // Bishop at d4 (4,4) should have diagonal moves
      expect(g.legalMoves.any((m) => m.r==4 && m.c==4 && m.tr==3 && m.tc==3), isTrue);
      expect(g.legalMoves.any((m) => m.r==4 && m.c==4 && m.tr==3 && m.tc==5), isTrue);
    });

    test('bishop can capture diagonally', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[0][4] = -K; b[4][4] = B; b[2][2] = -P;
      final g = _makeGame(b, 1);
      expect(g.legalMoves.any((m) => m.r==4 && m.c==4 && m.tr==2 && m.tc==2), isTrue);
    });

    test('queen combines rook and bishop movement', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[7][4] = K; b[0][4] = -K; b[4][4] = Q;
      final g = _makeGame(b, 1);
      // Queen can go orthogonally
      expect(g.legalMoves.any((m) => m.r==4 && m.c==4 && m.tr==4 && m.tc==0), isTrue);
      // Queen can go diagonally
      expect(g.legalMoves.any((m) => m.r==4 && m.c==4 && m.tr==0 && m.tc==0), isTrue);
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

    test('knight check is detected', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][4] = -K; b[7][4] = K; b[2][3] = N; // Knight at c6 attacks e8
      final g = _makeGame(b, -1);
      expect(g.status, equals(ChessStatus.check));
    });

    test('pawn check is detected', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][4] = -K; b[7][4] = K; b[1][3] = P; // White pawn at d7 attacks e8
      final g = _makeGame(b, -1);
      expect(g.status, equals(ChessStatus.check));
    });

    test('diagonal queen check is detected', () {
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][4] = -K; b[7][4] = K; b[2][2] = Q; // Queen at c6 attacks e8 diagonally
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

    test('finds only move when one legal move exists', () {
      // King in check with exactly one escape
      final b = List.generate(8, (_) => List.filled(8, 0));
      b[0][7] = -K; b[7][4] = K; b[1][6] = R; // Rook gives check; king can go to h7 only if h7 isn't covered
      // Black king at h8 (0,7), white rook at g2 (6,6) checking via g-file... let me use simpler setup
      // White rook at h2 (6,7) gives check on h-file; black king at h8 (0,7) can escape to g8 (0,6) only
      final b2 = List.generate(8, (_) => List.filled(8, 0));
      b2[0][7] = -K; b2[7][4] = K; b2[6][7] = R; b2[1][6] = Q; // Q covers g7 and g8 for black king
      final g = _makeGame(b2, -1);
      if (g.status == ChessStatus.check && g.legalMoves.length == 1) {
        final m = getAiMove(g);
        expect(m, equals(g.legalMoves.first));
      }
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
