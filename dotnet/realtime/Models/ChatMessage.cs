namespace ZyxxyzRealtime.Models;

public record ChatMessage(string Room, string Username, string Text, DateTime SentAt);
