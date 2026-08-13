/// Chess engine — Dart. Sound null safety, value-like immutable moves.
library chess_engine;

const int P=1,N=2,B=3,R=4,Q=5,K=6;

enum ChessStatus { active, check, checkmate, stalemate }

class ChessMove {
  final int r,c,tr,tc;
  final int? promo;
  final String? castle;
  final bool ep, doublePush;
  const ChessMove(this.r,this.c,this.tr,this.tc,{this.promo,this.castle,this.ep=false,this.doublePush=false});
  @override bool operator==(Object o) => o is ChessMove && r==o.r&&c==o.c&&tr==o.tr&&tc==o.tc&&promo==o.promo;
  @override int get hashCode => Object.hash(r,c,tr,tc,promo);
}

class ChessGame {
  final List<List<int>> board;
  final int turn;
  final bool wK,wQ,bK,bQ;
  final int epR,epC,halfMove,fullMove;
  final ChessStatus status;
  final List<ChessMove> legalMoves;
  const ChessGame({required this.board,required this.turn,required this.wK,required this.wQ,
    required this.bK,required this.bQ,required this.epR,required this.epC,
    required this.halfMove,required this.fullMove,required this.status,required this.legalMoves});
}

// ── PST tables ───────────────────────────────────────────────────────────────
const _PST_P = [ 0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10,
   5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
const _PST_N = [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,
  -30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50];
const _PST_B = [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,
  -10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20];
const _PST_R = [0,0,0,0,0,0,0,0, 5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0];
const _PST_Q = [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20];
const _PST_K = [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20];
final _PST = {P:_PST_P,N:_PST_N,B:_PST_B,R:_PST_R,Q:_PST_Q,K:_PST_K};
final _VAL = {P:100,N:320,B:330,R:500,Q:900,K:20000};

// ── Helpers ──────────────────────────────────────────────────────────────────
bool _inb(int r,int c) => r>=0&&r<8&&c>=0&&c<8;

List<List<int>> _cloneBoard(List<List<int>> b) => [for(var row in b) [...row]];

List<List<int>> _applyRaw(List<List<int>> board, ChessMove m) {
  final b = _cloneBoard(board);
  final piece = b[m.r][m.c];
  b[m.tr][m.tc] = m.promo ?? piece; b[m.r][m.c] = 0;
  if (m.ep) b[m.r][m.tc] = 0;
  switch (m.castle) {
    case 'K': b[7][5]=R;  b[7][7]=0;
    case 'Q': b[7][3]=R;  b[7][0]=0;
    case 'k': b[0][5]=-R; b[0][7]=0;
    case 'q': b[0][3]=-R; b[0][0]=0;
  }
  return b;
}

bool _attacked(List<List<int>> b, int r, int c, int by) {
  for (final d in [[1,0],[-1,0],[0,1],[0,-1]]) {
    var tr=r+d[0],tc=c+d[1];
    while(_inb(tr,tc)){ final p=b[tr][tc]; if(p==0){tr+=d[0];tc+=d[1];continue;} if(p==R*by||p==Q*by)return true; break; }
  }
  for (final d in [[1,1],[1,-1],[-1,1],[-1,-1]]) {
    var tr=r+d[0],tc=c+d[1];
    while(_inb(tr,tc)){ final p=b[tr][tc]; if(p==0){tr+=d[0];tc+=d[1];continue;} if(p==B*by||p==Q*by)return true; break; }
  }
  for (final d in [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
    if(_inb(r+d[0],c+d[1])&&b[r+d[0]][c+d[1]]==N*by) return true;
  final pd=by==1?1:-1;
  if(_inb(r+pd,c-1)&&b[r+pd][c-1]==P*by) return true;
  if(_inb(r+pd,c+1)&&b[r+pd][c+1]==P*by) return true;
  for(var dr=-1;dr<=1;dr++) for(var dc=-1;dc<=1;dc++){
    if(dr==0&&dc==0) continue;
    if(_inb(r+dr,c+dc)&&b[r+dr][c+dc]==K*by) return true;
  }
  return false;
}

bool _inCheck(List<List<int>> b, int turn) {
  for(var r=0;r<8;r++) for(var c=0;c<8;c++) if(b[r][c]==K*turn) return _attacked(b,r,c,-turn);
  return false;
}

// ── Move generation ──────────────────────────────────────────────────────────
Iterable<ChessMove> _pseudoMoves(List<List<int>> b, int r, int c, int turn,
    bool wK, bool wQ, bool bK, bool bQ, int epR, int epC) sync* {
  final p = b[r][c].abs();
  if (p==P) {
    final d=-turn, start=turn==1?6:1, promo=turn==1?0:7;
    if (_inb(r+d,c)&&b[r+d][c]==0) {
      if (r+d==promo) { for (final q in [Q*turn,R*turn,B*turn,N*turn]) yield ChessMove(r,c,r+d,c,promo:q); }
      else { yield ChessMove(r,c,r+d,c); if(r==start&&b[r+2*d][c]==0) yield ChessMove(r,c,r+2*d,c,doublePush:true); }
    }
    for (final dc in [-1,1]) {
      final tr=r+d,tc=c+dc; if(!_inb(tr,tc)) continue;
      final cap=b[tr][tc]!=0&&(b[tr][tc]>0)!=(turn>0), ep=tr==epR&&tc==epC;
      if (cap||ep) {
        if (tr==promo) { for (final q in [Q*turn,R*turn,B*turn,N*turn]) yield ChessMove(r,c,tr,tc,promo:q,ep:ep); }
        else yield ChessMove(r,c,tr,tc,ep:ep);
      }
    }
  } else if (p==N) {
    for (final d in [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      final tr=r+d[0],tc=c+d[1];
      if(_inb(tr,tc)&&!(b[tr][tc]!=0&&(b[tr][tc]>0)==(turn>0))) yield ChessMove(r,c,tr,tc);
    }
  } else if (p==B||p==R||p==Q) {
    final dirs = p==B?[[1,1],[1,-1],[-1,1],[-1,-1]]:p==R?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    for (final d in dirs) {
      var tr=r+d[0],tc=c+d[1];
      while(_inb(tr,tc)) {
        if(b[tr][tc]!=0){ if((b[tr][tc]>0)!=(turn>0)) yield ChessMove(r,c,tr,tc); break; }
        yield ChessMove(r,c,tr,tc); tr+=d[0]; tc+=d[1];
      }
    }
  } else if (p==K) {
    for(var dr=-1;dr<=1;dr++) for(var dc=-1;dc<=1;dc++){
      if(dr==0&&dc==0) continue;
      final tr=r+dr,tc=c+dc;
      if(_inb(tr,tc)&&!(b[tr][tc]!=0&&(b[tr][tc]>0)==(turn>0))) yield ChessMove(r,c,tr,tc);
    }
    if(turn==1&&r==7&&c==4) {
      if(wK&&b[7][5]==0&&b[7][6]==0&&!_attacked(b,7,4,-1)&&!_attacked(b,7,5,-1)) yield ChessMove(7,4,7,6,castle:'K');
      if(wQ&&b[7][3]==0&&b[7][2]==0&&b[7][1]==0&&!_attacked(b,7,4,-1)&&!_attacked(b,7,3,-1)) yield ChessMove(7,4,7,2,castle:'Q');
    }
    if(turn==-1&&r==0&&c==4) {
      if(bK&&b[0][5]==0&&b[0][6]==0&&!_attacked(b,0,4,1)&&!_attacked(b,0,5,1)) yield ChessMove(0,4,0,6,castle:'k');
      if(bQ&&b[0][3]==0&&b[0][2]==0&&b[0][1]==0&&!_attacked(b,0,4,1)&&!_attacked(b,0,3,1)) yield ChessMove(0,4,0,2,castle:'q');
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────
List<ChessMove> getLegalMoves(List<List<int>> board, int turn,
    bool wK, bool wQ, bool bK, bool bQ, int epR, int epC) {
  final legal = <ChessMove>[];
  for(var r=0;r<8;r++) for(var c=0;c<8;c++) {
    if(board[r][c]!=0&&(board[r][c]>0)==(turn>0))
      for(final m in _pseudoMoves(board,r,c,turn,wK,wQ,bK,bQ,epR,epC))
        if(!_inCheck(_applyRaw(board,m),turn)) legal.add(m);
  }
  return legal;
}

ChessGame newGame() {
  final board = List.generate(8,(_)=>List.filled(8,0));
  final back=[R,N,B,Q,K,B,N,R];
  for(var c=0;c<8;c++){board[0][c]=-back[c];board[1][c]=-P;board[6][c]=P;board[7][c]=back[c];}
  final moves=getLegalMoves(board,1,true,true,true,true,-1,-1);
  return ChessGame(board:board,turn:1,wK:true,wQ:true,bK:true,bQ:true,epR:-1,epC:-1,halfMove:0,fullMove:1,status:ChessStatus.active,legalMoves:moves);
}

ChessGame applyMove(ChessGame g, ChessMove m) {
  final board=_applyRaw(g.board,m);
  var (wK,wQ,bK,bQ)=(g.wK,g.wQ,g.bK,g.bQ);
  var (epR,epC)=(-1,-1);
  final piece=g.board[m.r][m.c].abs();
  if(piece==K){if(g.turn==1){wK=wQ=false;}else{bK=bQ=false;}}
  if(piece==R){if(m.r==7&&m.c==7)wK=false;if(m.r==7&&m.c==0)wQ=false;if(m.r==0&&m.c==7)bK=false;if(m.r==0&&m.c==0)bQ=false;}
  if(m.doublePush){epR=(m.r+m.tr)~/2;epC=m.c;}
  final nextTurn=-g.turn;
  final legal=getLegalMoves(board,nextTurn,wK,wQ,bK,bQ,epR,epC);
  final status=legal.isEmpty?(_inCheck(board,nextTurn)?ChessStatus.checkmate:ChessStatus.stalemate):(_inCheck(board,nextTurn)?ChessStatus.check:ChessStatus.active);
  final half=(piece==P||g.board[m.tr][m.tc]!=0)?0:g.halfMove+1;
  final full=g.fullMove+(g.turn==-1?1:0);
  return ChessGame(board:board,turn:nextTurn,wK:wK,wQ:wQ,bK:bK,bQ:bQ,epR:epR,epC:epC,halfMove:half,fullMove:full,status:status,legalMoves:legal);
}

int _evaluate(List<List<int>> board) {
  var score=0;
  for(var r=0;r<8;r++) for(var c=0;c<8;c++){
    final p=board[r][c]; if(p==0) continue;
    final s=p>0?1:-1,a=p.abs(),idx=p>0?r*8+c:(7-r)*8+c;
    score+=s*((_VAL[a]??0)+(_PST[a]?[idx]??0));
  }
  return score;
}

int _mvvLva(List<List<int>> b, ChessMove m) {
  final v=b[m.tr][m.tc].abs(),att=b[m.r][m.c].abs();
  return v!=0?((_VAL[v]??0)*10-(_VAL[att]??0)):0;
}

int _minimax(ChessGame g, int depth, int alpha, int beta, int maximising) {
  if(depth==0||g.status==ChessStatus.checkmate||g.status==ChessStatus.stalemate) return _evaluate(g.board)*maximising;
  final moves=[...g.legalMoves]..sort((a,b)=>_mvvLva(g.board,b)-_mvvLva(g.board,a));
  var best=-(1<<30);
  for(final m in moves){
    final score=-_minimax(applyMove(g,m),depth-1,-beta,-alpha,-maximising);
    if(score>best)best=score; if(score>alpha)alpha=score; if(alpha>=beta)break;
  }
  return best;
}

ChessMove? getAiMove(ChessGame g) {
  if(g.legalMoves.isEmpty) return null;
  const depths=[0,1,1,2,2,2,3,3,4,4];
  final depth=depths[g.legalMoves.length<depths.length?g.legalMoves.length:depths.length-1];
  var bestScore=-(1<<30); var bestMove=g.legalMoves.first;
  for(final m in g.legalMoves){
    final score=-_minimax(applyMove(g,m),depth,-(1<<30),(1<<30),-g.turn);
    if(score>bestScore){bestScore=score;bestMove=m;}
  }
  return bestMove;
}
