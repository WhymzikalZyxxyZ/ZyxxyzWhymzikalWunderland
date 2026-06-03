using ZyxxyzApi.Models;

namespace ZyxxyzApi.Services;

public interface IAuthService
{
    Task<AuthResponse?> RegisterAsync(RegisterRequest req);
    Task<AuthResponse?> LoginAsync(LoginRequest req);
}
