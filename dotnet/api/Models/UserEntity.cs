namespace ZyxxyzApi.Models;

public class UserEntity
{
    public int    Id           { get; set; }
    public string Username     { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public DateTime CreatedAt  { get; set; } = DateTime.UtcNow;
}
