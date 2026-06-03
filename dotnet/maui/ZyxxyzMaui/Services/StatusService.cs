using System.Net.Http.Json;
using ZyxxyzShared.Status;

namespace ZyxxyzMaui.Services;

public class StatusService
{
    private readonly HttpClient _http;
    private const string BaseUrl = "https://status.zyxwonderland.xyz";

    public StatusService()
    {
        _http = new HttpClient { BaseAddress = new Uri(BaseUrl), Timeout = TimeSpan.FromSeconds(10) };
    }

    public async Task<ApiResult<IReadOnlyList<ServiceStatus>>> GetStatusAsync()
    {
        try
        {
            var list = await _http.GetFromJsonAsync<List<ServiceStatus>>("/api/status");
            return new ApiResult<IReadOnlyList<ServiceStatus>>.Ok(list ?? []);
        }
        catch (Exception ex)
        {
            return new ApiResult<IReadOnlyList<ServiceStatus>>.Err(ex.Message);
        }
    }
}
