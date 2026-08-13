// Chess engine tests — C++. Plain assert-based, no external framework.
#include "chess_engine.h"
#include <algorithm>
#include <cstdio>
#include <cstdlib>
#include <optional>
#include <vector>

using namespace chess;

static int failures = 0;
static int checks = 0;

static void check(bool cond, const char* name) {
    checks++;
    if (!cond) {
        failures++;
        std::fprintf(stderr, "FAILED: %s\n", name);
    }
}

#define CHECK(cond) check((cond), #cond)

static Board emptyBoard() {
    Board b{};
    for (auto& row : b) row.fill(0);
    return b;
}

// chess::inCheck has internal linkage in chess_engine.cpp and isn't exposed
// via the header, so — mirroring the Dart/Python test helpers — infer check
// by asking whether any of the opponent's legal moves could land on the
// king's square.
static Game makeGame(Board board, int turn, bool wK, bool wQ, bool bK, bool bQ, int epR, int epC) {
    std::vector<Move> legal = getLegalMoves(board, turn, wK, wQ, bK, bQ, epR, epC);

    int kr = -1, kc = -1;
    for (int r = 0; r < 8; r++)
        for (int c = 0; c < 8; c++)
            if (board[r][c] == K * turn) { kr = r; kc = c; }

    std::vector<Move> oppMoves = getLegalMoves(board, -turn, false, false, false, false, -1, -1);
    bool inCheckNow = kr >= 0 && std::any_of(oppMoves.begin(), oppMoves.end(),
        [&](const Move& m) { return m.tr == kr && m.tc == kc; });

    Status status;
    if (legal.empty()) status = inCheckNow ? Status::Checkmate : Status::Stalemate;
    else                status = inCheckNow ? Status::Check    : Status::Active;

    Game g;
    g.board = board;
    g.turn = turn;
    g.wK = wK; g.wQ = wQ; g.bK = bK; g.bQ = bQ;
    g.epR = epR; g.epC = epC;
    g.halfMove = 0; g.fullMove = 1;
    g.legalMoves = legal;
    g.status = status;
    return g;
}

static std::optional<Move> find(const std::vector<Move>& moves, int r, int c, int tr, int tc) {
    for (const auto& m : moves) if (m.r==r && m.c==c && m.tr==tr && m.tc==tc) return m;
    return std::nullopt;
}

int main() {
    // ── Board setup ──────────────────────────────────────────────────────
    {
        Game g = newGame();
        CHECK(g.board[0][0] == -R);
        CHECK(g.board[0][7] == -R);
        CHECK(g.board[7][0] ==  R);
        CHECK(g.board[7][7] ==  R);
        CHECK(g.turn == 1);
        CHECK(g.status == Status::Active);
        CHECK(g.legalMoves.size() == 20);
    }

    // ── Apply move ───────────────────────────────────────────────────────
    {
        Game g = newGame();
        auto m = find(g.legalMoves, 6, 4, 4, 4);
        CHECK(m.has_value());
        Game g2 = applyMove(g, *m);
        CHECK(g2.board[4][4] == P);
        CHECK(g2.board[6][4] == 0);
        CHECK(g2.epR == 5);
        CHECK(g2.epC == 4);
        CHECK(g2.turn == -1);
    }

    {
        Game g = newGame();
        auto m = find(g.legalMoves, 6, 4, 5, 4);
        CHECK(m.has_value());
        Game g2 = applyMove(g, *m);
        CHECK(g2.epR == -1);
        CHECK(g2.halfMove == 0);
    }

    // Regression: applyMove computed the capture check against the already-
    // mutated post-move board, so the destination square was never empty and
    // halfMove silently reset to 0 on every move — breaking the fifty-move-
    // rule clock. See commit history for details.
    {
        Game g = newGame();
        auto m = find(g.legalMoves, 7, 1, 5, 0); // Nb1-a3
        CHECK(m.has_value());
        Game g2 = applyMove(g, *m);
        CHECK(g2.halfMove == 1);
    }

    {
        Game g = newGame();
        auto m1 = find(g.legalMoves, 6, 4, 4, 4);
        Game g2 = applyMove(g, *m1);
        auto m2 = find(g2.legalMoves, 1, 4, 3, 4);
        CHECK(m2.has_value());
        Game g3 = applyMove(g2, *m2);
        CHECK(g3.fullMove == 2);
    }

    // ── Castling ─────────────────────────────────────────────────────────
    {
        Board b = emptyBoard();
        b[7][4] = K; b[7][7] = R; b[0][4] = -K;
        Game g = makeGame(b, 1, true, false, false, false, -1, -1);
        auto it = std::find_if(g.legalMoves.begin(), g.legalMoves.end(),
                                [](const Move& m) { return m.castle == 'K'; });
        CHECK(it != g.legalMoves.end());
        Game g2 = applyMove(g, *it);
        CHECK(g2.board[7][6] == K);
        CHECK(g2.board[7][5] == R);
        CHECK(g2.board[7][7] == 0);
    }

    {
        Board b = emptyBoard();
        b[7][4] = K; b[7][7] = R; b[0][4] = -K;
        Game g = makeGame(b, 1, true, true, false, false, -1, -1);
        auto it = std::find_if(g.legalMoves.begin(), g.legalMoves.end(),
                                [](const Move& m) { return m.r==7 && m.c==7 && m.castle==0; });
        CHECK(it != g.legalMoves.end());
        Game g2 = applyMove(g, *it);
        CHECK(g2.wK == false);
        CHECK(g2.wQ == true);
    }

    {
        Board b = emptyBoard();
        b[7][4] = K; b[0][4] = -K;
        Game g = makeGame(b, 1, true, true, false, false, -1, -1);
        auto it = std::find_if(g.legalMoves.begin(), g.legalMoves.end(),
                                [](const Move& m) { return m.r==7 && m.c==4; });
        CHECK(it != g.legalMoves.end());
        Game g2 = applyMove(g, *it);
        CHECK(g2.wK == false);
        CHECK(g2.wQ == false);
    }

    // ── Promotion ────────────────────────────────────────────────────────
    {
        Board b = emptyBoard();
        b[1][0] = P; b[7][4] = K; b[0][4] = -K;
        Game g = makeGame(b, 1, false, false, false, false, -1, -1);
        int promoCount = 0;
        for (auto& m : g.legalMoves) if (m.promo.has_value()) promoCount++;
        CHECK(promoCount == 4);
        auto it = std::find_if(g.legalMoves.begin(), g.legalMoves.end(),
                                [](const Move& m) { return m.promo.has_value() && *m.promo == Q; });
        CHECK(it != g.legalMoves.end());
        Game g2 = applyMove(g, *it);
        CHECK(g2.board[0][0] == Q);
    }

    // ── En passant ───────────────────────────────────────────────────────
    {
        Board b = emptyBoard();
        b[7][7] = K; b[0][0] = -K; b[3][4] = P; b[3][3] = -P;
        Game g = makeGame(b, 1, false, false, false, false, 2, 3);
        auto it = std::find_if(g.legalMoves.begin(), g.legalMoves.end(),
                                [](const Move& m) { return m.ep; });
        CHECK(it != g.legalMoves.end());
        Game g2 = applyMove(g, *it);
        CHECK(g2.board[2][3] == P);
        CHECK(g2.board[3][3] == 0);
        CHECK(g2.board[3][4] == 0);
    }

    // ── Piece moves ──────────────────────────────────────────────────────
    {
        Board b = emptyBoard();
        b[7][4] = K; b[0][4] = -K; b[4][0] = R; b[4][7] = -R;
        Game g = makeGame(b, 1, false, false, false, false, -1, -1);
        CHECK(find(g.legalMoves, 4, 0, 4, 7).has_value());
    }

    {
        Board b = emptyBoard();
        b[7][4] = K; b[0][4] = -K; b[4][4] = B;
        Game g = makeGame(b, 1, false, false, false, false, -1, -1);
        CHECK(find(g.legalMoves, 4, 4, 3, 3).has_value());
    }

    {
        Board b = emptyBoard();
        b[7][4] = K; b[0][4] = -K; b[4][4] = Q;
        Game g = makeGame(b, 1, false, false, false, false, -1, -1);
        CHECK(find(g.legalMoves, 4, 4, 4, 0).has_value());
        CHECK(find(g.legalMoves, 4, 4, 0, 0).has_value());
    }

    // ── Check / checkmate / stalemate ───────────────────────────────────
    {
        // Scholar's mate
        Game g = newGame();
        int seq[7][4] = {
            {6,4,4,4}, {1,4,3,4}, {7,5,4,2}, {0,1,2,2},
            {7,3,3,7}, {0,6,2,5}, {3,7,1,5},
        };
        for (auto& mv : seq) {
            auto m = find(g.legalMoves, mv[0], mv[1], mv[2], mv[3]);
            CHECK(m.has_value());
            g = applyMove(g, *m);
        }
        CHECK(g.status == Status::Checkmate);
        CHECK(g.legalMoves.empty());
    }

    {
        Board b = emptyBoard();
        b[0][0] = -K; b[2][1] = Q; b[1][2] = K;
        Game g = makeGame(b, -1, false, false, false, false, -1, -1);
        CHECK(g.status == Status::Stalemate);
        CHECK(g.legalMoves.empty());
    }

    {
        Board b = emptyBoard();
        b[0][4] = -K; b[7][4] = K; b[1][4] = R;
        Game g = makeGame(b, -1, false, false, false, false, -1, -1);
        CHECK(g.status == Status::Check);
    }

    // ── AI ───────────────────────────────────────────────────────────────
    {
        Game g = newGame();
        auto m = getAiMove(g);
        CHECK(m.has_value());
        CHECK(find(g.legalMoves, m->r, m->c, m->tr, m->tc).has_value());
    }

    {
        Board b = emptyBoard();
        b[0][0] = -K; b[2][1] = Q; b[1][2] = K;
        Game g = makeGame(b, -1, false, false, false, false, -1, -1);
        CHECK(!getAiMove(g).has_value());
    }

    std::printf("checks: %d, failures: %d\n", checks, failures);
    return failures == 0 ? 0 : 1;
}
