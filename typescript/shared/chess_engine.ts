/** Chess engine — TypeScript. Mirrors Python/Java/C# implementations. */

export const P=1,N=2,B=3,R=4,Q=5,K=6;

export enum ChessStatus { ACTIVE='active', CHECK='check', CHECKMATE='checkmate', STALEMATE='stalemate' }

export interface ChessMove {
    r:number; c:number; tr:number; tc:number;
    promo?:number; castle?:string; ep?:boolean; double?:boolean;
}

export interface ChessGame {
    board:number[][]; turn:number;
    wK:boolean; wQ:boolean; bK:boolean; bQ:boolean;
    epR:number; epC:number;
    halfMove:number; fullMove:number;
    status:ChessStatus; legalMoves:ChessMove[];
}

// ── Piece-square tables ──────────────────────────────────────────────────────
const PST_P=[  0,  0,  0,  0,  0,  0,  0,  0, 50,50,50,50,50,50,50,50,
              10,10,20,30,30,20,10,10,  5, 5,10,25,25,10, 5, 5,
               0,  0,  0,20,20,  0,  0,  0,  5,-5,-10, 0, 0,-10,-5, 5,
               5,10,10,-20,-20,10,10,  5,  0,  0,  0,  0,  0,  0,  0,  0];
const PST_N=[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,
             -30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,
             -30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,
             -40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50];
const PST_B=[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,
             -10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,
             -10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,
             -10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20];
const PST_R=[  0,  0,  0,  0,  0,  0,  0,  0,  5,10,10,10,10,10,10, 5,
              -5,  0,  0,  0,  0,  0,  0, -5, -5,  0,  0,  0,  0,  0,  0,-5,
              -5,  0,  0,  0,  0,  0,  0, -5, -5,  0,  0,  0,  0,  0,  0,-5,
              -5,  0,  0,  0,  0,  0,  0, -5,  0,  0,  0,  5,  5,  0,  0, 0];
const PST_Q=[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,
             -10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,
              0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,
             -10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20];
const PST_K=[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,
             -30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,
             -20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,
              20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20];
const PST:{[k:number]:number[]}={[P]:PST_P,[N]:PST_N,[B]:PST_B,[R]:PST_R,[Q]:PST_Q,[K]:PST_K};
const VAL:{[k:number]:number}={[P]:100,[N]:320,[B]:330,[R]:500,[Q]:900,[K]:20000};

// ── Helpers ──────────────────────────────────────────────────────────────────
const inBounds = (r:number,c:number) => r>=0&&r<8&&c>=0&&c<8;
const ownPiece = (b:number[][],r:number,c:number,turn:number) =>
    b[r][c]!==0 && (b[r][c]>0)===(turn>0);
const enemyOrEmpty = (b:number[][],r:number,c:number,turn:number) =>
    !ownPiece(b,r,c,turn);

function cloneBoard(board:number[][]):number[][] {
    return board.map(row => [...row]);
}

// ── Move generation ──────────────────────────────────────────────────────────
function* pawnMoves(b:number[][],r:number,c:number,turn:number,epR:number,epC:number):Generator<ChessMove> {
    const d = -turn, start = turn===1?6:1, promo = turn===1?0:7;
    if (inBounds(r+d,c) && b[r+d][c]===0) {
        if (r+d===promo) { for (const p of [Q*turn,R*turn,B*turn,N*turn]) yield {r,c,tr:r+d,tc:c,promo:p}; }
        else {
            yield {r,c,tr:r+d,tc:c};
            if (r===start && b[r+2*d][c]===0) yield {r,c,tr:r+2*d,tc:c,double:true};
        }
    }
    for (const dc of [-1,1]) {
        const [tr,tc]=[r+d,c+dc];
        if (!inBounds(tr,tc)) continue;
        const cap = b[tr][tc]!==0 && (b[tr][tc]>0)!==(turn>0);
        const ep  = tr===epR && tc===epC;
        if (cap||ep) {
            if (tr===promo) for (const p of [Q*turn,R*turn,B*turn,N*turn]) yield {r,c,tr,tc,promo:p,ep};
            else yield {r,c,tr,tc,ep:ep||undefined};
        }
    }
}

function* knightMoves(b:number[][],r:number,c:number,turn:number):Generator<ChessMove> {
    for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const [tr,tc]=[r+dr,c+dc];
        if (inBounds(tr,tc) && enemyOrEmpty(b,tr,tc,turn)) yield {r,c,tr,tc};
    }
}

function* slider(b:number[][],r:number,c:number,turn:number,dirs:[number,number][]):Generator<ChessMove> {
    for (const [dr,dc] of dirs) {
        let [tr,tc]=[r+dr,c+dc];
        while (inBounds(tr,tc)) {
            if (b[tr][tc]!==0) { if ((b[tr][tc]>0)!==(turn>0)) yield {r,c,tr,tc}; break; }
            yield {r,c,tr,tc};
            tr+=dr; tc+=dc;
        }
    }
}

function* kingMoves(b:number[][],r:number,c:number,turn:number,
                    wK:boolean,wQ:boolean,bK:boolean,bQ:boolean):Generator<ChessMove> {
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
        if (!dr&&!dc) continue;
        const [tr,tc]=[r+dr,c+dc];
        if (inBounds(tr,tc) && enemyOrEmpty(b,tr,tc,turn)) yield {r,c,tr,tc};
    }
    if (turn===1&&r===7&&c===4) {
        if (wK&&b[7][5]===0&&b[7][6]===0&&!attacked(b,7,4,-1)&&!attacked(b,7,5,-1)) yield {r,c,tr:7,tc:6,castle:'K'};
        if (wQ&&b[7][3]===0&&b[7][2]===0&&b[7][1]===0&&!attacked(b,7,4,-1)&&!attacked(b,7,3,-1)) yield {r,c,tr:7,tc:2,castle:'Q'};
    }
    if (turn===-1&&r===0&&c===4) {
        if (bK&&b[0][5]===0&&b[0][6]===0&&!attacked(b,0,4,1)&&!attacked(b,0,5,1)) yield {r,c,tr:0,tc:6,castle:'k'};
        if (bQ&&b[0][3]===0&&b[0][2]===0&&b[0][1]===0&&!attacked(b,0,4,1)&&!attacked(b,0,3,1)) yield {r,c,tr:0,tc:2,castle:'q'};
    }
}

function attacked(b:number[][],r:number,c:number,by:number):boolean {
    for (const [dr,dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        let [tr,tc]=[r+dr,c+dc];
        while (inBounds(tr,tc)) {
            const p=b[tr][tc]; if (p===0){tr+=dr;tc+=dc;continue;}
            if (p===R*by||p===Q*by) return true; break;
        }
    }
    for (const [dr,dc] of [[1,1],[1,-1],[-1,1],[-1,-1]]) {
        let [tr,tc]=[r+dr,c+dc];
        while (inBounds(tr,tc)) {
            const p=b[tr][tc]; if (p===0){tr+=dr;tc+=dc;continue;}
            if (p===B*by||p===Q*by) return true; break;
        }
    }
    for (const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        if (inBounds(r+dr,c+dc)&&b[r+dr][c+dc]===N*by) return true;
    const pd=by===1?1:-1;
    if (inBounds(r+pd,c-1)&&b[r+pd][c-1]===P*by) return true;
    if (inBounds(r+pd,c+1)&&b[r+pd][c+1]===P*by) return true;
    for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
        if (!dr&&!dc) continue;
        if (inBounds(r+dr,c+dc)&&b[r+dr][c+dc]===K*by) return true;
    }
    return false;
}

function applyRaw(board:number[][],m:ChessMove):number[][] {
    const b=cloneBoard(board);
    const piece=b[m.r][m.c];
    b[m.tr][m.tc]=m.promo??piece; b[m.r][m.c]=0;
    if (m.ep) b[m.r][m.tc]=0;
    if (m.castle==='K'){b[7][5]=R;b[7][7]=0;}
    if (m.castle==='Q'){b[7][3]=R;b[7][0]=0;}
    if (m.castle==='k'){b[0][5]=-R;b[0][7]=0;}
    if (m.castle==='q'){b[0][3]=-R;b[0][0]=0;}
    return b;
}

function inCheck(board:number[][],turn:number):boolean {
    for (let r=0;r<8;r++) for (let c=0;c<8;c++)
        if (board[r][c]===K*turn) return attacked(board,r,c,-turn);
    return false;
}

function* pseudoMoves(b:number[][],r:number,c:number,turn:number,
                      wK:boolean,wQ:boolean,bK:boolean,bQ:boolean,
                      epR:number,epC:number):Generator<ChessMove> {
    const p=Math.abs(b[r][c]);
    if (p===P) yield* pawnMoves(b,r,c,turn,epR,epC);
    else if (p===N) yield* knightMoves(b,r,c,turn);
    else if (p===B) yield* slider(b,r,c,turn,[[1,1],[1,-1],[-1,1],[-1,-1]]);
    else if (p===R) yield* slider(b,r,c,turn,[[1,0],[-1,0],[0,1],[0,-1]]);
    else if (p===Q) { yield* slider(b,r,c,turn,[[1,1],[1,-1],[-1,1],[-1,-1]]); yield* slider(b,r,c,turn,[[1,0],[-1,0],[0,1],[0,-1]]); }
    else if (p===K) yield* kingMoves(b,r,c,turn,wK,wQ,bK,bQ);
}

export function getLegalMoves(board:number[][],turn:number,
                               wK:boolean,wQ:boolean,bK:boolean,bQ:boolean,
                               epR:number,epC:number):ChessMove[] {
    const legal:ChessMove[]=[];
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
        if (board[r][c]!==0&&(board[r][c]>0)===(turn>0))
            for (const m of pseudoMoves(board,r,c,turn,wK,wQ,bK,bQ,epR,epC)) {
                if (!inCheck(applyRaw(board,m),turn)) legal.push(m);
            }
    }
    return legal;
}

// ── Public API ───────────────────────────────────────────────────────────────
export function newGame():ChessGame {
    const board:number[][]=Array.from({length:8},()=>Array(8).fill(0));
    const back=[R,N,B,Q,K,B,N,R];
    for (let c=0;c<8;c++) { board[0][c]=-back[c]; board[1][c]=-P; board[6][c]=P; board[7][c]=back[c]; }
    const legalMoves=getLegalMoves(board,1,true,true,true,true,-1,-1);
    return {board,turn:1,wK:true,wQ:true,bK:true,bQ:true,epR:-1,epC:-1,halfMove:0,fullMove:1,status:ChessStatus.ACTIVE,legalMoves};
}

export function applyMove(g:ChessGame,m:ChessMove):ChessGame {
    const board=applyRaw(g.board,m);
    let {wK,wQ,bK,bQ}=g; let epR=-1,epC=-1;
    const piece=Math.abs(g.board[m.r][m.c]);
    if (piece===K) { if (g.turn===1) {wK=wQ=false;} else {bK=bQ=false;} }
    if (piece===R) {
        if (m.r===7&&m.c===7) wK=false; if (m.r===7&&m.c===0) wQ=false;
        if (m.r===0&&m.c===7) bK=false; if (m.r===0&&m.c===0) bQ=false;
    }
    if (m.double) { epR=Math.round((m.r+m.tr)/2); epC=m.c; }
    const nextTurn=-g.turn;
    const legalMoves=getLegalMoves(board,nextTurn,wK,wQ,bK,bQ,epR,epC);
    const status=updateStatus(board,nextTurn,legalMoves);
    const halfMove=(piece===P||g.board[m.tr][m.tc]!==0)?0:g.halfMove+1;
    const fullMove=g.fullMove+(g.turn===-1?1:0);
    return {board,turn:nextTurn,wK,wQ,bK,bQ,epR,epC,halfMove,fullMove,status,legalMoves};
}

function updateStatus(board:number[][],turn:number,legal:ChessMove[]):ChessStatus {
    if (!legal.length) return inCheck(board,turn)?ChessStatus.CHECKMATE:ChessStatus.STALEMATE;
    return inCheck(board,turn)?ChessStatus.CHECK:ChessStatus.ACTIVE;
}

function evaluate(board:number[][]):number {
    let score=0;
    for (let r=0;r<8;r++) for (let c=0;c<8;c++) {
        const p=board[r][c]; if (!p) continue;
        const s=p>0?1:-1, a=Math.abs(p);
        const idx=p>0?r*8+c:(7-r)*8+c;
        score+=s*(VAL[a]+PST[a][idx]);
    }
    return score;
}

function mvvLva(board:number[][],m:ChessMove):number {
    const victim=Math.abs(board[m.tr][m.tc]);
    const attacker=Math.abs(board[m.r][m.c]);
    return victim?(VAL[victim]*10-VAL[attacker]):0;
}

function minimax(g:ChessGame,depth:number,alpha:number,beta:number,maximising:number):number {
    if (depth===0||g.status===ChessStatus.CHECKMATE||g.status===ChessStatus.STALEMATE)
        return evaluate(g.board)*maximising;
    const moves=[...g.legalMoves].sort((a,b)=>mvvLva(g.board,b)-mvvLva(g.board,a));
    let best=-Infinity;
    for (const m of moves) {
        const score=-minimax(applyMove(g,m),depth-1,-beta,-alpha,-maximising);
        best=Math.max(best,score); alpha=Math.max(alpha,score);
        if (alpha>=beta) break;
    }
    return best;
}

export function getAiMove(g:ChessGame):ChessMove|null {
    if (!g.legalMoves.length) return null;
    const depths=[0,1,1,2,2,2,3,3,4,4];
    const depth=depths[Math.min(g.legalMoves.length,depths.length-1)];
    let bestScore=-Infinity, bestMove=g.legalMoves[0];
    for (const m of g.legalMoves) {
        const score=-minimax(applyMove(g,m),depth,-Infinity,Infinity,-g.turn);
        if (score>bestScore) { bestScore=score; bestMove=m; }
    }
    return bestMove;
}
