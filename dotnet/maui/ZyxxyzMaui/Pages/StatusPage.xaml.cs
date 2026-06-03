using ZyxxyzMaui.ViewModels;

namespace ZyxxyzMaui.Pages;

public partial class StatusPage : ContentPage
{
    private readonly StatusViewModel _vm;

    public StatusPage(StatusViewModel vm)
    {
        InitializeComponent();
        BindingContext = _vm = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (!_vm.Services.Any())
            await _vm.RefreshCommand.ExecuteAsync(null);
    }
}
