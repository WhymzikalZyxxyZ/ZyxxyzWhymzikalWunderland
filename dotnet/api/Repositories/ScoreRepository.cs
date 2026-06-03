using Microsoft.EntityFrameworkCore;
using ZyxxyzApi.Data;
using ZyxxyzApi.Models;

namespace ZyxxyzApi.Repositories;

public class ScoreRepository(AppDbContext db) : IScoreRepository
{
    public Task<List<ScoreEntity>> GetTopAsync(string game, int limit) =>
        db.Scores
            .Where(s => s.Game == game)
            .OrderByDescending(s => s.Value)
            .Take(limit)
            .ToListAsync();

    public async Task<ScoreEntity> AddAsync(ScoreEntity score)
    {
        db.Scores.Add(score);
        await db.SaveChangesAsync();
        return score;
    }
}
