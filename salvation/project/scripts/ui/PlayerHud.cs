using Godot;
using Salvation.Player;

namespace Salvation.UI;

/// <summary>
/// Health and Magic bars for the local player. Polls HealthRatio/MagicRatio
/// in _PhysicsProcess rather than subscribing to any signal — see
/// BossHealthBar.cs for why cross-object subscriptions are unsafe here.
/// Bar values ease toward their target instead of snapping instantly: a
/// hit or a Smite cast reads as a fluid drain, not a stiff jump-cut.
/// Attack/Magic buttons are plain TouchScreenButton nodes bound to the
/// "attack"/"magic" input actions in the scene itself, so they need no
/// script wiring at all: pressing one is indistinguishable from the
/// keyboard/mouse binding as far as PlayerController is concerned.
/// </summary>
public partial class PlayerHud : Control
{
    [Export] public NodePath PlayerPath { get; set; } = new();
    [Export] public float SmoothSpeed { get; set; } = 9f;

    private ProgressBar? _healthBar;
    private ProgressBar? _magicBar;
    private PlayerController? _player;

    private float _targetHealthRatio = 1f;
    private float _targetMagicRatio = 1f;
    private float _displayedHealthRatio = 1f;
    private float _displayedMagicRatio = 1f;

    private TouchScreenButton? _attackButton;
    private TouchScreenButton? _magicButton;
    private Vector2 _attackButtonBaseScale = Vector2.One;
    private Vector2 _magicButtonBaseScale = Vector2.One;

    public override void _Ready()
    {
        _healthBar = GetNode<ProgressBar>("Bars/HealthBar");
        _magicBar = GetNode<ProgressBar>("Bars/MagicBar");

        if (GetNodeOrNull(PlayerPath) is PlayerController player)
            BindPlayer(player);

        // Tactile press feedback for the on-screen buttons — a button that
        // never visibly reacts to being held reads as dead/unresponsive.
        _attackButton = GetNodeOrNull<TouchScreenButton>("../AttackButton");
        _magicButton = GetNodeOrNull<TouchScreenButton>("../MagicButton");
        if (_attackButton is not null) _attackButtonBaseScale = _attackButton.Scale;
        if (_magicButton is not null) _magicButtonBaseScale = _magicButton.Scale;
    }

    /// <summary>For procedurally generated levels: wire the player directly, no NodePath needed.</summary>
    public void BindPlayer(PlayerController player)
    {
        _player = player;
        _targetHealthRatio = _displayedHealthRatio = player.HealthRatio;
        _targetMagicRatio = _displayedMagicRatio = player.MagicRatio;
        ApplyBarValues();
    }

    public override void _PhysicsProcess(double delta)
    {
        if (_player is null || !GodotObject.IsInstanceValid(_player))
        {
            _player = null;
            return;
        }

        _targetHealthRatio = _player.HealthRatio;
        _targetMagicRatio = _player.MagicRatio;

        float t = (float)Mathf.Clamp(SmoothSpeed * delta, 0, 1);
        bool changed = false;

        if (Mathf.Abs(_displayedHealthRatio - _targetHealthRatio) > 0.002f)
        {
            _displayedHealthRatio = Mathf.Lerp(_displayedHealthRatio, _targetHealthRatio, t);
            changed = true;
        }
        if (Mathf.Abs(_displayedMagicRatio - _targetMagicRatio) > 0.002f)
        {
            _displayedMagicRatio = Mathf.Lerp(_displayedMagicRatio, _targetMagicRatio, t);
            changed = true;
        }

        if (changed) ApplyBarValues();

        UpdateButtonPress(_attackButton, _attackButtonBaseScale, delta);
        UpdateButtonPress(_magicButton, _magicButtonBaseScale, delta);
    }

    private static void UpdateButtonPress(TouchScreenButton? button, Vector2 baseScale, double delta)
    {
        if (button is null) return;

        Vector2 target = button.IsPressed() ? baseScale * 0.9f : baseScale;
        button.Scale = button.Scale.Lerp(target, (float)Mathf.Clamp(16.0 * delta, 0, 1));
    }

    private void ApplyBarValues()
    {
        if (_healthBar is not null) _healthBar.Value = _displayedHealthRatio * _healthBar.MaxValue;
        if (_magicBar is not null) _magicBar.Value = _displayedMagicRatio * _magicBar.MaxValue;
    }
}
