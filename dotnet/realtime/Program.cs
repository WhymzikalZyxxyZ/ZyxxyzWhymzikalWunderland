using ZyxxyzRealtime;
using ZyxxyzRealtime.Hubs;
using ZyxxyzRealtime.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<RoomService>();
builder.Services.AddSignalR();
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.SetIsOriginAllowed(_ => true)
     .AllowAnyHeader()
     .AllowAnyMethod()
     .AllowCredentials()));

var app = builder.Build();

app.UseCors();
app.MapHub<ChatHub>("/hubs/chat");

// Simple HTML demo client served at /
app.MapGet("/", () => Results.Content(DemoClient.Html, "text/html"));

app.Run();
