using Chickensoft.GoDotTest;
using Godot;
using Salvation.Enemies;
using Salvation.Rooms;

namespace Salvation.Tests;

/// <summary>
/// Scene-level Room behavior — only what's observable synchronously right
/// after AddChild(room), i.e. what Room._Ready() itself sets up. No
/// physics-frame waiting: Godot's usual way to await a frame is
/// ToSignal(...), and subscribing to a Godot signal here reliably corrupted
/// the CLR (see BossHealthBar.cs's doc comment) — that finding applies just
/// as much to test code as it does to game code, so these tests don't do it.
/// </summary>
public class RoomTests : TestClass
{
    private readonly Node _testScene;

    public RoomTests(Node testScene) : base(testScene)
    {
        _testScene = testScene;
    }

    [Test]
    public void RoomWithNoEnemies_IsClearedImmediately()
    {
        var room = new Room { Bounds = new Rect2(-100, -100, 200, 200) };
        _testScene.AddChild(room);

        if (!room.IsCleared)
            throw new System.Exception("A room with no enemy children should be IsCleared immediately after _Ready().");

        room.QueueFree();
    }

    [Test]
    public void RoomWithAnEnemyChild_IsNotClearedYet()
    {
        var room = new Room { Bounds = new Rect2(-100, -100, 200, 200) };
        room.AddChild(new Sinner()); // attached before entering the tree — see DungeonGenerator.cs's doc comment on why order matters
        _testScene.AddChild(room);

        if (room.IsCleared)
            throw new System.Exception("A room with a live enemy child should not be IsCleared yet.");

        room.QueueFree();
    }

    [Test]
    public void Room_GeneratesAtLeastOneWallBody()
    {
        var room = new Room { Bounds = new Rect2(-100, -100, 200, 200) };
        _testScene.AddChild(room);

        int wallCount = 0;
        foreach (Node child in room.GetChildren())
        {
            if (child is StaticBody2D) wallCount++;
        }

        if (wallCount == 0)
            throw new System.Exception("Room._Ready() should generate at least one StaticBody2D wall.");

        room.QueueFree();
    }
}
