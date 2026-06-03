using ZyxxyzMaui.ViewModels;
using ZyxxyzShared.Chess;

namespace ZyxxyzMaui.Pages;

public partial class ChessPage : ContentPage
{
    private readonly ChessViewModel _vm;
    private const int SquareSize = 44;

    private static readonly string[] PieceGlyph = ["", "♙", "♘", "♗", "♖", "♕", "♔"];

    public ChessPage(ChessViewModel vm)
    {
        InitializeComponent();
        BindingContext = _vm = vm;
        _vm.BoardChanged += RebuildBoard;
        RebuildBoard();
    }

    private void RebuildBoard()
    {
        MainThread.BeginInvokeOnMainThread(() =>
        {
            BoardGrid.Children.Clear();
            BoardGrid.RowDefinitions.Clear();
            BoardGrid.ColumnDefinitions.Clear();

            for (var i = 0; i < 8; i++)
            {
                BoardGrid.RowDefinitions.Add(new RowDefinition(SquareSize));
                BoardGrid.ColumnDefinitions.Add(new ColumnDefinition(SquareSize));
            }

            var game = _vm.Game;
            var highlights = _vm.SelectedRow.HasValue
                ? _vm.MovesFrom(_vm.SelectedRow.Value, _vm.SelectedCol!.Value)
                    .Select(m => (m.Tr, m.Tc)).ToHashSet()
                : [];

            for (var r = 0; r < 8; r++)
            {
                for (var c = 0; c < 8; c++)
                {
                    var isLight = (r + c) % 2 == 0;
                    var isSelected = _vm.SelectedRow == r && _vm.SelectedCol == c;
                    var isHighlight = highlights.Contains((r, c));

                    Color bg;
                    if (isSelected)     bg = Color.FromArgb("#7fc97f");
                    else if (isHighlight) bg = Color.FromArgb("#aed67a");
                    else                bg = isLight ? Color.FromArgb("#f0d9b5") : Color.FromArgb("#b58863");

                    var piece = game.Board[r][c];
                    var glyph = piece == 0 ? "" : (piece > 0 ? PieceGlyph[piece] : PieceGlyph[-piece].ToLower()
                        .Replace("♙", "♟").Replace("♘", "♞").Replace("♗", "♝")
                        .Replace("♖", "♜").Replace("♕", "♛").Replace("♔", "♚"));

                    // Use black unicode pieces for black
                    var displayGlyph = piece switch
                    {
                        > 0 => PieceGlyph[piece],
                        < 0 => piece switch
                        {
                            -1 => "♟", -2 => "♞", -3 => "♝",
                            -4 => "♜", -5 => "♛", -6 => "♚",
                            _  => ""
                        },
                        _ => ""
                    };

                    var label = new Label
                    {
                        Text = displayGlyph,
                        FontSize = 28,
                        HorizontalTextAlignment = TextAlignment.Center,
                        VerticalTextAlignment = TextAlignment.Center,
                        BackgroundColor = bg,
                        TextColor = piece > 0 ? Colors.White : Colors.Black,
                        WidthRequest = SquareSize,
                        HeightRequest = SquareSize
                    };

                    var row = r;
                    var col = c;
                    var tap = new TapGestureRecognizer();
                    tap.Tapped += async (_, _) =>
                        await _vm.SquareTappedCommand.ExecuteAsync($"{row},{col}");
                    label.GestureRecognizers.Add(tap);

                    Grid.SetRow(label, r);
                    Grid.SetColumn(label, c);
                    BoardGrid.Children.Add(label);
                }
            }
        });
    }
}
