using Microsoft.AspNetCore.Mvc;
using ZyxxyzApi.Models;
using ZyxxyzApi.Services;

namespace ZyxxyzApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(IAuthService svc) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var result = await svc.RegisterAsync(req);
        if (result is null)
            return Conflict(new { error = "Username already taken" });
        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var result = await svc.LoginAsync(req);
        if (result is null)
            return Unauthorized(new { error = "Invalid credentials" });
        return Ok(result);
    }
}
