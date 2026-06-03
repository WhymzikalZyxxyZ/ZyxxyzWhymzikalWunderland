using ZyxxyzApi.Models;

namespace ZyxxyzApi.Services;

public interface IScoreService
{
    Task<List<ScoreDto>> GetLeaderboardAsync(string game, int limit = 10);
    Task<ScoreDto> SubmitAsync(SubmitScoreRequest req);
}
