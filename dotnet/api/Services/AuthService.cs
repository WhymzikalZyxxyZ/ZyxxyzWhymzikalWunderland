using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ZyxxyzApi.Data;
using ZyxxyzApi.Models;

namespace ZyxxyzApi.Services;

public class AuthService(AppDbContext db, IConfiguration config) : IAuthService
{
    private readonly string _key = config["Jwt:Key"] ?? "dev-secret-key-32-chars-minimum!!";

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest req, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(u => u.Username == req.Username, ct))
            return null;

        var user = new UserEntity
        {
            Username     = req.Username,
            PasswordHash = Hash(req.Password)
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return new AuthResponse(IssueToken(user.Username), user.Username);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest req, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username, ct);
        if (user is null || user.PasswordHash != Hash(req.Password))
            return null;

        return new AuthResponse(IssueToken(user.Username), user.Username);
    }

    private string IssueToken(string username)
    {
        var creds = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            claims:  [new Claim(ClaimTypes.Name, username)],
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string Hash(string password) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)));
}
