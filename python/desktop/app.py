"""Python desktop app — Tkinter chess + status monitor."""
from __future__ import annotations
import json
import os
import sys
import threading
import time
import tkinter as tk
import urllib.request
from tkinter import messagebox, ttk

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared'))

from chess_engine import (  # noqa: E402
    ChessGame, ChessMove, ChessStatus,
    new_game, apply_move, get_ai_move,
)

# ── Colours ──────────────────────────────────────────────────────────────────
LIGHT  = "#f0d9b5"
DARK   = "#b58863"
SEL    = "#7fc97f"
MOVE   = "#cdd26a"
BG     = "#1a1a2e"
PANEL  = "#16213e"
TEXT   = "#e0e0e0"
ACCENT = "#4b8bbe"

GLYPHS = {1:"♙",2:"♘",3:"♗",4:"♖",5:"♕",6:"♔",
          -1:"♟",-2:"♞",-3:"♝",-4:"♜",-5:"♛",-6:"♚"}

CELL = 72

# ── Chess Board ──────────────────────────────────────────────────────────────

class ChessBoard(tk.Canvas):
    def __init__(self, master, **kw):
        super().__init__(master, width=CELL*8, height=CELL*8,
                         highlightthickness=0, **kw)
        self.game: ChessGame = new_game()
        self.sel: tuple[int,int] | None = None
        self.thinking = False
        self.bind("<Button-1>", self._click)
        self._draw()

    def _draw(self):
        self.delete("all")
        highlights = set()
        if self.sel:
            for m in self.game.legal_moves:
                if m.r == self.sel[0] and m.c == self.sel[1]:
                    highlights.add((m.tr, m.tc))

        for r in range(8):
            for c in range(8):
                x, y = c*CELL, r*CELL
                base = LIGHT if (r+c) % 2 == 0 else DARK
                fill = SEL if self.sel == (r, c) else \
                       MOVE if (r, c) in highlights else base
                self.create_rectangle(x, y, x+CELL, y+CELL, fill=fill, outline="")
                piece = self.game.board[r][c]
                if piece:
                    color = "#fff9f0" if piece > 0 else "#1a1a1a"
                    self.create_text(x+CELL//2, y+CELL//2,
                                     text=GLYPHS[piece], font=("Segoe UI Symbol", 40),
                                     fill=color)

        # rank / file labels
        for i in range(8):
            self.create_text(4, i*CELL+4, text=str(8-i),
                             anchor="nw", fill="#888", font=("Consolas", 9))
            self.create_text(i*CELL+CELL-4, CELL*8-4, text="abcdefgh"[i],
                             anchor="se", fill="#888", font=("Consolas", 9))

    def _click(self, ev):
        if self.thinking or self.game.status in (ChessStatus.CHECKMATE, ChessStatus.STALEMATE):
            return
        r, c = ev.y // CELL, ev.x // CELL
        if not (0 <= r < 8 and 0 <= c < 8):
            return
        if self.sel is None:
            if self.game.board[r][c] != 0 and \
               (self.game.board[r][c] > 0) == (self.game.turn > 0):
                self.sel = (r, c)
        else:
            move = self._find_move(self.sel[0], self.sel[1], r, c)
            if move:
                self.game = apply_move(self.game, move)
                self.sel = None
                self._draw()
                self._update_status()
                if self.game.status == ChessStatus.ACTIVE or \
                   self.game.status == ChessStatus.CHECK:
                    self._ai_move()
            else:
                self.sel = (r, c) if (self.game.board[r][c] != 0 and
                    (self.game.board[r][c] > 0) == (self.game.turn > 0)) else None
        self._draw()

    def _find_move(self, r, c, tr, tc):
        candidates = [m for m in self.game.legal_moves
                      if m.r == r and m.c == c and m.tr == tr and m.tc == tc]
        if not candidates:
            return None
        # prefer queen promotion
        promos = [m for m in candidates if m.promo and abs(m.promo) == 5]
        return promos[0] if promos else candidates[0]

    def _ai_move(self):
        self.thinking = True

        def run():
            m = get_ai_move(self.game)
            if m:
                self.game = apply_move(self.game, m)
            self.thinking = False
            self.after(0, self._draw)
            self.after(0, self._update_status)

        threading.Thread(target=run, daemon=True).start()

    def _update_status(self):
        status = self.game.status
        if status == ChessStatus.CHECKMATE:
            winner = "Black" if self.game.turn == 1 else "White"
            messagebox.showinfo("Checkmate", f"{winner} wins!")
        elif status == ChessStatus.STALEMATE:
            messagebox.showinfo("Stalemate", "Draw by stalemate.")
        elif status == ChessStatus.CHECK:
            pass  # board redraw is enough visual cue

    def reset(self):
        self.game = new_game()
        self.sel = None
        self.thinking = False
        self._draw()

# ── Status Panel ─────────────────────────────────────────────────────────────

API_URL = "http://localhost:5050/api/status"

class StatusPanel(tk.Frame):
    def __init__(self, master, **kw):
        super().__init__(master, bg=PANEL, **kw)
        tk.Label(self, text="Service Status", bg=PANEL, fg=ACCENT,
                 font=("Consolas", 13, "bold")).pack(anchor="w", padx=12, pady=(10,4))
        self.tree = ttk.Treeview(self, columns=("label","ok","latency","uptime"),
                                  show="headings", height=8)
        for col, w, text in [("label",140,"Service"),("ok",50,"OK"),
                               ("latency",80,"Latency"),("uptime",90,"Uptime")]:
            self.tree.heading(col, text=text)
            self.tree.column(col, width=w, anchor="center")
        self.tree.pack(fill="both", expand=True, padx=8, pady=4)

        self.status_var = tk.StringVar(value="Polling…")
        tk.Label(self, textvariable=self.status_var, bg=PANEL, fg="#888",
                 font=("Consolas", 9)).pack(anchor="w", padx=12, pady=(0,8))
        self._poll()

    def _poll(self):
        threading.Thread(target=self._fetch, daemon=True).start()
        self.after(10_000, self._poll)

    def _fetch(self):
        try:
            with urllib.request.urlopen(API_URL, timeout=3) as r:
                data = json.loads(r.read())
            self.after(0, lambda: self._update(data, ok=True))
        except Exception as e:
            self.after(0, lambda: self.status_var.set(f"Unreachable: {e}"))

    def _update(self, data, ok):
        self.tree.delete(*self.tree.get_children())
        for svc in data:
            tag = "ok" if svc.get("ok") else "err"
            self.tree.insert("", "end", values=(
                svc.get("label","?"),
                "✓" if svc.get("ok") else "✗",
                f"{svc.get('latency',0)} ms",
                f"{svc.get('uptime',0)*100:.1f}%",
            ), tags=(tag,))
        self.tree.tag_configure("ok",  foreground="#5cb85c")
        self.tree.tag_configure("err", foreground="#d9534f")
        self.status_var.set(f"Updated {time.strftime('%H:%M:%S')}")

# ── Main window ──────────────────────────────────────────────────────────────

def main():
    root = tk.Tk()
    root.title("Zyxxyz Wunderland — Python")
    root.configure(bg=BG)
    root.resizable(False, False)

    # Header
    hdr = tk.Frame(root, bg=BG)
    hdr.pack(fill="x", padx=12, pady=(10, 0))
    tk.Label(hdr, text="♟  Chess", bg=BG, fg=ACCENT,
             font=("Consolas", 18, "bold")).pack(side="left")
    tk.Button(hdr, text="New Game", command=lambda: board.reset(),
              bg="#0f3460", fg=TEXT, activebackground="#e94560",
              relief="flat", padx=10).pack(side="right")

    # Body: board + side panel
    body = tk.Frame(root, bg=BG)
    body.pack(padx=12, pady=10)

    board = ChessBoard(body, bg=BG)
    board.grid(row=0, column=0, padx=(0, 12))

    side = tk.Frame(body, bg=BG)
    side.grid(row=0, column=1, sticky="ns")

    # Turn indicator
    turn_var = tk.StringVar(value="White to move")
    tk.Label(side, textvariable=turn_var, bg=BG, fg=TEXT,
             font=("Consolas", 11)).pack(anchor="w", pady=(0, 8))

    def refresh_turn():
        t = board.game.turn
        s = board.game.status
        if s == ChessStatus.CHECKMATE:
            turn_var.set("Checkmate!")
        elif s == ChessStatus.STALEMATE:
            turn_var.set("Stalemate")
        elif s == ChessStatus.CHECK:
            turn_var.set(f"{'White' if t==1 else 'Black'} — CHECK")
        else:
            turn_var.set(f"{'White' if t==1 else 'Black'} to move")
        root.after(200, refresh_turn)

    refresh_turn()

    StatusPanel(side).pack(fill="both", expand=True)

    root.mainloop()

if __name__ == "__main__":
    main()
