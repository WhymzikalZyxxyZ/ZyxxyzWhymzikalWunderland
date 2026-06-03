using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using ZyxxyzMaui.Services;
using ZyxxyzShared.Status;

namespace ZyxxyzMaui.ViewModels;

public partial class StatusViewModel : ObservableObject
{
    private readonly StatusService _svc;

    [ObservableProperty] private IReadOnlyList<ServiceStatus> _services = [];
    [ObservableProperty] private bool _isLoading;
    [ObservableProperty] private string? _error;
    [ObservableProperty] private DateTime? _lastUpdated;

    public StatusViewModel(StatusService svc)
    {
        _svc = svc;
    }

    [RelayCommand]
    public async Task RefreshAsync()
    {
        IsLoading = true;
        Error = null;

        var result = await _svc.GetStatusAsync();

        switch (result)
        {
            case ApiResult<IReadOnlyList<ServiceStatus>>.Ok ok:
                Services = ok.Value;
                LastUpdated = DateTime.Now;
                break;
            case ApiResult<IReadOnlyList<ServiceStatus>>.Err err:
                Error = err.Msg;
                break;
        }

        IsLoading = false;
    }
}
