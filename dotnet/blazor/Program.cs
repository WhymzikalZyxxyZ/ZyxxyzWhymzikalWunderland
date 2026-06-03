using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using ZyxxyzBlazor.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<ZyxxyzBlazor.App>("#app");

builder.Services.AddScoped<ChessStateService>();

await builder.Build().RunAsync();
