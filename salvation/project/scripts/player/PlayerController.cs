using System.Collections.Generic;
using Godot;
using Salvation.Core;

namespace Salvation.Player;

/// <summary>
/// Base twin-stick controller shared by all five characters: left stick / WASD
/// moves, right stick / mouse aims, and a single attack action fires whatever
/// the concrete character's Attack() implements. Concrete characters (Paladin,
/// Cleric, ...) extend this and supply Stats + their own ability.
/// </summary>
public partial class PlayerController : CharacterBody2D
{
    /// <summary>
    /// The damage of the last ability that actually landed, and a counter that
    /// increments every time a new one does. Exists so bosses like Pride
    /// ("mirrors your last-used ability back at you") can observe and replay
    /// the player's own offense. Deliberately a polled property, not a Godot
    /// signal: a boss (a different script class) subscribing cross-object to
    /// a signal here reliably corrupted the CLR under this Godot 4.7.1 mono
    /// + .NET host after a few seconds — reproduced with the subscription as
    /// the only variable, boss health bar UI hit the identical bug (see
    /// BossHealthBar.cs). Consumers should poll LastAbilityUseId each frame
    /// and compare against a locally cached value to detect a new landing.
    /// </summary>
    public float LastAbilityDamage { get; private set; }
    public int LastAbilityUseId { get; private set; }

    /// <summary>
    /// Every currently-active player, maintained by hand rather than via
    /// GetTree().GetNodesInGroup(): querying that every physics frame (once
    /// per enemy, chasing) reliably corrupts the CLR after a couple dozen
    /// calls under this Godot 4.7.1 + .NET combination — reproduced down to
    /// a minimal CharacterBody2D with nothing else in the scene. A hand-kept
    /// managed list sidesteps the Variant-array marshaling path entirely.
    /// </summary>
    public static readonly List<PlayerController> ActivePlayers = new();

    [Export] public CharacterId Id { get; set; } = CharacterId.Paladin;

    [Export] public float DashSpeed { get; set; } = 720f;
    [Export] public float DashDuration { get; set; } = 0.15f;
    [Export] public float DashCooldown { get; set; } = 0.6f;

    /// <summary>
    /// How fast velocity chases the target each second (not a top speed cap).
    /// Zero would be instant snap-to-input, which reads as stiff/robotic;
    /// this is a light Hades-style "fluid but immediate" curve — high enough
    /// that full speed arrives in under a tenth of a second, not the kind of
    /// lag that reads as sliding.
    /// </summary>
    [Export] public float Acceleration { get; set; } = 26f;

    [Export] public float HitFlashDuration { get; set; } = 0.08f;

    /// <summary>
    /// Furi-style parry: a short, precise window — much narrower than the
    /// dash's i-frames, and rewards actually landing it rather than just
    /// surviving. A hit absorbed during the window costs nothing and
    /// refunds Magic instead.
    /// </summary>
    [Export] public float ParryWindow { get; set; } = 0.18f;
    [Export] public float ParryCooldown { get; set; } = 0.9f;
    [Export] public float ParryMagicRefund { get; set; } = 15f;

    protected Stats Stats { get; private set; } = null!;

    public float HealthRatio => Stats.MaxHealth > 0f ? Stats.Health / Stats.MaxHealth : 0f;
    public float MagicRatio => Stats.MaxMagic > 0f ? Stats.Magic / Stats.MaxMagic : 0f;

    /// <summary>True only for the duration of an active dash — the "minimal i-frames".</summary>
    public bool IsInvulnerable { get; private set; }

    private bool _isDashing;
    private double _dashTimeRemaining;
    private double _dashCooldownRemaining;
    private Vector2 _dashDirection;
    private double _dashAfterimageTimer;

    private bool _isParrying;
    private double _parryTimeRemaining;
    private double _parryCooldownRemaining;
    private double _parryFlashRemaining;

    private Sprite2D? _sprite;
    private double _hitFlashRemaining;

    public override void _Ready()
    {
        ActivePlayers.Add(this);
        Stats = CreateStats();

        // Grounded is the CharacterBody2D default and applies floor/slope/
        // wall-slide physics meant for platformers — with no gravity here,
        // that's what made movement feel "slidey". Floating is the mode
        // meant for top-down movement: input maps directly to velocity,
        // no residual slide against surfaces.
        MotionMode = MotionModeEnum.Floating;

        if (BuildSprite() is { } texture)
        {
            _sprite = new Sprite2D
            {
                Name = "Sprite2D",
                Texture = texture,
                TextureFilter = TextureFilterEnum.Nearest,
            };
            AddChild(_sprite);
        }
    }

    /// <summary>Concrete characters return their pixel-art texture (see CharacterSprites). Base has none.</summary>
    protected virtual Texture2D? BuildSprite() => null;

    public override void _ExitTree() => ActivePlayers.Remove(this);

    /// <summary>Concrete characters return their own baseline stat block.</summary>
    protected virtual Stats CreateStats() => new(
        maxHealth: 100f, maxMagic: 50f, speed: 220f, power: 12f, defense: 4f);

    public override void _PhysicsProcess(double delta)
    {
        Vector2 moveInput = Input.GetVector("move_left", "move_right", "move_up", "move_down");

        _dashCooldownRemaining -= delta;
        if (Input.IsActionJustPressed("dash") && !_isDashing && !_isParrying && _dashCooldownRemaining <= 0)
        {
            _dashDirection = moveInput != Vector2.Zero ? moveInput.Normalized() : Vector2.Right.Rotated(Rotation);
            _isDashing = true;
            _dashTimeRemaining = DashDuration;
            _dashCooldownRemaining = DashCooldown;
            IsInvulnerable = true;
        }

        if (_isDashing)
        {
            _dashTimeRemaining -= delta;
            Velocity = _dashDirection * DashSpeed;

            _dashAfterimageTimer -= delta;
            if (_dashAfterimageTimer <= 0)
            {
                _dashAfterimageTimer = 0.03;
                SpawnDashAfterimage();
            }

            if (_dashTimeRemaining <= 0)
            {
                _isDashing = false;
                IsInvulnerable = false;
            }
        }
        else
        {
            Vector2 target = moveInput * Stats.Speed;
            Velocity = Velocity.Lerp(target, (float)Mathf.Clamp(Acceleration * delta, 0, 1));
        }

        MoveAndSlide();

        _parryCooldownRemaining -= delta;
        if (Input.IsActionJustPressed("parry") && !_isParrying && !_isDashing && _parryCooldownRemaining <= 0)
        {
            _isParrying = true;
            _parryTimeRemaining = ParryWindow;
            _parryCooldownRemaining = ParryCooldown;
        }
        if (_isParrying)
        {
            _parryTimeRemaining -= delta;
            if (_parryTimeRemaining <= 0) _isParrying = false;
        }

        if (_hitFlashRemaining > 0) _hitFlashRemaining -= delta;
        if (_parryFlashRemaining > 0) _parryFlashRemaining -= delta;

        // Priority: hit flash (red) > perfect-parry flash (gold) > active parry window (blue tint) > normal.
        if (_sprite is not null)
        {
            _sprite.Modulate = _hitFlashRemaining > 0 ? new Color(1f, 0.4f, 0.4f)
                : _parryFlashRemaining > 0 ? new Color(1f, 0.95f, 0.55f)
                : _isParrying ? new Color(0.6f, 0.9f, 1f)
                : Colors.White;
        }

        Vector2 aimInput = Input.GetVector("aim_left", "aim_right", "aim_up", "aim_down");
        if (aimInput != Vector2.Zero)
            LookAt(GlobalPosition + aimInput);
        else if (GetViewport() is { } viewport)
            LookAt(viewport.GetMousePosition());

        if (Input.IsActionJustPressed("attack"))
            Attack();
        if (Input.IsActionJustPressed("magic"))
            UseMagic();
    }

    private void SpawnDashAfterimage()
    {
        if (_sprite?.Texture is null || GetParent() is not Node parent) return;

        var ghost = new DashAfterimage
        {
            Texture = _sprite.Texture,
            GlobalPosition = GlobalPosition,
            Rotation = Rotation,
            Modulate = new Color(1f, 1f, 1f, 0.45f),
            TextureFilter = TextureFilterEnum.Nearest,
        };
        parent.AddChild(ghost);
    }

    /// <summary>Free basic attack, always available. Base is an unarmed placeholder.</summary>
    protected virtual void Attack()
    {
        GD.Print($"{Id} attacks (base implementation — override in the concrete character).");
    }

    /// <summary>Each character's signature Magic-costing ability. Base does nothing.</summary>
    protected virtual void UseMagic()
    {
        GD.Print($"{Id} has no magic ability (base implementation — override in the concrete character).");
    }

    protected void RecordAbilityUsed(float damage)
    {
        LastAbilityDamage = damage;
        LastAbilityUseId++;
    }

    public void TakeDamage(float amount)
    {
        if (IsInvulnerable) return;

        if (_isParrying)
        {
            // Perfect parry: no damage taken, and it pays for itself —
            // reward for the precise timing risk, not just a free block.
            _isParrying = false;
            _parryFlashRemaining = 0.18;
            Stats.RestoreMagic(ParryMagicRefund);
            return;
        }

        Stats.TakeDamage(amount);
        _hitFlashRemaining = HitFlashDuration;
        if (!Stats.IsAlive)
            Die();
    }

    protected virtual void Die()
    {
        GD.Print($"{Id} has fallen.");
        ActivePlayers.Remove(this);

        // Disable collision before freeing: an enemy is very likely still
        // actively sliding against this body via MoveAndSlide the instant it
        // dies (that's usually what killed it). Freeing a CharacterBody2D
        // while another body is mid-collision with it crashed the physics
        // server in local testing; dropping out of collision detection first
        // avoids that specific case, though see Enemy.cs / PrideBoss.cs for
        // the broader finding: this Godot 4.7.1 mono + .NET host destabilizes
        // after ~25-30s of continuous headless execution independent of game
        // logic, which this alone does not fully address.
        if (GetNodeOrNull<CollisionShape2D>("CollisionShape2D") is { } collision)
            collision.Disabled = true;

        QueueFree();
    }
}
