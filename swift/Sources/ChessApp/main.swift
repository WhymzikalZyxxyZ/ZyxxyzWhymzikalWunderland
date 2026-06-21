// SwiftUI chess app — macOS. Wraps the shared ChessEngine module.
import SwiftUI
import ChessEngine

@main
struct ZyxxyzChessApp: App {
    var body: some Scene {
        WindowGroup("Zyxxyz Chess — Swift") {
            ContentView()
                .frame(minWidth: 640, minHeight: 520)
        }
    }
}

struct ContentView: View {
    @StateObject private var vm = ChessViewModel()

    var body: some View {
        VStack(spacing: 0) {
            header
            HStack(alignment: .top, spacing: 20) {
                BoardView(vm: vm)
                sidebar
            }
            .padding(16)
        }
        .background(Color(red: 0.08, green: 0.08, blue: 0.12))
    }

    private var header: some View {
        HStack {
            Text("♟  Zyxxyz Chess").font(.system(size: 18, weight: .light)).foregroundColor(Color(hex: "#c07fe0"))
            Spacer()
            Text(vm.statusLabel).foregroundColor(.white.opacity(0.7)).font(.system(size: 13, .monospaced))
            Button("New Game") { vm.reset() }
                .buttonStyle(.bordered).tint(Color(hex: "#c07fe0"))
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .background(Color.black.opacity(0.3))
    }

    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Move History").font(.caption).foregroundColor(.gray)
                .padding(.top, 4)
            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(vm.history.indices, id: \.self) { i in
                        Text("\(i+1). \(vm.history[i])").font(.system(size: 11, .monospaced)).foregroundColor(.white.opacity(0.6))
                    }
                }
            }
            .frame(width: 160, height: 520)
        }
    }
}

struct BoardView: View {
    @ObservedObject var vm: ChessViewModel
    let cellSize: CGFloat = 72

    var highlights: Set<String> {
        guard let (r, c) = vm.selected else { return [] }
        return Set(vm.game.legalMoves.filter{$0.r==r&&$0.c==c}.map{"\($0.tr),\($0.tc)"})
    }

    var body: some View {
        VStack(spacing: 0) {
            ForEach(0..<8, id: \.self) { r in
                HStack(spacing: 0) {
                    ForEach(0..<8, id: \.self) { c in
                        cell(r: r, c: c)
                    }
                }
            }
        }
        .border(Color.white.opacity(0.1))
    }

    @ViewBuilder
    func cell(r: Int, c: Int) -> some View {
        let base = (r+c)%2==0 ? Color(red: 0.94, green: 0.85, blue: 0.71) : Color(red: 0.71, green: 0.53, blue: 0.39)
        let isSelected = vm.selected == (r, c)
        let isHighlight = highlights.contains("\(r),\(c)")
        let fill = isSelected ? Color.green.opacity(0.5) : isHighlight ? Color.yellow.opacity(0.45) : base
        let piece = vm.game.board[r][c]
        ZStack {
            fill
            if piece != 0 {
                Text(glyph(piece)).font(.system(size: 44)).foregroundColor(piece>0 ? .white : .black)
                    .shadow(color: .black.opacity(0.5), radius: 2)
            }
        }
        .frame(width: cellSize, height: cellSize)
        .onTapGesture { vm.tap(r: r, c: c) }
    }

    func glyph(_ p: Int) -> String {
        [1: "♙", 2: "♘", 3: "♗", 4: "♖", 5: "♕", 6: "♔", -1: "♟", -2: "♞", -3: "♝", -4: "♜", -5: "♛", -6: "♚"][p] ?? ""
    }
}

@MainActor
class ChessViewModel: ObservableObject {
    @Published var game: ChessGame = newGame()
    @Published var selected: (Int, Int)? = nil
    @Published var history: [String] = []
    @Published var thinking = false

    var statusLabel: String {
        switch game.status {
        case .checkmate: return "Checkmate!"
        case .stalemate: return "Stalemate"
        case .check:     return "\(game.turn==1 ? "White":"Black") — CHECK"
        default:         return "\(game.turn==1 ? "White":"Black") to move"
        }
    }

    func reset() { game=newGame(); selected=nil; history=[]; thinking=false }

    func tap(r: Int, c: Int) {
        guard !thinking else { return }
        if let (sr, sc) = selected {
            if let m = game.legalMoves.first(where:{$0.r==sr&&$0.c==sc&&$0.tr==r&&$0.tc==c}) {
                history.append(moveNotation(m))
                game = applyMove(game, m)
                selected = nil
                if game.status == .active || game.status == .check { triggerAI() }
            } else {
                selected = game.board[r][c] != 0 && (game.board[r][c]>0)==(game.turn>0) ? (r, c) : nil
            }
        } else if game.board[r][c] != 0 && (game.board[r][c]>0)==(game.turn>0) {
            selected = (r, c)
        }
    }

    private func triggerAI() {
        thinking = true
        let snapshot = game
        Task.detached(priority: .userInitiated) {
            let m = getAiMove(snapshot)
            await MainActor.run {
                if let m { self.history.append(self.moveNotation(m)); self.game = applyMove(self.game, m) }
                self.thinking = false
            }
        }
    }

    private func moveNotation(_ m: ChessMove) -> String {
        let files = "abcdefgh"
        let f = { (c: Int) -> Character in files[files.index(files.startIndex, offsetBy: c)] }
        return "\(f(m.c))\(8-m.r)→\(f(m.tc))\(8-m.tr)"
    }
}

extension Color {
    init(hex: String) {
        let h = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        let v = UInt64(h, radix: 16) ?? 0
        self.init(red: Double((v>>16)&0xff)/255, green: Double((v>>8)&0xff)/255, blue: Double(v&0xff)/255)
    }
}
