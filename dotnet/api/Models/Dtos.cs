namespace ZyxxyzApi.Models;

public record ScoreDto(int Id, string Username, string Game, int Value, DateTime CreatedAt);
public record SubmitScoreRequest(string Username, string Game, int Value);

public record RegisterRequest(string Username, string Password);
public record LoginRequest(string Username, string Password);
public record AuthResponse(string Token, string Username);
