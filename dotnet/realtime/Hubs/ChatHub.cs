using Microsoft.AspNetCore.SignalR;
using ZyxxyzRealtime.Models;
using ZyxxyzRealtime.Services;

namespace ZyxxyzRealtime.Hubs;

public class ChatHub(RoomService rooms) : Hub
{
    public async Task JoinRoom(string room, string username)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, room);
        rooms.Join(room, Context.ConnectionId, username);

        var history = rooms.GetHistory(room);
        await Clients.Caller.SendAsync("History", history);

        await Clients.OthersInGroup(room).SendAsync("UserJoined", username);
    }

    public async Task LeaveRoom(string room)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, room);
        var username = rooms.Leave(room, Context.ConnectionId);
        if (username is not null)
            await Clients.OthersInGroup(room).SendAsync("UserLeft", username);
    }

    public async Task SendMessage(string room, string username, string text)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Length > 500) return;

        var msg = new ChatMessage(room, username, text.Trim(), DateTime.UtcNow);
        rooms.AddMessage(room, msg);

        await Clients.Group(room).SendAsync("ReceiveMessage", msg);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var (room, username) = rooms.Disconnect(Context.ConnectionId);
        if (room is not null && username is not null)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, room);
            await Clients.OthersInGroup(room).SendAsync("UserLeft", username);
        }
        await base.OnDisconnectedAsync(exception);
    }
}
