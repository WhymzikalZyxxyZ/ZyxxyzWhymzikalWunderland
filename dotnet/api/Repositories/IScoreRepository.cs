using ZyxxyzApi.Models;

namespace ZyxxyzApi.Repositories;

public interface IScoreRepository
{
    Task<List<ScoreEntity>> GetTopAsync(string game, int limit);
    Task<ScoreEntity> AddAsync(ScoreEntity score);
}
