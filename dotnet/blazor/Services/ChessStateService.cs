using ZyxxyzShared.Chess;

namespace ZyxxyzBlazor.Services;

public class ChessStateService
{
    public ChessGame Game { get; private set; } = ChessEngine.NewGame();
    public int? SelectedRow { get; private set; }
    public int? SelectedCol { get; private set; }
    public bool IsAiThinking { get; private set; }
    public string StatusText { get; private set; } = "White to move";

    public event Action? StateChanged;

    public void NewGame()
    {
        Game = ChessEngine.NewGame();
        SelectedRow = SelectedCol = null;
        IsAiThinking = false;
        UpdateStatus();
        Notify();
    }

    public async Task TapSquareAsync(int r, int c)
    {
        if (IsAiThinking) return;

        if (SelectedRow is null)
        {
            var piece = Game.Board[r][c];
            if (piece != 0 && Math.Sign(piece) == Game.Turn)
            {
                SelectedRow = r;
                SelectedCol = c;
                Notify();
            }
            return;
        }

        var move = Game.LegalMoves.FirstOrDefault(m =>
            m.R == SelectedRow && m.C == SelectedCol && m.Tr == r && m.Tc == c);

        if (move is null)
        {
            var piece = Game.Board[r][c];
            SelectedRow = piece != 0 && Math.Sign(piece) == Game.Turn ? r : null;
            SelectedCol = SelectedRow.HasValue ? c : null;
            Notify();
            return;
        }

        if (move.Promo.HasValue)
            move = move with { Promo = Game.Turn * 5 };

        Game = ChessEngine.ApplyMove(Game, move);
        SelectedRow = SelectedCol = null;
        UpdateStatus();
        Notify();

        if (Game.Status is ChessStatus.Active or ChessStatus.Check && Game.Turn == -1)
            await RunAiAsync();
    }

    private async Task RunAiAsync()
    {
        IsAiThinking = true;
        StatusText = "AI thinking…";
        Notify();

        var aiMove = await Task.Run(() => ChessEngine.GetAIMove(Game));
        if (aiMove is not null)
            Game = ChessEngine.ApplyMove(Game, aiMove);

        IsAiThinking = false;
        UpdateStatus();
        Notify();
    }

    public IEnumerable<ChessMove> MovesFrom(int r, int c) =>
        Game.LegalMoves.Where(m => m.R == r && m.C == c);

    private void UpdateStatus()
    {
        StatusText = Game.Status switch
        {
            ChessStatus.Checkmate => Game.Turn == 1 ? "Black wins by checkmate" : "White wins by checkmate",
            ChessStatus.Stalemate => "Draw by stalemate",
            ChessStatus.Check     => Game.Turn == 1 ? "White is in check" : "Black is in check",
            _                     => Game.Turn == 1 ? "White to move" : "Black to move"
        };
    }

    private void Notify() => StateChanged?.Invoke();
}
