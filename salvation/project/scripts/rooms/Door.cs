using Godot;

namespace Salvation.Rooms;

/// <summary>
/// A locked, one-way gate between rooms. Blocks movement while GatedRoom
/// (the room being left) is uncleared; unlocks once it clears. Once the
/// player actually arrives in DestinationRoom (the room being entered),
/// this door permanently collapses — sealing the way back — which is what
/// turns a branching room graph into a forward-only dungeon: every branch
/// stays open until taken, and taking one seals it behind you.
///
/// Polls IsCleared/IsRevealed in _PhysicsProcess rather than subscribing to
/// a signal — see Room.cs's doc comment for why cross-object signal
/// subscriptions are unsafe here. A Door with no GatedRoomPath set starts
/// open (e.g. a doorway back into an already-cleared room).
/// </summary>
public partial class Door : StaticBody2D
{
    [Export] public NodePath GatedRoomPath { get; set; } = new();
    [Export] public NodePath DestinationRoomPath { get; set; } = new();

    private CollisionShape2D? _collision;
    private Sprite2D? _sprite;
    private Room? _gatedRoom;
    private Room? _destinationRoom;
    private bool _unlocked;
    private bool _collapsed;

    public override void _Ready()
    {
        _collision = GetNodeOrNull<CollisionShape2D>("CollisionShape2D");
        _sprite = GetNodeOrNull<Sprite2D>("Sprite2D");
        _destinationRoom = GetNodeOrNull(DestinationRoomPath) as Room;

        if (GetNodeOrNull(GatedRoomPath) is Room room)
        {
            _gatedRoom = room;
            if (room.IsCleared)
                Unlock();
            else
                Lock();
        }
        else
        {
            Unlock();
        }
    }

    public override void _PhysicsProcess(double delta)
    {
        if (_collapsed) return;

        if (_unlocked && _destinationRoom is not null && GodotObject.IsInstanceValid(_destinationRoom) && _destinationRoom.IsRevealed)
        {
            Collapse();
            return;
        }

        if (_unlocked || _gatedRoom is null || !GodotObject.IsInstanceValid(_gatedRoom)) return;
        if (_gatedRoom.IsCleared) Unlock();
    }

    private void Lock()
    {
        if (_collision is not null) _collision.Disabled = false;
        if (_sprite is not null) _sprite.Modulate = new Color(0.55f, 0.08f, 0.08f, 1f);
    }

    private void Unlock()
    {
        _unlocked = true;
        if (_collision is not null) _collision.Disabled = true;
        if (_sprite is not null) _sprite.Modulate = new Color(0.35f, 0.32f, 0.28f, 1f);
    }

    /// <summary>Permanently sealed — the pathway back. Re-enables collision and never unlocks again.</summary>
    private void Collapse()
    {
        _collapsed = true;
        if (_collision is not null) _collision.Disabled = false;
        if (_sprite is not null) _sprite.Modulate = new Color(0.15f, 0.12f, 0.12f, 1f);
    }
}
