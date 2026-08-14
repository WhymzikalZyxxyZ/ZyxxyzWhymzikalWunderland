using Godot;

namespace Salvation.Tests;

#if DEBUG
using System.Reflection;
using Chickensoft.GoDotTest;
#endif

/// <summary>
/// GoDotTest entry point — runs INSIDE a real Godot process (unlike
/// Salvation.Tests, the plain-xUnit project, which crashes on anything
/// that constructs a Node-derived type outside the engine). This is for
/// scene-level behavior only: Room/Door lock state, wall/floor generation,
/// anything that needs a live SceneTree.
///
/// Only wired to scenes/tests/test_main.tscn — never the game's real main
/// scene — so running the actual game is completely unaffected by this.
/// Invoke via: godot --headless --path . scenes/tests/test_main.tscn -- --run-tests
///
/// Deliberately DEBUG-only (matches GoDotTest's own convention): this
/// dependency and all test code should never ship in a release export.
/// </summary>
public partial class TestMain : Node2D
{
#if DEBUG
    private TestEnvironment _environment = default!;
#endif

    public override void _Ready()
    {
#if DEBUG
        // GetCmdlineUserArgs(), not GetCmdlineArgs(): the latter includes the
        // scene path itself (everything before "--"), which TestEnvironment
        // doesn't expect and silently ignores anyway — but only the user args
        // (after "--") reliably carry flags like --run-tests.
        _environment = TestEnvironment.From(OS.GetCmdlineUserArgs());
        if (_environment.ShouldRunTests)
        {
            CallDeferred(nameof(RunTests));
            return;
        }
#endif
        GD.Print("TestMain: no --run-tests flag given, nothing to do.");
        GetTree().Quit();
    }

#if DEBUG
    private void RunTests() => _ = GoTest.RunTests(Assembly.GetExecutingAssembly(), this, _environment);
#endif
}
