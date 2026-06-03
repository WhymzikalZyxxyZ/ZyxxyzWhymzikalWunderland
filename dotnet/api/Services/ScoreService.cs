using ZyxxyzApi.Models;
using ZyxxyzApi.Repositories;

namespace ZyxxyzApi.Services;

public class ScoreService(IScoreRepository repo) : IScoreService
{
    public async Task<List<ScoreDto>> GetLeaderboardAsync(string game, int limit = 10, CancellationToken ct = default)
    {
        var entities = await repo.GetTopAsync(game, limit, ct);
        return entities.Select(ToDto).ToList();
    }

    public async Task<ScoreDto> SubmitAsync(SubmitScoreRequest req, CancellationToken ct = default)
    {
        var entity = new ScoreEntity
        {
            Username = req.Username,
            Game     = req.Game,
            Value    = req.Value
        };
        var saved = await repo.AddAsync(entity, ct);
        return ToDto(saved);
    }

    private static ScoreDto ToDto(ScoreEntity e) =>
        new(e.Id, e.Username, e.Game, e.Value, e.CreatedAt);
}
