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
    // Same fail-fast requirement as Program.cs's own read of this value —
    // this is a separate DI-injected IConfiguration read, so the fallback
    // removed there had to be removed here too; a fallback in either place
    // alone would have left the vulnerability half-fixed.
    private readonly string _key = config["Jwt:Key"]
        ?? throw new InvalidOperationException("Jwt:Key configuration value is required");

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest req, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(u => u.Username == req.Username, ct))
            return null;

        var user = new UserEntity
        {
            Username     = req.Username,
            PasswordHash = HashPassword(req.Password)
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(ct);

        return new AuthResponse(IssueToken(user.Username), user.Username);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest req, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username, ct);
        if (user is null || !VerifyPassword(req.Password, user.PasswordHash))
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

    // A security audit found this was unsalted, single-round SHA-256 —
    // trivially crackable via rainbow tables, and identical passwords
    // produced identical hashes (leaking password reuse across accounts).
    // typescript/api and python/api both already use per-user-salted
    // scrypt; .NET has no built-in scrypt, so this uses PBKDF2-HMAC-SHA256
    // (Rfc2898DeriveBytes.Pbkdf2, built into the BCL since .NET 6 — no new
    // package) at a cost factor matching current OWASP guidance for
    // PBKDF2-SHA256, with a random salt per user and a timing-safe compare.
    private const int Pbkdf2Iterations = 210_000;
    private const int HashLengthBytes = 32;
    private const int SaltLengthBytes = 16;

    private static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltLengthBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password), salt, Pbkdf2Iterations, HashAlgorithmName.SHA256, HashLengthBytes);
        return $"{Convert.ToHexString(salt)}:{Convert.ToHexString(hash)}";
    }

    private static bool VerifyPassword(string password, string stored)
    {
        var parts = stored.Split(':', 2);
        if (parts.Length != 2)
            return false;
        var salt = Convert.FromHexString(parts[0]);
        var expected = Convert.FromHexString(parts[1]);
        var candidate = Rfc2898DeriveBytes.Pbkdf2(
            Encoding.UTF8.GetBytes(password), salt, Pbkdf2Iterations, HashAlgorithmName.SHA256, HashLengthBytes);
        return CryptographicOperations.FixedTimeEquals(candidate, expected);
    }
}
