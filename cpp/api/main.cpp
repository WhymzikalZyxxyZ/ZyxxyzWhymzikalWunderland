#include "chess_engine.h"
#include <cstdio>

int main() {
    chess::Game g = chess::newGame();
    std::printf("Starting position: %zu legal moves\n", g.legalMoves.size());
    return 0;
}
