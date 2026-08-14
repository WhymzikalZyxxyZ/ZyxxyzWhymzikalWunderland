using Godot;
using Salvation.Core;
using Salvation.Player;

namespace Salvation.Enemies;

/// <summary>
/// Level 1 boss. Unique mechanic: mirrors the player's last-landed ability
/// back at them on a delay instead of chasing — tests unpredictable ability
/// use, since attacking recklessly hands Pride its own next attack.
///
/// Furi-inspired on top of that: the counter-strike is clearly telegraphed
/// (the boss flares gold for TelegraphDuration before it actually lands,
/// giving a real window to dash or parry away — Furi's bosses are brutal
/// but never cheap, every hit is readable) and Pride gets more aggressive,
/// not less fair, as its health drops: past 50% the mirror cooldown
/// shortens and its range extends, but the telegraph window stays exactly
/// as long. Faster fights, same rules.
///
/// Deliberately avoids overriding _Ready() (calling base._Ready() from an
/// Enemy subclass reliably corrupted the CLR under this Godot 4.7.1 mono +
/// .NET host) and cross-object signal subscriptions (same corruption,
/// reproduced independently via BossHealthBar.cs). Both are genuine engine
/// bugs, not logic errors. What WAS a logic error, also found here: caching
/// a player reference and never revalidating it — if that player dies and
/// is freed, touching the stale reference throws, and that thrown
/// exception's own stack-trace capture is what actually corrupts the CLR.
/// _trackedPlayer is now checked with GodotObject.IsInstanceValid every
/// frame and dropped the moment it goes stale.
/// </summary>
public partial class PrideBoss : Enemy
{
    [Export] public float MirrorInterval { get; set; } = 4f;
    [Export] public float MirrorRange { get; set; } = 220f;
    [Export] public float TelegraphDuration { get; set; } = 0.45f;

    [Export] public float EnragedHealthThreshold { get; set; } = 0.5f;
    [Export] public float EnragedMirrorInterval { get; set; } = 2.5f;
    [Export] public float EnragedMirrorRange { get; set; } = 280f;

    private float _mirroredDamage;
    private double _mirrorCooldownRemaining;
    private PlayerController? _trackedPlayer;
    private int _lastSeenAbilityUseId = -1;

    private bool _isTelegraphing;
    private double _telegraphTimeRemaining;
    private bool _isEnraged;

    protected override Stats CreateStats() => new(
        maxHealth: 220f, maxMagic: 0f, speed: 0f, power: 10f, defense: 6f);

    protected override Texture2D BuildSprite() => CharacterSprites.BuildPrideBoss();

    protected override void Chase()
    {
        Velocity = Vector2.Zero;

        if (_trackedPlayer is not null && !GodotObject.IsInstanceValid(_trackedPlayer))
        {
            _trackedPlayer = null;
            _lastSeenAbilityUseId = -1;
        }

        _trackedPlayer ??= FindNearestPlayer();
    }

    public override void _PhysicsProcess(double delta)
    {
        base._PhysicsProcess(delta);

        if (!_isEnraged && HealthRatio <= EnragedHealthThreshold)
        {
            _isEnraged = true;
            GD.Print("Pride's composure cracks — it stops holding back.");
        }

        float mirrorInterval = _isEnraged ? EnragedMirrorInterval : MirrorInterval;
        float mirrorRange = _isEnraged ? EnragedMirrorRange : MirrorRange;

        if (_trackedPlayer is null || !GodotObject.IsInstanceValid(_trackedPlayer))
        {
            UpdateTelegraphGlow();
            return;
        }

        if (_lastSeenAbilityUseId < 0)
        {
            // First frame we've seen this player: baseline without mirroring
            // whatever they did before Pride ever noticed them.
            _lastSeenAbilityUseId = _trackedPlayer.LastAbilityUseId;
        }
        else if (_trackedPlayer.LastAbilityUseId != _lastSeenAbilityUseId)
        {
            _lastSeenAbilityUseId = _trackedPlayer.LastAbilityUseId;
            _mirroredDamage = _trackedPlayer.LastAbilityDamage;
            _mirrorCooldownRemaining = mirrorInterval;
            _isTelegraphing = false;
        }

        if (_mirroredDamage > 0f && !_isTelegraphing)
        {
            _mirrorCooldownRemaining -= delta;
            if (_mirrorCooldownRemaining <= 0 && GlobalPosition.DistanceTo(_trackedPlayer.GlobalPosition) <= mirrorRange)
            {
                _isTelegraphing = true;
                _telegraphTimeRemaining = TelegraphDuration;
            }
        }

        if (_isTelegraphing)
        {
            _telegraphTimeRemaining -= delta;
            if (_telegraphTimeRemaining <= 0)
            {
                _isTelegraphing = false;
                if (Sprite is not null) Sprite.Modulate = Colors.White;

                float damage = _mirroredDamage;
                _mirroredDamage = 0f;

                // Re-check range at the moment of impact, not just when the
                // telegraph started — stepping out during the window should
                // actually save you, not just delay the inevitable.
                if (GodotObject.IsInstanceValid(_trackedPlayer) && GlobalPosition.DistanceTo(_trackedPlayer.GlobalPosition) <= mirrorRange)
                {
                    GD.Print($"Pride's mirrored strike lands for {damage} damage!");
                    _trackedPlayer.TakeDamage(damage);
                }
            }
        }

        UpdateTelegraphGlow();
    }

    private void UpdateTelegraphGlow()
    {
        if (Sprite is null) return;
        if (!_isTelegraphing) return;

        // Pulses rather than a flat tint — a static glow is easy to miss, a pulse reads as "about to happen."
        float pulse = 0.6f + 0.4f * Mathf.Sin((float)(_telegraphTimeRemaining * 30.0));
        Sprite.Modulate = new Color(1f, 0.85f + 0.15f * pulse, 0.4f * pulse);
    }
}
