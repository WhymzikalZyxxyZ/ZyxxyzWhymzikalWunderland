using Godot;
using Salvation.Enemies;

namespace Salvation.UI;

/// <summary>
/// Top-of-screen boss health bar: bar on top, boss name centered under it.
/// Hides itself if BossPath doesn't resolve to a boss, and again once that
/// boss is defeated. The bar eases toward its target rather than snapping
/// instantly, so a hit reads as a drain rather than a stiff jump-cut.
///
/// Deliberately avoids ANY cross-object signal subscription (custom or
/// built-in, e.g. TreeExited): under this Godot 4.7.1 mono + .NET host,
/// a Control subscribing to a CharacterBody2D's event reliably corrupted
/// the CLR after a few seconds, reproduced with nothing else changed —
/// not something fixable on our side (see PrideBoss.cs and Enemy.cs for
/// the other, related engine-level findings from this same investigation).
/// Instead this polls in _PhysicsProcess (not the uncapped _Process).
/// </summary>
public partial class BossHealthBar : Control
{
    [Export] public NodePath BossPath { get; set; } = new();
    [Export] public float SmoothSpeed { get; set; } = 7f;

    private ProgressBar? _bar;
    private Label? _nameLabel;
    private Enemy? _boss;
    private float _targetRatio = 1f;
    private float _displayedRatio = 1f;

    public override void _Ready()
    {
        _bar = GetNode<ProgressBar>("VBox/HealthBar");
        _nameLabel = GetNode<Label>("VBox/NameLabel");
        Visible = false;

        if (GetNodeOrNull(BossPath) is Enemy boss && boss.IsBoss)
            BindBoss(boss);
    }

    /// <summary>For procedurally generated levels: wire a boss directly, no NodePath needed.</summary>
    public void BindBoss(Enemy boss)
    {
        _boss = boss;
        _targetRatio = _displayedRatio = boss.HealthRatio;
        if (_nameLabel is not null) _nameLabel.Text = boss.DisplayName;
        if (_bar is not null) _bar.Value = _displayedRatio * _bar.MaxValue;
    }

    public override void _PhysicsProcess(double delta)
    {
        if (_boss is null || _bar is null) return;

        if (!GodotObject.IsInstanceValid(_boss))
        {
            Visible = false;
            _boss = null;
            return;
        }

        _targetRatio = _boss.HealthRatio;
        Visible = true;

        if (Mathf.Abs(_displayedRatio - _targetRatio) <= 0.002f) return;

        float t = (float)Mathf.Clamp(SmoothSpeed * delta, 0, 1);
        _displayedRatio = Mathf.Lerp(_displayedRatio, _targetRatio, t);
        _bar.Value = _displayedRatio * _bar.MaxValue;
    }
}
