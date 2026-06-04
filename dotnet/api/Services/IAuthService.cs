using ZyxxyzApi.Models;

namespace ZyxxyzApi.Services;

public interface IAuthService
{
    Task<AuthResponse?> RegisterAsync(RegisterRequest req, CancellationToken ct = default);
    Task<AuthResponse?> LoginAsync(LoginRequest req, CancellationToken ct = default);
}
