using Godot;
using Salvation.Core;
using Salvation.Enemies;

namespace Salvation.Player;

/// <summary>
/// The Paladin: highest Defense of the five. Free basic sword swing always
/// available; Divine Smite is the Magic-costing signature ability.
/// First character in the MVP vertical slice.
/// </summary>
public partial class Paladin : PlayerController
{
    [Export] public float BasicAttackDamage { get; set; } = 10f;
    [Export] public float BasicAttackRange { get; set; } = 48f;

    [Export] public float SmiteDamage { get; set; } = 30f;
    [Export] public float SmiteMagicCost { get; set; } = 15f;
    [Export] public float SmiteRange { get; set; } = 64f;

    public Paladin() => Id = CharacterId.Paladin;

    protected override Stats CreateStats() => new(
        maxHealth: 130f, maxMagic: 40f, speed: 200f, power: 16f, defense: 8f, faith: 5f);

    protected override Texture2D BuildSprite() => CharacterSprites.BuildPaladin();

    protected override void Attack()
    {
        StrikeInFacingCone(BasicAttackDamage, BasicAttackRange);
        GD.Print("Paladin: sword strike!");
    }

    protected override void UseMagic()
    {
        if (!Stats.TrySpendMagic(SmiteMagicCost))
        {
            GD.Print("Paladin: not enough Magic to Smite.");
            return;
        }

        bool landed = StrikeInFacingCone(SmiteDamage, SmiteRange);
        if (landed) RecordAbilityUsed(SmiteDamage);

        GD.Print("Paladin: Divine Smite!");
    }

    private bool StrikeInFacingCone(float damage, float range)
    {
        Vector2 origin = GlobalPosition;
        Vector2 facing = Vector2.Right.Rotated(Rotation);
        bool landed = false;

        foreach (Enemy target in Enemy.ActiveEnemies)
        {
            if (!GodotObject.IsInstanceValid(target)) continue;
            if (origin.DistanceTo(target.GlobalPosition) > range) continue;
            if (origin.DirectionTo(target.GlobalPosition).Dot(facing) < 0.5f) continue;

            target.TakeDamage(damage);
            landed = true;
        }

        return landed;
    }
}
