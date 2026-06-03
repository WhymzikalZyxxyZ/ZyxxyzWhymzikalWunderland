using ZyxxyzApi.Models;

namespace ZyxxyzApi.Services;

public interface IScoreService
{
    Task<List<ScoreDto>> GetLeaderboardAsync(string game, int limit = 10, CancellationToken ct = default);
    Task<ScoreDto> SubmitAsync(SubmitScoreRequest req, CancellationToken ct = default);
}
