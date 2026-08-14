using System.Collections.Generic;
using Godot;
using Salvation.Core;
using Salvation.Player;

namespace Salvation.Enemies;

/// <summary>
/// Base enemy: chases the nearest player, deals contact damage, and dies
/// when Stats.Health hits zero. Tracked via a hand-kept static list rather
/// than a Godot group — see PlayerController.ActivePlayers for why
/// GetTree().GetNodesInGroup() is unsafe to call every physics frame here.
/// Concrete enemies override CreateStats and can override Chase for
/// non-chase movement patterns.
/// </summary>
public partial class Enemy : CharacterBody2D
{
    public static readonly List<Enemy> ActiveEnemies = new();

    [Export] public float ContactDamage { get; set; } = 8f;
    [Export] public float ContactDamageCooldown { get; set; } = 1f;

    /// <summary>Marks this enemy for the boss health bar UI. Rank-and-file enemies leave this false.</summary>
    [Export] public bool IsBoss { get; set; }
    [Export] public string DisplayName { get; set; } = "";

    [Export] public float HitFlashDuration { get; set; } = 0.08f;
    [Export] public float KnockbackForce { get; set; } = 260f;
    [Export] public float KnockbackDuration { get; set; } = 0.12f;

    protected Stats Stats { get; private set; } = null!;

    public float HealthRatio => Stats.MaxHealth > 0f ? Stats.Health / Stats.MaxHealth : 0f;

    private double _contactDamageCooldownRemaining;

    /// <summary>Protected so subclasses (e.g. PrideBoss) can drive their own modulate effects like attack telegraphs.</summary>
    protected Sprite2D? Sprite;

    private double _hitFlashRemaining;
    private double _knockbackRemaining;
    private Vector2 _knockbackVelocity;

    public override void _Ready()
    {
        ActiveEnemies.Add(this);
        Stats = CreateStats();
        MotionMode = MotionModeEnum.Floating;

        if (BuildSprite() is { } texture)
        {
            Sprite = new Sprite2D
            {
                Name = "Sprite2D",
                Texture = texture,
                TextureFilter = TextureFilterEnum.Nearest,
            };
            AddChild(Sprite);
        }
    }

    /// <summary>Concrete enemies return their pixel-art texture (see CharacterSprites). Base has none.</summary>
    protected virtual Texture2D? BuildSprite() => null;

    public override void _ExitTree() => ActiveEnemies.Remove(this);

    /// <summary>Guards against a player dying and being freed between when a caller last checked and now.</summary>
    protected static bool IsAlivePlayer(PlayerController? player) =>
        player is not null && GodotObject.IsInstanceValid(player);

    protected virtual Stats CreateStats() => new(
        maxHealth: 40f, maxMagic: 0f, speed: 90f, power: 6f, defense: 2f);

    public override void _PhysicsProcess(double delta)
    {
        Chase();
        MoveAndSlide();

        if (_hitFlashRemaining > 0)
        {
            _hitFlashRemaining -= delta;
            if (Sprite is not null)
                Sprite.Modulate = _hitFlashRemaining > 0 ? new Color(1.8f, 1.8f, 1.8f) : Colors.White;
        }

        if (_knockbackRemaining > 0)
            _knockbackRemaining -= delta;

        _contactDamageCooldownRemaining -= delta;
        if (_contactDamageCooldownRemaining > 0) return;

        for (int i = 0; i < GetSlideCollisionCount(); i++)
        {
            var collider = GetSlideCollision(i).GetCollider();
            if (collider is not PlayerController player || !IsAlivePlayer(player)) continue;

            player.TakeDamage(ContactDamage);
            _contactDamageCooldownRemaining = ContactDamageCooldown;
            break;
        }
    }

    protected virtual void Chase()
    {
        if (_knockbackRemaining > 0)
        {
            Velocity = _knockbackVelocity;
            return;
        }

        PlayerController? target = FindNearestPlayer();
        if (target is null)
        {
            Velocity = Vector2.Zero;
            return;
        }

        Velocity = GlobalPosition.DirectionTo(target.GlobalPosition) * Stats.Speed;
    }

    protected PlayerController? FindNearestPlayer()
    {
        PlayerController? nearest = null;
        float nearestDistance = float.MaxValue;

        foreach (PlayerController player in PlayerController.ActivePlayers)
        {
            if (!IsAlivePlayer(player)) continue;

            float distance = GlobalPosition.DistanceSquaredTo(player.GlobalPosition);
            if (distance < nearestDistance)
            {
                nearestDistance = distance;
                nearest = player;
            }
        }

        return nearest;
    }

    public void TakeDamage(float amount)
    {
        Stats.TakeDamage(amount);
        _hitFlashRemaining = HitFlashDuration;

        PlayerController? nearestPlayer = FindNearestPlayer();
        if (nearestPlayer is not null)
        {
            _knockbackVelocity = nearestPlayer.GlobalPosition.DirectionTo(GlobalPosition) * KnockbackForce;
            _knockbackRemaining = KnockbackDuration;
        }

        if (!Stats.IsAlive)
            Defeat();
    }

    /// <summary>
    /// Called on death, before this enemy is removed from the tree. Concrete
    /// enemies/rooms can override to award drops. The Redeem-vs-Smite choice
    /// from the design doc hooks in here once the choice UI exists — for now
    /// every defeat behaves as a Smite (no Faith gained).
    /// </summary>
    protected virtual void Defeat()
    {
        ActiveEnemies.Remove(this);

        if (GetNodeOrNull<CollisionShape2D>("CollisionShape2D") is { } collision)
            collision.Disabled = true;

        QueueFree();
    }
}
