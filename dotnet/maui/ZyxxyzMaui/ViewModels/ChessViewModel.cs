using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ZyxxyzShared.Chess;

namespace ZyxxyzMaui.ViewModels;

public partial class ChessViewModel : ObservableObject
{
    [ObservableProperty] private ChessGame _game = ChessEngine.NewGame();
    [ObservableProperty] private int? _selectedRow;
    [ObservableProperty] private int? _selectedCol;
    [ObservableProperty] private bool _isAiThinking;
    [ObservableProperty] private string _statusText = "White to move";

    public event Action? BoardChanged;

    [RelayCommand]
    public void NewGame()
    {
        Game = ChessEngine.NewGame();
        SelectedRow = null;
        SelectedCol = null;
        IsAiThinking = false;
        UpdateStatus();
    }

    [RelayCommand]
    public async Task SquareTapped(string position)
    {
        if (IsAiThinking) return;
        if (!int.TryParse(position.Split(',')[0], out var r)) return;
        if (!int.TryParse(position.Split(',')[1], out var c)) return;

        if (SelectedRow is null)
        {
            var piece = Game.Board[r][c];
            if (piece != 0 && Math.Sign(piece) == Game.Turn)
            {
                SelectedRow = r;
                SelectedCol = c;
                BoardChanged?.Invoke();
            }
            return;
        }

        var move = Game.LegalMoves.FirstOrDefault(m =>
            m.R == SelectedRow && m.C == SelectedCol && m.Tr == r && m.Tc == c);

        if (move is null)
        {
            var piece = Game.Board[r][c];
            if (piece != 0 && Math.Sign(piece) == Game.Turn)
            {
                SelectedRow = r;
                SelectedCol = c;
            }
            else
            {
                SelectedRow = null;
                SelectedCol = null;
            }
            BoardChanged?.Invoke();
            return;
        }

        // Handle pawn promotion — default to queen
        if (move.Promo.HasValue)
            move = move with { Promo = Game.Turn * 5 };

        Game = ChessEngine.ApplyMove(Game, move);
        SelectedRow = null;
        SelectedCol = null;
        UpdateStatus();
        BoardChanged?.Invoke();

        if (Game.Status is ChessStatus.Active or ChessStatus.Check && Game.Turn == -1)
            await RunAiAsync();
    }

    private async Task RunAiAsync()
    {
        IsAiThinking = true;
        StatusText = "AI thinking…";

        var aiMove = await Task.Run(() => ChessEngine.GetAIMove(Game, Game.LegalMoves.Count));

        if (aiMove is not null)
            Game = ChessEngine.ApplyMove(Game, aiMove);

        IsAiThinking = false;
        UpdateStatus();
        BoardChanged?.Invoke();
    }

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

    public IEnumerable<ChessMove> MovesFrom(int r, int c) =>
        Game.LegalMoves.Where(m => m.R == r && m.C == c);
}
