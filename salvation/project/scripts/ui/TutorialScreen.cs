using Godot;

namespace Salvation.UI;

/// <summary>
/// The controls legend shown before a run starts. Dismisses into the
/// dungeon on any of the existing gameplay actions being pressed — no new
/// input action needed, and no Button/TouchScreenButton "pressed" signal
/// subscription (unsafe here, see BossHealthBar.cs): just polling
/// Input.IsActionJustPressed each frame, the same pattern used everywhere
/// else in this project.
/// </summary>
public partial class TutorialScreen : Control
{
    [Export] public string NextScenePath { get; set; } = "res://scenes/levels/level1.tscn";

    private Label? _prompt;
    private double _pulseTime;

    public override void _Ready()
    {
        _prompt = GetNodeOrNull<Label>("VBox/Prompt");
    }

    public override void _Process(double delta)
    {
        _pulseTime += delta;
        if (_prompt is not null)
        {
            float alpha = 0.55f + 0.45f * Mathf.Sin((float)_pulseTime * 3f);
            Color c = _prompt.Modulate;
            c.A = alpha;
            _prompt.Modulate = c;
        }

        if (Input.IsActionJustPressed("attack") || Input.IsActionJustPressed("magic") || Input.IsActionJustPressed("dash"))
            GetTree().ChangeSceneToFile(NextScenePath);
    }
}
