// Chess engine — Swift. Value types throughout; no GC, ARC-managed.
import Foundation

public let P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6

public enum ChessStatus: String { case active, check, checkmate, stalemate }

public struct ChessMove: Equatable, Hashable {
    public let r, c, tr, tc: Int
    public var promo: Int? = nil
    public var castle: Character? = nil
    public var ep: Bool = false
    public var doublePush: Bool = false
    public init(_ r: Int,_ c: Int,_ tr: Int,_ tc: Int) {
        self.r=r; self.c=c; self.tr=tr; self.tc=tc
    }
}

public struct ChessGame {
    public var board: [[Int]]
    public var turn: Int          // 1 = white, -1 = black
    public var wK, wQ, bK, bQ: Bool
    public var epR, epC: Int
    public var halfMove, fullMove: Int
    public var status: ChessStatus
    public var legalMoves: [ChessMove]
}

// ── PST tables ───────────────────────────────────────────────────────────────
private let PST_P = [ 0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50,
  10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
   0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5,
   5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0 ]
private let PST_N = [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,
  -30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,
  -30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,
  -40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50 ]
private let PST_B = [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,
  -10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,
  -10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,
  -10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20 ]
private let PST_R = [ 0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5,
  -5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,
  -5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,
  -5,0,0,0,0,0,0,-5, 0,0,0,5,5,0,0,0 ]
private let PST_Q = [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,
  -10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,
   0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,
  -10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20 ]
private let PST_K = [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,
   20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20 ]
private let PST: [Int: [Int]] = [P: PST_P, N: PST_N, B: PST_B, R: PST_R, Q: PST_Q, K: PST_K]
private let VAL: [Int: Int] = [P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000]

// ── Helpers ──────────────────────────────────────────────────────────────────
private func inb(_ r: Int,_ c: Int) -> Bool { r >= 0 && r < 8 && c >= 0 && c < 8 }

private func attacked(_ b: [[Int]],_ r: Int,_ c: Int, by: Int) -> Bool {
    for (dr,dc) in [(1,0),(-1,0),(0,1),(0,-1)] {
        var (tr,tc)=(r+dr,c+dc)
        while inb(tr,tc) { let p=b[tr][tc]; if p==0 {tr+=dr;tc+=dc;continue}; if p==R*by||p==Q*by {return true}; break }
    }
    for (dr,dc) in [(1,1),(1,-1),(-1,1),(-1,-1)] {
        var (tr,tc)=(r+dr,c+dc)
        while inb(tr,tc) { let p=b[tr][tc]; if p==0 {tr+=dr;tc+=dc;continue}; if p==B*by||p==Q*by {return true}; break }
    }
    for (dr,dc) in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)] {
        if inb(r+dr,c+dc)&&b[r+dr][c+dc]==N*by { return true }
    }
    let pd = by==1 ? 1 : -1
    if inb(r+pd,c-1)&&b[r+pd][c-1]==P*by { return true }
    if inb(r+pd,c+1)&&b[r+pd][c+1]==P*by { return true }
    for dr in -1...1 { for dc in -1...1 {
        if dr==0&&dc==0 { continue }
        if inb(r+dr,c+dc)&&b[r+dr][c+dc]==K*by { return true }
    }}
    return false
}

private func inCheck(_ b: [[Int]], turn: Int) -> Bool {
    for r in 0..<8 { for c in 0..<8 { if b[r][c]==K*turn { return attacked(b,r,c,by: -turn) } } }
    return false
}

private func applyRaw(_ board: [[Int]],_ m: ChessMove) -> [[Int]] {
    var b = board
    let piece = b[m.r][m.c]
    b[m.tr][m.tc] = m.promo ?? piece; b[m.r][m.c] = 0
    if m.ep { b[m.r][m.tc] = 0 }
    switch m.castle {
    case "K": b[7][5]=R;  b[7][7]=0
    case "Q": b[7][3]=R;  b[7][0]=0
    case "k": b[0][5] = -R; b[0][7]=0
    case "q": b[0][3] = -R; b[0][0]=0
    default: break
    }
    return b
}

// ── Move generation ──────────────────────────────────────────────────────────
private func pseudoMoves(_ b: [[Int]],_ r: Int,_ c: Int, turn: Int,
                          wK: Bool, wQ: Bool, bK: Bool, bQ: Bool,
                          epR: Int, epC: Int) -> [ChessMove] {
    var moves = [ChessMove]()
    let p = abs(b[r][c])
    switch p {
    case P:
        let d = -turn, start = turn==1 ? 6 : 1, promo = turn==1 ? 0 : 7
        if inb(r+d,c) && b[r+d][c]==0 {
            if r+d==promo { for q in [Q*turn,R*turn,B*turn,N*turn] { var m=ChessMove(r,c,r+d,c); m.promo=q; moves.append(m) } }
            else {
                moves.append(ChessMove(r,c,r+d,c))
                if r==start && b[r+2*d][c]==0 { var m=ChessMove(r,c,r+2*d,c); m.doublePush=true; moves.append(m) }
            }
        }
        for dc in [-1,1] {
            let (tr,tc)=(r+d,c+dc); if !inb(tr,tc) { continue }
            let cap=b[tr][tc] != 0 && (b[tr][tc]>0) != (turn>0), ep = tr==epR&&tc==epC
            if cap||ep {
                if tr==promo { for q in [Q*turn,R*turn,B*turn,N*turn] { var m=ChessMove(r,c,tr,tc); m.promo=q; m.ep=ep; moves.append(m) } }
                else { var m=ChessMove(r,c,tr,tc); m.ep=ep; moves.append(m) }
            }
        }
    case N:
        for (dr,dc) in [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)] {
            let (tr,tc)=(r+dr,c+dc)
            if inb(tr,tc) && !(b[tr][tc] != 0 && (b[tr][tc]>0)==(turn>0)) { moves.append(ChessMove(r,c,tr,tc)) }
        }
    case B: addSlider(&moves,b,r,c,turn: turn,dirs: [(1,1),(1,-1),(-1,1),(-1,-1)])
    case R: addSlider(&moves,b,r,c,turn: turn,dirs: [(1,0),(-1,0),(0,1),(0,-1)])
    case Q: addSlider(&moves,b,r,c,turn: turn,dirs: [(1,1),(1,-1),(-1,1),(-1,-1)]); addSlider(&moves,b,r,c,turn: turn,dirs: [(1,0),(-1,0),(0,1),(0,-1)])
    case K:
        for dr in -1...1 { for dc in -1...1 {
            if dr==0&&dc==0 { continue }
            let (tr,tc)=(r+dr,c+dc)
            if inb(tr,tc) && !(b[tr][tc] != 0 && (b[tr][tc]>0)==(turn>0)) { moves.append(ChessMove(r,c,tr,tc)) }
        }}
        if turn==1&&r==7&&c==4 {
            if wK&&b[7][5]==0&&b[7][6]==0 && !attacked(b,7,4,by: -1) && !attacked(b,7,5,by: -1) { var m=ChessMove(7,4,7,6); m.castle="K"; moves.append(m) }
            if wQ&&b[7][3]==0&&b[7][2]==0&&b[7][1]==0 && !attacked(b,7,4,by: -1) && !attacked(b,7,3,by: -1) { var m=ChessMove(7,4,7,2); m.castle="Q"; moves.append(m) }
        }
        if turn == -1&&r==0&&c==4 {
            if bK&&b[0][5]==0&&b[0][6]==0 && !attacked(b,0,4,by: 1) && !attacked(b,0,5,by: 1) { var m=ChessMove(0,4,0,6); m.castle="k"; moves.append(m) }
            if bQ&&b[0][3]==0&&b[0][2]==0&&b[0][1]==0 && !attacked(b,0,4,by: 1) && !attacked(b,0,3,by: 1) { var m=ChessMove(0,4,0,2); m.castle="q"; moves.append(m) }
        }
    default: break
    }
    return moves
}

private func addSlider(_ moves: inout [ChessMove],_ b: [[Int]],_ r: Int,_ c: Int, turn: Int, dirs: [(Int,Int)]) {
    for (dr,dc) in dirs {
        var (tr,tc)=(r+dr,c+dc)
        while inb(tr,tc) {
            if b[tr][tc] != 0 { if (b[tr][tc]>0) != (turn>0) { moves.append(ChessMove(r,c,tr,tc)) }; break }
            moves.append(ChessMove(r,c,tr,tc)); tr+=dr; tc+=dc
        }
    }
}

// ── Public API ───────────────────────────────────────────────────────────────
public func getLegalMoves(_ board: [[Int]], turn: Int, wK: Bool, wQ: Bool, bK: Bool, bQ: Bool, epR: Int, epC: Int) -> [ChessMove] {
    var legal = [ChessMove]()
    for r in 0..<8 { for c in 0..<8 {
        if board[r][c] != 0 && (board[r][c]>0)==(turn>0) {
            for m in pseudoMoves(board,r,c,turn: turn,wK: wK,wQ: wQ,bK: bK,bQ: bQ,epR: epR,epC: epC) {
                if !inCheck(applyRaw(board,m), turn: turn) { legal.append(m) }
            }
        }
    }}
    return legal
}

public func newGame() -> ChessGame {
    var board = Array(repeating: Array(repeating: 0, count: 8), count: 8)
    let back = [R,N,B,Q,K,B,N,R]
    for c in 0..<8 { board[0][c] = -back[c]; board[1][c] = -P; board[6][c] = P; board[7][c] = back[c] }
    let moves = getLegalMoves(board, turn: 1, wK: true, wQ: true, bK: true, bQ: true, epR: -1, epC: -1)
    return ChessGame(board: board,turn: 1,wK: true,wQ: true,bK: true,bQ: true,epR: -1,epC: -1,halfMove: 0,fullMove: 1,status: .active,legalMoves: moves)
}

public func applyMove(_ g: ChessGame,_ m: ChessMove) -> ChessGame {
    var board = applyRaw(g.board, m)
    var (wK,wQ,bK,bQ) = (g.wK,g.wQ,g.bK,g.bQ)
    var (epR,epC) = (-1,-1)
    let piece = abs(g.board[m.r][m.c])
    if piece==K { if g.turn==1 { wK=false;wQ=false } else { bK=false;bQ=false } }
    if piece==R {
        if m.r==7&&m.c==7 { wK=false }; if m.r==7&&m.c==0 { wQ=false }
        if m.r==0&&m.c==7 { bK=false }; if m.r==0&&m.c==0 { bQ=false }
    }
    if m.doublePush { epR=(m.r+m.tr)/2; epC=m.c }
    let nextTurn = -g.turn
    let legal = getLegalMoves(board,turn: nextTurn,wK: wK,wQ: wQ,bK: bK,bQ: bQ,epR: epR,epC: epC)
    let status: ChessStatus = legal.isEmpty ? (inCheck(board,turn: nextTurn) ? .checkmate : .stalemate)
                                            : (inCheck(board,turn: nextTurn) ? .check : .active)
    let half = (piece==P || g.board[m.tr][m.tc] != 0) ? 0 : g.halfMove+1
    let full = g.fullMove + (g.turn == -1 ? 1 : 0)
    return ChessGame(board: board,turn: nextTurn,wK: wK,wQ: wQ,bK: bK,bQ: bQ,epR: epR,epC: epC,halfMove: half,fullMove: full,status: status,legalMoves: legal)
}

private func evaluate(_ board: [[Int]]) -> Int {
    var score = 0
    for r in 0..<8 { for c in 0..<8 {
        let p = board[r][c]; if p==0 { continue }
        let s = p>0 ? 1 : -1, a = abs(p)
        let idx = p>0 ? r*8+c : (7-r)*8+c
        score += s * ((VAL[a] ?? 0) + (PST[a]?[idx] ?? 0))
    }}
    return score
}

public func getAiMove(_ g: ChessGame) -> ChessMove? {
    guard !g.legalMoves.isEmpty else { return nil }
    let depths = [0,1,1,2,2,2,3,3,4,4]
    let depth = depths[min(g.legalMoves.count, depths.count-1)]
    var bestScore = Int.min/2, bestMove = g.legalMoves[0]
    for m in g.legalMoves {
        let score = -minimax(applyMove(g,m), depth: depth, alpha: Int.min/2, beta: Int.max/2, maximising: -g.turn)
        if score > bestScore { bestScore=score; bestMove=m }
    }
    return bestMove
}

private func minimax(_ g: ChessGame, depth: Int, alpha: Int, beta: Int, maximising: Int) -> Int {
    if depth==0||g.status == .checkmate||g.status == .stalemate { return evaluate(g.board)*maximising }
    let moves = g.legalMoves.sorted { mvvLva(g.board,$0) > mvvLva(g.board,$1) }
    var (best,a) = (Int.min/2, alpha)
    for m in moves {
        let score = -minimax(applyMove(g,m),depth: depth-1,alpha: -beta,beta: -a,maximising: -maximising)
        best=max(best,score); a=max(a,score); if a>=beta { break }
    }
    return best
}

private func mvvLva(_ board: [[Int]],_ m: ChessMove) -> Int {
    let v=abs(board[m.tr][m.tc]), att=abs(board[m.r][m.c])
    return v != 0 ? (VAL[v] ?? 0)*10-(VAL[att] ?? 0) : 0
}
