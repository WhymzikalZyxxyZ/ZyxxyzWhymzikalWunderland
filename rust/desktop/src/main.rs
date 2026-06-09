// Rust desktop chess — egui/eframe. Uses zyxxyz_chess shared engine.
use eframe::egui;
use zyxxyz_chess::{self as chess, ChessStatus};
use std::sync::{Arc, Mutex};

const CELL: f32 = 72.0;
const LIGHT: egui::Color32 = egui::Color32::from_rgb(240, 217, 181);
const DARK:  egui::Color32 = egui::Color32::from_rgb(181, 136, 99);
const SEL:   egui::Color32 = egui::Color32::from_rgb(100, 200, 100);
const MOVE_H:egui::Color32 = egui::Color32::from_rgb(200, 210, 100);

const GLYPHS: &[(i8, &str)] = &[
    (1,"♙"),(2,"♘"),(3,"♗"),(4,"♖"),(5,"♕"),(6,"♔"),
    (-1,"♟"),(-2,"♞"),(-3,"♝"),(-4,"♜"),(-5,"♛"),(-6,"♚"),
];

fn glyph(p: i8) -> &'static str {
    GLYPHS.iter().find(|&&(v,_)| v==p).map(|&(_,s)|s).unwrap_or("")
}

struct App {
    game: chess::ChessGame,
    sel: Option<(usize, usize)>,
    thinking: bool,
    ai_result: Arc<Mutex<Option<chess::ChessMove>>>,
}

impl Default for App {
    fn default() -> Self {
        Self { game: chess::new_game(), sel: None, thinking: false, ai_result: Arc::new(Mutex::new(None)) }
    }
}

impl eframe::App for App {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Poll AI result
        if self.thinking {
            if let Ok(mut guard) = self.ai_result.try_lock() {
                if let Some(m) = guard.take() {
                    self.game = chess::apply_move(&self.game, &m);
                    self.thinking = false;
                    ctx.request_repaint();
                }
            }
        }

        egui::TopBottomPanel::top("header").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.heading("♟  Zyxxyz Chess — Rust");
                if ui.button("New Game").clicked() { *self = App::default(); }
                let label = match self.game.status {
                    ChessStatus::Checkmate => "Checkmate!".to_owned(),
                    ChessStatus::Stalemate => "Stalemate".to_owned(),
                    ChessStatus::Check     => format!("{} — CHECK", if self.game.turn==1{"White"}else{"Black"}),
                    _                      => format!("{} to move", if self.game.turn==1{"White"}else{"Black"}),
                };
                ui.label(label);
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            let board_size = egui::Vec2::splat(CELL * 8.0);
            let (resp, painter) = ui.allocate_painter(board_size, egui::Sense::click());
            let origin = resp.rect.min;

            let highlights: std::collections::HashSet<(usize,usize)> = self.sel.map(|(r,c)|
                self.game.legal_moves.iter()
                    .filter(|m| m.r as usize==r && m.c as usize==c)
                    .map(|m| (m.tr as usize, m.tc as usize))
                    .collect()
            ).unwrap_or_default();

            for r in 0..8usize { for c in 0..8usize {
                let x = origin.x + c as f32 * CELL;
                let y = origin.y + r as f32 * CELL;
                let rect = egui::Rect::from_min_size(egui::pos2(x,y), egui::Vec2::splat(CELL));
                let base = if (r+c)%2==0 { LIGHT } else { DARK };
                let fill = if self.sel==Some((r,c)) { SEL }
                           else if highlights.contains(&(r,c)) { MOVE_H }
                           else { base };
                painter.rect_filled(rect, 0.0, fill);
                let p = self.game.board[r][c];
                if p != 0 {
                    let color = if p>0 { egui::Color32::WHITE } else { egui::Color32::BLACK };
                    painter.text(rect.center(), egui::Align2::CENTER_CENTER,
                                 glyph(p), egui::FontId::proportional(44.0), color);
                }
            }}

            if resp.clicked() && !self.thinking {
                if let Some(pos) = resp.interact_pointer_pos() {
                    let c = ((pos.x - origin.x) / CELL) as usize;
                    let r = ((pos.y - origin.y) / CELL) as usize;
                    if r < 8 && c < 8 {
                        if let Some((sr,sc)) = self.sel {
                            let mv = self.game.legal_moves.iter().find(|m|
                                m.r as usize==sr && m.c as usize==sc && m.tr as usize==r && m.tc as usize==c
                            ).copied();
                            if let Some(m) = mv {
                                self.game = chess::apply_move(&self.game, &m);
                                self.sel = None;
                                if matches!(self.game.status, ChessStatus::Active | ChessStatus::Check) {
                                    self.thinking = true;
                                    let game_clone = self.game.clone();
                                    let out = self.ai_result.clone();
                                    std::thread::spawn(move || {
                                        let m = chess::get_ai_move(&game_clone);
                                        *out.lock().unwrap() = m;
                                    });
                                }
                            } else {
                                self.sel = if self.game.board[r][c]!=0 && (self.game.board[r][c]>0)==(self.game.turn>0) { Some((r,c)) } else { None };
                            }
                        } else if self.game.board[r][c]!=0 && (self.game.board[r][c]>0)==(self.game.turn>0) {
                            self.sel = Some((r,c));
                        }
                    }
                }
            }
        });
    }
}

fn main() -> eframe::Result<()> {
    eframe::run_native("Zyxxyz Chess — Rust", eframe::NativeOptions::default(), Box::new(|_| Ok(Box::new(App::default()))))
}
