using System.Collections.Concurrent;
using ZyxxyzRealtime.Models;

namespace ZyxxyzRealtime.Services;

public class RoomService
{
    private const int MaxHistory = 50;

    // connectionId -> (room, username)
    private readonly ConcurrentDictionary<string, (string Room, string Username)> _connections = new();
    // room -> circular message buffer
    private readonly ConcurrentDictionary<string, Queue<ChatMessage>> _history = new();

    public void Join(string room, string connectionId, string username)
    {
        _connections[connectionId] = (room, username);
        _history.TryAdd(room, new Queue<ChatMessage>());
    }

    public string? Leave(string room, string connectionId)
    {
        if (_connections.TryRemove(connectionId, out var info) && info.Room == room)
            return info.Username;
        return null;
    }

    public (string? Room, string? Username) Disconnect(string connectionId)
    {
        if (_connections.TryRemove(connectionId, out var info))
            return (info.Room, info.Username);
        return (null, null);
    }

    public void AddMessage(string room, ChatMessage msg)
    {
        var queue = _history.GetOrAdd(room, _ => new Queue<ChatMessage>());
        lock (queue)
        {
            queue.Enqueue(msg);
            if (queue.Count > MaxHistory)
                queue.Dequeue();
        }
    }

    public IReadOnlyList<ChatMessage> GetHistory(string room)
    {
        if (!_history.TryGetValue(room, out var queue)) return [];
        lock (queue) return queue.ToList();
    }
}
