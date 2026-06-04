cmake_minimum_required(VERSION 3.20)
project(ZyxxyzChess CXX)
set(CMAKE_CXX_STANDARD 17)

# Shared chess engine
add_library(chess_engine STATIC shared/chess_engine.cpp shared/chess_engine.h)
target_include_directories(chess_engine PUBLIC shared)

# Desktop (requires SDL2: apt install libsdl2-dev or vcpkg install sdl2)
find_package(SDL2 QUIET)
if(SDL2_FOUND)
    add_executable(chess_desktop desktop/main.cpp)
    target_link_libraries(chess_desktop PRIVATE chess_engine SDL2::SDL2)
endif()

# API (header-only HTTP via cpp-httplib: single-header, bundled)
add_executable(chess_api api/main.cpp)
target_link_libraries(chess_api PRIVATE chess_engine)
