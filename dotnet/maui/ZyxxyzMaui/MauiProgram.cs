using CommunityToolkit.Maui;
using Microsoft.Extensions.Logging;
using ZyxxyzMaui.Pages;
using ZyxxyzMaui.Services;
using ZyxxyzMaui.ViewModels;

namespace ZyxxyzMaui;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();

        builder
            .UseMauiApp<App>()
            .UseMauiCommunityToolkit()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf", "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

        builder.Services.AddSingleton<StatusService>();

        builder.Services.AddTransient<ChessViewModel>();
        builder.Services.AddTransient<StatusViewModel>();

        builder.Services.AddTransient<ChessPage>();
        builder.Services.AddTransient<StatusPage>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
