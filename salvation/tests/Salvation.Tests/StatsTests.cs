using Salvation.Core;
using Xunit;

namespace Salvation.Tests;

public class StatsTests
{
    [Fact]
    public void TakeDamage_MitigatesByDefense_FlooredAtOne()
    {
        var stats = new Stats(maxHealth: 100, maxMagic: 0, speed: 0, power: 0, defense: 8);

        stats.TakeDamage(8); // raw 8 - defense 8 = 0, floored to a minimum of 1

        Assert.Equal(99, stats.Health);
    }

    [Fact]
    public void TakeDamage_NeverGoesBelowZero()
    {
        var stats = new Stats(maxHealth: 10, maxMagic: 0, speed: 0, power: 0, defense: 0);

        stats.TakeDamage(1000);

        Assert.Equal(0, stats.Health);
        Assert.False(stats.IsAlive);
    }

    [Fact]
    public void Heal_ClampsToMaxHealth()
    {
        var stats = new Stats(maxHealth: 50, maxMagic: 0, speed: 0, power: 0, defense: 0);
        stats.TakeDamage(10);

        stats.Heal(1000);

        Assert.Equal(50, stats.Health);
    }

    [Fact]
    public void TrySpendMagic_FailsAndLeavesMagicUnchanged_WhenInsufficient()
    {
        var stats = new Stats(maxHealth: 10, maxMagic: 20, speed: 0, power: 0, defense: 0);

        bool spent = stats.TrySpendMagic(25);

        Assert.False(spent);
        Assert.Equal(20, stats.Magic);
    }

    [Fact]
    public void TrySpendMagic_SucceedsAndDeducts_WhenSufficient()
    {
        var stats = new Stats(maxHealth: 10, maxMagic: 20, speed: 0, power: 0, defense: 0);

        bool spent = stats.TrySpendMagic(15);

        Assert.True(spent);
        Assert.Equal(5, stats.Magic);
    }

    [Fact]
    public void RestoreMagic_ClampsToMaxMagic()
    {
        var stats = new Stats(maxHealth: 10, maxMagic: 20, speed: 0, power: 0, defense: 0);
        stats.TrySpendMagic(15);

        stats.RestoreMagic(1000);

        Assert.Equal(20, stats.Magic);
    }
}
