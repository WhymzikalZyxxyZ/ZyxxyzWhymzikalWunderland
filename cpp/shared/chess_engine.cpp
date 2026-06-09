#include "chess_engine.h"
using namespace chess;

// ── Internal helpers ──────────────────────────────────────────────────────────
static bool inb(int r,int c){ return r>=0&&r<8&&c>=0&&c<8; }

static Board applyRaw(const Board& board, const Move& m) {
    Board b = board;
    int piece = b[m.r][m.c];
    b[m.tr][m.tc] = m.promo.value_or(piece);
    b[m.r][m.c]   = 0;
    if (m.ep) b[m.r][m.tc] = 0;
    switch (m.castle) {
        case 'K': b[7][5]=R;  b[7][7]=0; break;
        case 'Q': b[7][3]=R;  b[7][0]=0; break;
        case 'k': b[0][5]=-R; b[0][7]=0; break;
        case 'q': b[0][3]=-R; b[0][0]=0; break;
    }
    return b;
}

static bool attacked(const Board& b, int r, int c, int by) {
    const int dirs4[4][2]={{1,0},{-1,0},{0,1},{0,-1}};
    for (auto& d : dirs4) {
        int tr=r+d[0],tc=c+d[1];
        while(inb(tr,tc)){int p=b[tr][tc];if(!p){tr+=d[0];tc+=d[1];continue;}if(p==R*by||p==Q*by){return true;}break;}
    }
    const int diag[4][2]={{1,1},{1,-1},{-1,1},{-1,-1}};
    for (auto& d : diag) {
        int tr=r+d[0],tc=c+d[1];
        while(inb(tr,tc)){int p=b[tr][tc];if(!p){tr+=d[0];tc+=d[1];continue;}if(p==B*by||p==Q*by){return true;}break;}
    }
    const int kn[8][2]={{-2,-1},{-2,1},{-1,-2},{-1,2},{1,-2},{1,2},{2,-1},{2,1}};
    for (auto& d : kn) { if(inb(r+d[0],c+d[1])&&b[r+d[0]][c+d[1]]==N*by) { return true; } }
    int pd = by==1?1:-1;
    if(inb(r+pd,c-1)&&b[r+pd][c-1]==P*by) { return true; }
    if(inb(r+pd,c+1)&&b[r+pd][c+1]==P*by) { return true; }
    for(int dr=-1;dr<=1;dr++) { for(int dc=-1;dc<=1;dc++){
        if(!dr&&!dc) { continue; }
        if(inb(r+dr,c+dc)&&b[r+dr][c+dc]==K*by) { return true; }
    }}
    return false;
}

static bool inCheck(const Board& b, int turn) {
    for(int r=0;r<8;r++) { for(int c=0;c<8;c++) { if(b[r][c]==K*turn) { return attacked(b,r,c,-turn); } } }
    return false;
}

static void pawnMoves(const Board& b, int r, int c, int turn, int epR, int epC, std::vector<Move>& out) {
    int d=-turn, start=turn==1?6:1, promo=turn==1?0:7;
    if(inb(r+d,c)&&!b[r+d][c]) {
        if(r+d==promo){for(int q:{Q*turn,R*turn,B*turn,N*turn}) { out.push_back({r,c,r+d,c,q,0,false,false}); }}
        else{out.push_back({r,c,r+d,c});if(r==start&&!b[r+2*d][c]) { out.push_back({r,c,r+2*d,c,{},0,false,true}); }}
    }
    for(int dc:{-1,1}){
        int tr=r+d,tc2=c+dc; if(!inb(tr,tc2)) continue;
        bool cap=b[tr][tc2]&&(b[tr][tc2]>0)!=(turn>0), ep=tr==epR&&tc2==epC;
        if(cap||ep){
            if(tr==promo){for(int q:{Q*turn,R*turn,B*turn,N*turn}) { out.push_back({r,c,tr,tc2,q,0,ep,false}); }}
            else { out.push_back({r,c,tr,tc2,{},0,ep,false}); }
        }
    }
}

static void sliderMoves(const Board& b, int r, int c, int turn, const int dirs[][2], int nd, std::vector<Move>& out) {
    for(int i=0;i<nd;i++){
        int tr=r+dirs[i][0],tc=c+dirs[i][1];
        while(inb(tr,tc)){
            if(b[tr][tc]){if((b[tr][tc]>0)!=(turn>0)){out.push_back({r,c,tr,tc});}break;}
            out.push_back({r,c,tr,tc}); tr+=dirs[i][0]; tc+=dirs[i][1];
        }
    }
}

static std::vector<Move> pseudoMoves(const Board& b, int r, int c, int turn,
                                      bool wK,bool wQ,bool bK,bool bQ,int epR,int epC) {
    std::vector<Move> out;
    int p=std::abs(b[r][c]);
    if(p==P){ pawnMoves(b,r,c,turn,epR,epC,out); }
    else if(p==N){
        const int d[8][2]={{-2,-1},{-2,1},{-1,-2},{-1,2},{1,-2},{1,2},{2,-1},{2,1}};
        for(auto& dd:d){ int tr=r+dd[0],tc=c+dd[1]; if(inb(tr,tc)&&!(b[tr][tc]&&(b[tr][tc]>0)==(turn>0))) { out.push_back({r,c,tr,tc}); } }
    } else if(p==B){ const int d[4][2]={{1,1},{1,-1},{-1,1},{-1,-1}};sliderMoves(b,r,c,turn,d,4,out); }
      else if(p==R){ const int d[4][2]={{1,0},{-1,0},{0,1},{0,-1}};sliderMoves(b,r,c,turn,d,4,out); }
      else if(p==Q){ const int d1[4][2]={{1,1},{1,-1},{-1,1},{-1,-1}};sliderMoves(b,r,c,turn,d1,4,out);
                     const int d2[4][2]={{1,0},{-1,0},{0,1},{0,-1}};sliderMoves(b,r,c,turn,d2,4,out); }
    else if(p==K){
        for(int dr=-1;dr<=1;dr++) { for(int dc=-1;dc<=1;dc++){
            if(!dr&&!dc) { continue; } int tr=r+dr,tc2=c+dc;
            if(inb(tr,tc2)&&!(b[tr][tc2]&&(b[tr][tc2]>0)==(turn>0))) { out.push_back({r,c,tr,tc2}); }
        }}
        if(turn==1&&r==7&&c==4){
            if(wK&&!b[7][5]&&!b[7][6]&&!attacked(b,7,4,-1)&&!attacked(b,7,5,-1)) { out.push_back({7,4,7,6,{},'K'}); }
            if(wQ&&!b[7][3]&&!b[7][2]&&!b[7][1]&&!attacked(b,7,4,-1)&&!attacked(b,7,3,-1)) { out.push_back({7,4,7,2,{},'Q'}); }
        }
        if(turn==-1&&r==0&&c==4){
            if(bK&&!b[0][5]&&!b[0][6]&&!attacked(b,0,4,1)&&!attacked(b,0,5,1)) { out.push_back({0,4,0,6,{},'k'}); }
            if(bQ&&!b[0][3]&&!b[0][2]&&!b[0][1]&&!attacked(b,0,4,1)&&!attacked(b,0,3,1)) { out.push_back({0,4,0,2,{},'q'}); }
        }
    }
    return out;
}

std::vector<Move> chess::getLegalMoves(const Board& board,int turn,bool wK,bool wQ,bool bK,bool bQ,int epR,int epC){
    std::vector<Move> legal;
    for(int r=0;r<8;r++) { for(int c=0;c<8;c++){
        int p=board[r][c]; if(!p||(p>0)!=(turn>0)) { continue; }
        for(const auto& m:pseudoMoves(board,r,c,turn,wK,wQ,bK,bQ,epR,epC)){
            Board nb=applyRaw(board,m); if(!inCheck(nb,turn)) { legal.push_back(m); }
        }
    }}
    return legal;
}

Game chess::newGame(){
    Game g; const int back[8]={R,N,B,Q,K,B,N,R};
    for(int c=0;c<8;c++) { g.board[0][c]=-back[c]; g.board[1][c]=-P; g.board[6][c]=P; g.board[7][c]=back[c]; }
    g.legalMoves=getLegalMoves(g.board,1,true,true,true,true,-1,-1); return g;
}

Game chess::applyMove(const Game& g, const Move& m){
    Game ng=g; ng.board=applyRaw(g.board,m);
    int piece=std::abs(g.board[m.r][m.c]);
    if(piece==K){if(g.turn==1){ng.wK=ng.wQ=false;}else{ng.bK=ng.bQ=false;}}
    if(piece==R){if(m.r==7&&m.c==7){ng.wK=false;}if(m.r==7&&m.c==0){ng.wQ=false;}if(m.r==0&&m.c==7){ng.bK=false;}if(m.r==0&&m.c==0){ng.bQ=false;}}
    ng.epR=-1;ng.epC=-1;if(m.doublePush){ng.epR=(m.r+m.tr)/2;ng.epC=m.c;}
    ng.turn=-g.turn;
    ng.legalMoves=getLegalMoves(ng.board,ng.turn,ng.wK,ng.wQ,ng.bK,ng.bQ,ng.epR,ng.epC);
    bool chk=inCheck(ng.board,ng.turn);
    ng.status=ng.legalMoves.empty()?(chk?Status::Checkmate:Status::Stalemate):(chk?Status::Check:Status::Active);
    ng.halfMove=(piece==P||ng.board[m.tr][m.tc]!=0)?0:g.halfMove+1;
    ng.fullMove=g.fullMove+(g.turn==-1?1:0);
    return ng;
}

static int evaluate(const Board& b){
    int score=0;
    for(int r=0;r<8;r++) { for(int c=0;c<8;c++){
        int p=b[r][c]; if(!p) { continue; }
        int s=p>0?1:-1, a=std::abs(p), idx=p>0?r*8+c:(7-r)*8+c;
        score+=s*(pieceVal(p)+pstFor(a)[idx]);
    }}
    return score;
}

static int mvvLva(const Board& b,const Move& m){
    int v=std::abs(b[m.tr][m.tc]),att=std::abs(b[m.r][m.c]);
    return v?pieceVal(v)*10-pieceVal(att):0;
}

static int minimax(const Game& g,int depth,int alpha,int beta,int maximising){
    if(depth==0||g.status==Status::Checkmate||g.status==Status::Stalemate) { return evaluate(g.board)*maximising; }
    auto moves=g.legalMoves;
    std::sort(moves.begin(),moves.end(),[&](const Move& a,const Move& b){return mvvLva(g.board,a)>mvvLva(g.board,b);});
    int best=INT_MIN/2;
    for(const auto& m:moves){
        int score=-minimax(applyMove(g,m),depth-1,-beta,-alpha,-maximising);
        best=std::max(best,score); alpha=std::max(alpha,score); if(alpha>=beta) { break; }
    }
    return best;
}

std::optional<Move> chess::getAiMove(const Game& g){
    if(g.legalMoves.empty()) return std::nullopt;
    const int depths[]={0,1,1,2,2,2,3,3,4,4};
    int depth=depths[std::min((int)g.legalMoves.size(),9)];
    int bestScore=INT_MIN/2; Move bestMove=g.legalMoves[0];
    for(const auto& m:g.legalMoves){
        int score=-minimax(applyMove(g,m),depth,INT_MIN/2,INT_MAX/2,-g.turn);
        if(score>bestScore) { bestScore=score; bestMove=m; }
    }
    return bestMove;
}
