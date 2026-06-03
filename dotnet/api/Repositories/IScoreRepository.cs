using ZyxxyzApi.Models;

namespace ZyxxyzApi.Repositories;

public interface IScoreRepository
{
    Task<List<ScoreEntity>> GetTopAsync(string game, int limit, CancellationToken ct = default);
    Task<ScoreEntity> AddAsync(ScoreEntity score, CancellationToken ct = default);
}
