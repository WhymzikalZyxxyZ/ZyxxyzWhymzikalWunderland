using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ZyxxyzApi.Models;
using ZyxxyzApi.Services;

namespace ZyxxyzApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScoresController(IScoreService svc) : ControllerBase
{
    [HttpGet("{game}")]
    public async Task<IActionResult> GetLeaderboard(string game, [FromQuery] int limit = 10)
    {
        var scores = await svc.GetLeaderboardAsync(game, Math.Clamp(limit, 1, 100));
        return Ok(scores);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Submit([FromBody] SubmitScoreRequest req)
    {
        var score = await svc.SubmitAsync(req);
        return CreatedAtAction(nameof(GetLeaderboard), new { game = req.Game }, score);
    }
}
