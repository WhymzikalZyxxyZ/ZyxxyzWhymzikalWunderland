using Microsoft.EntityFrameworkCore;
using ZyxxyzApi.Models;

namespace ZyxxyzApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<ScoreEntity> Scores => Set<ScoreEntity>();
    public DbSet<UserEntity> Users   => Set<UserEntity>();
}
