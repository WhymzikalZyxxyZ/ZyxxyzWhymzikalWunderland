#pragma once
// Chess engine — C++17. Same PST/alpha-beta logic as all other implementations.
#include <array>
#include <vector>
#include <optional>
#include <algorithm>
#include <climits>

namespace chess {

constexpr int P=1,N=2,B=3,R=4,Q=5,K=6;

enum class Status { Active, Check, Checkmate, Stalemate };

struct Move {
    int r,c,tr,tc;
    std::optional<int> promo;
    char castle{0};   // 'K','Q','k','q' or 0
    bool ep{false}, doublePush{false};
    bool operator==(const Move& o) const {
        return r==o.r&&c==o.c&&tr==o.tr&&tc==o.tc&&promo==o.promo;
    }
};

using Board = std::array<std::array<int,8>,8>;

struct Game {
    Board board{};
    int turn{1};
    bool wK{true},wQ{true},bK{true},bQ{true};
    int epR{-1},epC{-1};
    int halfMove{0},fullMove{1};
    Status status{Status::Active};
    std::vector<Move> legalMoves;
};

// ── PST tables ────────────────────────────────────────────────────────────────
inline const std::array<int,64> PST_P{
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
};
inline const std::array<int,64> PST_N{
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50,
};
inline const std::array<int,64> PST_B{
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20,
};
inline const std::array<int,64> PST_R{
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0,
};
inline const std::array<int,64> PST_Q{
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20,
};
inline const std::array<int,64> PST_K{
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20,
};

inline int pieceVal(int p) {
    switch(std::abs(p)){case 1:return 100;case 2:return 320;case 3:return 330;
                        case 4:return 500;case 5:return 900;case 6:return 20000;} return 0;
}

inline const std::array<int,64>& pstFor(int abs_p) {
    switch(abs_p){case 1:return PST_P;case 2:return PST_N;case 3:return PST_B;
                  case 4:return PST_R;case 5:return PST_Q;} return PST_K;
}

// ── Public functions ─────────────────────────────────────────────────────────
Game  newGame();
Game  applyMove(const Game& g, const Move& m);
std::vector<Move> getLegalMoves(const Board& b, int turn, bool wK, bool wQ, bool bK, bool bQ, int epR, int epC);
std::optional<Move> getAiMove(const Game& g);

} // namespace chess
