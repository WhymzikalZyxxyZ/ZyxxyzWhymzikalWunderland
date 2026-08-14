using System.Collections.Generic;
using Godot;

namespace Salvation.Core;

/// <summary>
/// Meta-progression persisted across runs: which characters and relics have
/// been earned. Registered as an autoload singleton (see project.godot) so
/// every scene can reach it as "RunProgress". A cleared run is never a dead
/// end — CompleteRun always grants exactly one new unlock, so the game is
/// provably finishable end to end: Paladin -> ... -> Prophet -> every relic.
/// </summary>
public partial class RunProgress : Node
{
    private const string SavePath = "user://salvation_progress.cfg";

    private readonly HashSet<CharacterId> _unlockedCharacters = new() { CharacterId.Paladin };
    private readonly HashSet<string> _unlockedRelics = new();

    public override void _Ready() => Load();

    public bool IsUnlocked(CharacterId id) => _unlockedCharacters.Contains(id);

    public IReadOnlyCollection<string> UnlockedRelics => _unlockedRelics;

    /// <summary>
    /// Called when a run ends in victory (the current final boss of whatever
    /// content is unlocked is defeated). Grants the next locked character in
    /// sequence, or — once all five are unlocked — a relic-tier reward instead,
    /// so there is always a next thing to play for.
    /// </summary>
    public string CompleteRun()
    {
        foreach (CharacterId candidate in System.Enum.GetValues<CharacterId>())
        {
            if (!_unlockedCharacters.Contains(candidate))
            {
                _unlockedCharacters.Add(candidate);
                Save();
                return $"{candidate} has answered the call.";
            }
        }

        string relicName = $"Relic of the {_unlockedRelics.Count + 1} Trial";
        _unlockedRelics.Add(relicName);
        Save();
        return $"{relicName} is yours.";
    }

    private void Save()
    {
        using ConfigFile config = new();
        var characters = new Godot.Collections.Array();
        foreach (CharacterId id in _unlockedCharacters) characters.Add(id.ToString());
        config.SetValue("progress", "characters", characters);

        var relics = new Godot.Collections.Array();
        foreach (string relic in _unlockedRelics) relics.Add(relic);
        config.SetValue("progress", "relics", relics);

        config.Save(SavePath);
    }

    private void Load()
    {
        using ConfigFile config = new();
        if (config.Load(SavePath) != Error.Ok) return;

        if (config.GetValue("progress", "characters").AsGodotArray() is { } characters)
        {
            foreach (var entry in characters)
            {
                if (System.Enum.TryParse(entry.AsString(), out CharacterId id))
                    _unlockedCharacters.Add(id);
            }
        }

        if (config.GetValue("progress", "relics").AsGodotArray() is { } relics)
        {
            foreach (var entry in relics)
                _unlockedRelics.Add(entry.AsString());
        }
    }
}
