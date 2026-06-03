// Flutter chess app — Android/iOS/Web/Desktop from one codebase.
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:chess_engine/chess_engine.dart' as engine;

void main() => runApp(const ZyxxyzApp());

class ZyxxyzApp extends StatelessWidget {
  const ZyxxyzApp({super.key});
  @override
  Widget build(BuildContext ctx) => MaterialApp(
    title: 'Zyxxyz Chess',
    debugShowCheckedModeBanner: false,
    theme: ThemeData.dark().copyWith(
      scaffoldBackgroundColor: const Color(0xff1a1a2e),
      colorScheme: const ColorScheme.dark(primary: Color(0xff4b8bbe)),
    ),
    home: const ChessPage(),
  );
}

class ChessPage extends StatefulWidget {
  const ChessPage({super.key});
  @override State<ChessPage> createState() => _ChessPageState();
}

class _ChessPageState extends State<ChessPage> {
  engine.ChessGame game = engine.newGame();
  int? selR, selC;
  bool thinking = false;
  static const _cell = 44.0;

  Set<String> get _highlights {
    if (selR == null) return {};
    return game.legalMoves
        .where((m) => m.r == selR && m.c == selC)
        .map((m) => '${m.tr},${m.tc}')
        .toSet();
  }

  void _tap(int r, int c) {
    if (thinking) return;
    if (selR != null) {
      final m = game.legalMoves.firstWhere(
        (m) => m.r==selR&&m.c==selC&&m.tr==r&&m.tc==c,
        orElse: () => engine.ChessMove(-1,-1,-1,-1),
      );
      if (m.r >= 0) {
        setState(() { game = engine.applyMove(game, m); selR = selC = null; });
        if (game.status == engine.ChessStatus.active || game.status == engine.ChessStatus.check) {
          _aiMove();
        }
        return;
      }
    }
    setState(() {
      if (game.board[r][c] != 0 && (game.board[r][c] > 0) == (game.turn > 0)) {
        selR = r; selC = c;
      } else {
        selR = selC = null;
      }
    });
  }

  void _aiMove() {
    setState(() => thinking = true);
    Future.microtask(() {
      final m = engine.getAiMove(game);
      if (m != null) setState(() => game = engine.applyMove(game, m));
      setState(() => thinking = false);
    });
  }

  static const _glyphs = {1:'♙',2:'♘',3:'♗',4:'♖',5:'♕',6:'♔',-1:'♟',-2:'♞',-3:'♝',-4:'♜',-5:'♛',-6:'♚'};
  static const _light = Color(0xfff0d9b5), _dark = Color(0xffb58863), _sel = Color(0x8077c066), _moveH = Color(0x80c8d040);

  @override
  Widget build(BuildContext ctx) {
    final statusText = switch(game.status) {
      engine.ChessStatus.checkmate => 'Checkmate!',
      engine.ChessStatus.stalemate => 'Stalemate',
      engine.ChessStatus.check     => '${game.turn==1?"White":"Black"} — CHECK',
      _                            => '${game.turn==1?"White":"Black"} to move',
    };

    return Scaffold(
      appBar: AppBar(
        title: const Text('♟  Zyxxyz Chess — Flutter', style: TextStyle(fontWeight: FontWeight.w300)),
        backgroundColor: Colors.black38,
        actions: [
          TextButton(onPressed: () => setState(() { game=engine.newGame(); selR=selC=null; thinking=false; }),
            child: const Text('New Game', style: TextStyle(color: Color(0xff4b8bbe)))),
          Padding(padding: const EdgeInsets.symmetric(horizontal:16),
            child: Center(child: Text(statusText, style: const TextStyle(fontSize:13, color: Colors.white70)))),
        ],
      ),
      body: Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (thinking) const LinearProgressIndicator(minHeight: 2),
          SizedBox(
            width: _cell * 8, height: _cell * 8,
            child: GridView.builder(
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount:8),
              itemCount: 64,
              itemBuilder: (_, i) {
                final r=i~/8, c=i%8;
                final isLight = (r+c)%2==0;
                final isSel   = selR==r&&selC==c;
                final isHl    = _highlights.contains('$r,$c');
                final p       = game.board[r][c];
                return GestureDetector(
                  onTap: () => _tap(r, c),
                  child: Container(
                    color: isSel ? _sel : isHl ? _moveH : isLight ? _light : _dark,
                    child: p!=0 ? Center(child: Text(_glyphs[p]??'',
                      style: TextStyle(fontSize:_cell*.6, color: p>0?Colors.white:Colors.black87,
                      shadows: const [Shadow(blurRadius:3, color:Colors.black38)]))) : null,
                  ),
                );
              },
            ),
          ),
        ]),
      ),
    );
  }
}
