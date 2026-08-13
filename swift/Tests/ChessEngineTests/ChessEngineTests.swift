import XCTest
@testable import ChessEngine

final class ChessEngineTests: XCTestCase {

    // ── Board setup ──────────────────────────────────────────────────────────

    func testInitialBoardCornersAreRooks() {
        let g = newGame()
        XCTAssertEqual(g.board[0][0], -R)
        XCTAssertEqual(g.board[0][7], -R)
        XCTAssertEqual(g.board[7][0],  R)
        XCTAssertEqual(g.board[7][7],  R)
    }

    func testInitialBoardKings() {
        let g = newGame()
        XCTAssertEqual(g.board[0][4], -K)
        XCTAssertEqual(g.board[7][4],  K)
    }

    func testWhiteToMoveFirst() {
        XCTAssertEqual(newGame().turn, 1)
    }

    func testInitialStatusIsActive() {
        XCTAssertEqual(newGame().status, .active)
    }

    func testInitialLegalMoveCountIs20() {
        XCTAssertEqual(newGame().legalMoves.count, 20)
    }

    // ── Apply move ───────────────────────────────────────────────────────────

    func testE4PlacesPawnAndClearsSource() {
        let g = newGame()
        let m = g.legalMoves.first { $0.r == 6 && $0.c == 4 && $0.tr == 4 }!
        let g2 = applyMove(g, m)
        XCTAssertEqual(g2.board[4][4], P)
        XCTAssertEqual(g2.board[6][4], 0)
    }

    func testE4SetsEnPassantSquare() {
        let g = newGame()
        let m = g.legalMoves.first { $0.r == 6 && $0.c == 4 && $0.tr == 4 }!
        let g2 = applyMove(g, m)
        XCTAssertEqual(g2.epR, 5)
        XCTAssertEqual(g2.epC, 4)
    }

    func testTurnFlipsAfterMove() {
        let g = newGame()
        let m = g.legalMoves[0]
        XCTAssertEqual(applyMove(g, m).turn, -1)
    }

    func testFullMoveIncrementsAfterBlackMoves() {
        var g = newGame()
        g = applyMove(g, g.legalMoves.first { $0.r == 6 && $0.c == 4 && $0.tr == 4 }!)
        g = applyMove(g, g.legalMoves.first { $0.r == 1 && $0.c == 4 && $0.tr == 3 }!)
        XCTAssertEqual(g.fullMove, 2)
    }

    func testHalfMoveResetsOnPawnMove() {
        let g = newGame()
        let m = g.legalMoves[0]
        XCTAssertEqual(applyMove(g, m).halfMove, 0)
    }

    // Regression: applyMove computed the capture check against the
    // already-mutated post-move board, so the destination square was
    // never empty and halfMove silently reset to 0 on every move —
    // breaking the fifty-move-rule clock. See commit history for details.
    func testHalfMoveIncrementsOnNonPawnNonCapture() {
        let g = newGame()
        let m = g.legalMoves.first { $0.r == 7 && $0.c == 1 }! // Nb1
        let g2 = applyMove(g, m)
        XCTAssertEqual(g2.halfMove, 1)
    }

    // ── Castling ─────────────────────────────────────────────────────────────

    func testWhiteKingsideCastleMovesKingAndRook() {
        var board = Array(repeating: Array(repeating: 0, count: 8), count: 8)
        board[7][4] = K; board[7][7] = R; board[0][4] = -K
        let moves = getLegalMoves(board, turn: 1, wK: true, wQ: false, bK: false, bQ: false, epR: -1, epC: -1)
        let g = ChessGame(board: board, turn: 1, wK: true, wQ: false, bK: false, bQ: false,
                           epR: -1, epC: -1, halfMove: 0, fullMove: 1, status: .active, legalMoves: moves)
        let castle = g.legalMoves.first { $0.castle == "K" }!
        let g2 = applyMove(g, castle)
        XCTAssertEqual(g2.board[7][6], K)
        XCTAssertEqual(g2.board[7][5], R)
        XCTAssertEqual(g2.board[7][7], 0)
    }
}
