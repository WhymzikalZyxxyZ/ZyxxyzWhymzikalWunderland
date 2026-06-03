namespace ZyxxyzApi.Models;

public class ScoreEntity
{
    public int    Id       { get; set; }
    public string Username { get; set; } = "";
    public string Game     { get; set; } = "";
    public int    Value    { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
