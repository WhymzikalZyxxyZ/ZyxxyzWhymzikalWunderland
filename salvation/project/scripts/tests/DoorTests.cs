using Chickensoft.GoDotTest;
using Godot;
using Salvation.Enemies;
using Salvation.Rooms;

namespace Salvation.Tests;

/// <summary>
/// Scene-level Door lock state — synchronous, _Ready()-time only. Same
/// no-signal-waiting constraint as RoomTests: see that file's doc comment.
/// </summary>
public class DoorTests : TestClass
{
    private readonly Node _testScene;

    public DoorTests(Node testScene) : base(testScene)
    {
        _testScene = testScene;
    }

    [Test]
    public void Door_StartsLocked_WhenGatedRoomHasAnEnemy()
    {
        var gatedRoom = new Room { Name = "Gated", Bounds = new Rect2(-100, -100, 200, 200) };
        gatedRoom.AddChild(new Sinner());
        _testScene.AddChild(gatedRoom);

        var door = new Door { GatedRoomPath = new NodePath("../Gated") };
        door.AddChild(new CollisionShape2D { Name = "CollisionShape2D", Shape = new RectangleShape2D { Size = new Vector2(20, 90) } });
        _testScene.AddChild(door);

        var collision = door.GetNode<CollisionShape2D>("CollisionShape2D");
        if (collision.Disabled)
            throw new System.Exception("A door gated by an uncleared room should start with collision enabled (locked).");

        door.QueueFree();
        gatedRoom.QueueFree();
    }

    [Test]
    public void Door_StartsUnlocked_WhenGatedRoomIsAlreadyClear()
    {
        var clearRoom = new Room { Name = "Clear", Bounds = new Rect2(-100, -100, 200, 200) }; // no enemy children -> IsCleared immediately
        _testScene.AddChild(clearRoom);

        var door = new Door { GatedRoomPath = new NodePath("../Clear") };
        door.AddChild(new CollisionShape2D { Name = "CollisionShape2D", Shape = new RectangleShape2D { Size = new Vector2(20, 90) } });
        _testScene.AddChild(door);

        var collision = door.GetNode<CollisionShape2D>("CollisionShape2D");
        if (!collision.Disabled)
            throw new System.Exception("A door gated by an already-cleared room should start with collision disabled (unlocked).");

        door.QueueFree();
        clearRoom.QueueFree();
    }

    [Test]
    public void Door_WithNoGatedRoom_StartsUnlocked()
    {
        var door = new Door(); // GatedRoomPath left empty
        door.AddChild(new CollisionShape2D { Name = "CollisionShape2D", Shape = new RectangleShape2D { Size = new Vector2(20, 90) } });
        _testScene.AddChild(door);

        var collision = door.GetNode<CollisionShape2D>("CollisionShape2D");
        if (!collision.Disabled)
            throw new System.Exception("A door with no GatedRoomPath should start open.");

        door.QueueFree();
    }
}
