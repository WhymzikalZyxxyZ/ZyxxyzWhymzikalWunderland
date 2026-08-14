using Godot;

namespace Salvation.Core;

/// <summary>
/// A single fading ghost sprite left behind during a dash. Fully
/// self-contained — fades and frees itself in _Process, no cross-object
/// references or signals of any kind.
/// </summary>
public partial class DashAfterimage : Sprite2D
{
    [Export] public float FadeDuration { get; set; } = 0.22f;

    private double _age;
    private float _startAlpha;

    public override void _Ready() => _startAlpha = Modulate.A;

    public override void _Process(double delta)
    {
        _age += delta;
        if (_age >= FadeDuration)
        {
            QueueFree();
            return;
        }

        Color c = Modulate;
        c.A = _startAlpha * (1f - (float)(_age / FadeDuration));
        Modulate = c;
    }
}
