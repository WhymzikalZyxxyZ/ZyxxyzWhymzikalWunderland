using System.ComponentModel.DataAnnotations;

namespace ZyxxyzApi.Models;

public record ScoreDto(int Id, string Username, string Game, int Value, DateTime CreatedAt);

public record SubmitScoreRequest(
    [property: Required, StringLength(32, MinimumLength = 2)] string Username,
    [property: Required, StringLength(64, MinimumLength = 1)] string Game,
    [property: Range(0, int.MaxValue)]                        int Value);

public record RegisterRequest(
    [property: Required, StringLength(32, MinimumLength = 2), RegularExpression(@"^[A-Za-z0-9_-]+$")] string Username,
    [property: Required, StringLength(128, MinimumLength = 8)]                                          string Password);

public record LoginRequest(
    [property: Required] string Username,
    [property: Required] string Password);

public record AuthResponse(string Token, string Username);
