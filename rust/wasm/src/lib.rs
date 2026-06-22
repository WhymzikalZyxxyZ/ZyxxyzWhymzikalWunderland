//! WebAssembly bindings for the Zyxxyz chess engine.
//! Compiled with wasm-pack; consumed by the browser chess game as a
//! progressive enhancement — the JS engine is used as fallback.

use wasm_bindgen::prelude::*;
use zyxxyz_chess::{new_game, apply_move, get_ai_move, get_legal_moves, ChessGame, ChessMove};

/// Serialisable move transferred across the WASM boundary as a JS object.
#[wasm_bindgen(getter_with_clone)]
pub struct WasmMove {
    pub r:    u8,
    pub c:    u8,
    pub tr:   u8,
    pub tc:   u8,
    pub ep:   bool,
    pub castle: Option<u8>,
    pub promo:  Option<i8>,
}

impl WasmMove {
    fn from(m: ChessMove) -> Self {
        WasmMove { r: m.r, c: m.c, tr: m.tr, tc: m.tc,
                   ep: m.ep, castle: m.castle, promo: m.promo }
    }
}

/// Opaque game handle held in JS memory.
#[wasm_bindgen]
pub struct WasmGame(ChessGame);

#[wasm_bindgen]
impl WasmGame {
    /// Create a new game from the standard starting position.
    pub fn new_game() -> WasmGame {
        WasmGame(new_game())
    }

    /// Current board as a flat 64-element Int8Array (row-major, a8=index 0).
    pub fn board(&self) -> Vec<i8> {
        self.0.board.iter().flat_map(|row| row.iter().copied()).collect()
    }

    /// Active side: 1 = white, -1 = black.
    pub fn turn(&self) -> i8 { self.0.turn }

    /// Game status as a string: "active" | "check" | "checkmate" | "stalemate".
    pub fn status(&self) -> String {
        format!("{:?}", self.0.status).to_lowercase()
    }

    /// Legal moves for the current position as a JSON string.
    pub fn legal_moves_json(&self) -> String {
        let moves: Vec<_> = self.0.legal_moves.iter().map(|m| {
            format!(r#"{{"r":{},"c":{},"tr":{},"tc":{},"ep":{},"castle":{},"promo":{}}}"#,
                m.r, m.c, m.tr, m.tc, m.ep,
                m.castle.map(|b| b.to_string()).unwrap_or("null".into()),
                m.promo.map(|p| p.to_string()).unwrap_or("null".into()),
            )
        }).collect();
        format!("[{}]", moves.join(","))
    }

    /// Apply a move (identified by r/c/tr/tc) and return the new game state.
    pub fn apply_move(&self, r: u8, c: u8, tr: u8, tc: u8) -> Option<WasmGame> {
        let m = self.0.legal_moves.iter()
            .find(|m| m.r == r && m.c == c && m.tr == tr && m.tc == tc)?;
        Some(WasmGame(apply_move(self.0.clone(), *m)))
    }

    /// Ask the AI for a move at the given depth (1–5 recommended).
    /// Returns the move as a JSON string, or null if none available.
    pub fn ai_move_json(&self, depth: u8) -> Option<String> {
        let m = get_ai_move(&self.0, depth as i32)?;
        Some(format!(r#"{{"r":{},"c":{},"tr":{},"tc":{}}}"#, m.r, m.c, m.tr, m.tc))
    }
}
