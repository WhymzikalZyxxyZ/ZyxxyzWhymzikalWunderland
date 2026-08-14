using System;
using System.Collections.Generic;
using Godot;
using Salvation.Core;
using Salvation.Enemies;
using Salvation.Player;
using Salvation.UI;

namespace Salvation.Rooms;

/// <summary>
/// Builds a branching, one-way dungeon on a small grid: a start room, a
/// boss room GridWidth-1 columns away, and three routes (top/middle/bottom
/// row) between them that share an early trunk before forking at a
/// randomized column — so the boss room ends up with a door for every
/// route actually built, and each fork room can have doors on any of its
/// four sides depending on which routes pass through it. Door.cs seals the
/// entry door behind the player once they arrive in a room, so a chosen
/// branch can't be un-chosen.
///
/// Room population order matters: Room._Ready() (which builds walls from
/// its door flags and scans its children for enemies) fires the instant a
/// Room enters the SceneTree. Everything a room needs — door flags,
/// enemies, the player — has to be attached to it *before* AddChild(room),
/// not after, or Room._Ready() runs against an empty/half-configured room.
/// </summary>
public partial class DungeonGenerator : Node2D
{
    [Export] public PackedScene PaladinScene = null!;
    [Export] public PackedScene SinnerScene = null!;
    [Export] public PackedScene PrideBossScene = null!;
    [Export] public NodePath BossHealthBarPath { get; set; } = new();
    [Export] public NodePath PlayerHudPath { get; set; } = new();

    [Export] public int GridWidth { get; set; } = 5;
    [Export] public int GridHeight { get; set; } = 3;
    [Export] public Vector2 RoomSize { get; set; } = new(480, 420);
    [Export] public Vector2 RoomSpacing { get; set; } = new(600, 520);
    [Export] public float DoorGapSize { get; set; } = 90f;
    /// <summary>0 = random each run.</summary>
    [Export] public int Seed { get; set; }

    public override void _Ready()
    {
        var rng = new RandomNumberGenerator();
        if (Seed != 0) rng.Seed = (ulong)Seed;
        else rng.Randomize();

        int midRow = GridHeight / 2;
        var start = new Vector2I(0, midRow);
        var boss = new Vector2I(GridWidth - 1, midRow);
        int branchColumn = Math.Clamp(rng.RandiRange(1, GridWidth - 2), 1, GridWidth - 2);

        var cells = new HashSet<Vector2I> { start, boss };
        var edges = new HashSet<(Vector2I, Vector2I)>();

        for (int row = 0; row < GridHeight; row++)
        {
            List<Vector2I> path = BuildLPath(start, new Vector2I(branchColumn, row), boss);
            foreach (Vector2I cell in path) cells.Add(cell);
            for (int i = 0; i < path.Count - 1; i++)
                edges.Add(NormalizeEdge(path[i], path[i + 1]));
        }

        Dictionary<Vector2I, int> distances = ComputeDistances(start, cells, edges);

        var rooms = new Dictionary<Vector2I, Room>();
        foreach (Vector2I cell in cells)
            rooms[cell] = BuildRoom(cell, cell == start, cell == boss, rng);

        foreach ((Vector2I, Vector2I) edge in edges)
            ApplyDoorFlags(rooms, edge, distances);

        PlayerController? paladin = null;
        var bossEnemies = new List<Enemy>();
        foreach ((Vector2I cell, Room room) in rooms)
        {
            if (cell == start)
                paladin = SpawnPlayer(room);
            else if (cell == boss)
                bossEnemies.Add(SpawnBoss(room));
            else
                SpawnEnemies(room, rng);
        }

        foreach (Room room in rooms.Values)
            AddChild(room);

        foreach ((Vector2I, Vector2I) edge in edges)
            BuildDoor(rooms, edge, distances);

        if (paladin is not null)
        {
            if (GetNodeOrNull(PlayerHudPath) is PlayerHud hud) hud.BindPlayer(paladin);
        }
        if (bossEnemies.Count > 0 && GetNodeOrNull(BossHealthBarPath) is BossHealthBar bar)
            bar.BindBoss(bossEnemies[0]);
    }

    /// <summary>internal (not private) so Salvation.Tests can exercise the pure graph-building logic without touching the SceneTree.</summary>
    internal static List<Vector2I> BuildLPath(Vector2I start, Vector2I waypoint, Vector2I boss)
    {
        var path = new List<Vector2I> { start };
        Vector2I cur = start;
        StepAxis(ref cur, waypoint.X, horizontal: true, path);
        StepAxis(ref cur, waypoint.Y, horizontal: false, path);
        StepAxis(ref cur, boss.X, horizontal: true, path);
        StepAxis(ref cur, boss.Y, horizontal: false, path);
        return path;
    }

    private static void StepAxis(ref Vector2I cur, int target, bool horizontal, List<Vector2I> path)
    {
        int current = horizontal ? cur.X : cur.Y;
        int step = Math.Sign(target - current);
        while (current != target)
        {
            current += step;
            cur = horizontal ? new Vector2I(current, cur.Y) : new Vector2I(cur.X, current);
            path.Add(cur);
        }
    }

    internal static (Vector2I, Vector2I) NormalizeEdge(Vector2I a, Vector2I b) =>
        (a.X < b.X || (a.X == b.X && a.Y < b.Y)) ? (a, b) : (b, a);

    internal static Dictionary<Vector2I, int> ComputeDistances(
        Vector2I start, HashSet<Vector2I> cells, HashSet<(Vector2I, Vector2I)> edges)
    {
        var adjacency = new Dictionary<Vector2I, List<Vector2I>>();
        foreach (Vector2I cell in cells) adjacency[cell] = new List<Vector2I>();
        foreach ((Vector2I a, Vector2I b) in edges)
        {
            adjacency[a].Add(b);
            adjacency[b].Add(a);
        }

        var distances = new Dictionary<Vector2I, int> { [start] = 0 };
        var queue = new Queue<Vector2I>();
        queue.Enqueue(start);
        while (queue.Count > 0)
        {
            Vector2I current = queue.Dequeue();
            foreach (Vector2I neighbor in adjacency[current])
            {
                if (distances.ContainsKey(neighbor)) continue;
                distances[neighbor] = distances[current] + 1;
                queue.Enqueue(neighbor);
            }
        }
        return distances;
    }

    private Vector2 CellWorldPosition(Vector2I cell) => new(cell.X * RoomSpacing.X, cell.Y * RoomSpacing.Y);

    private Room BuildRoom(Vector2I cell, bool isStart, bool isBoss, RandomNumberGenerator rng)
    {
        var room = new Room
        {
            Name = $"Room_{cell.X}_{cell.Y}",
            Position = CellWorldPosition(cell),
            Bounds = new Rect2(-RoomSize.X / 2f, -RoomSize.Y / 2f, RoomSize.X, RoomSize.Y),
            StartsHidden = !isStart,
            DoorGapSize = DoorGapSize,
            FloorColor = isBoss ? new Color(0.16f, 0.05f, 0.07f) : new Color(0.09f, 0.08f, 0.1f),
            GoreSeed = (int)rng.Randi(),
        };
        return room;
    }

    private static void ApplyDoorFlags(Dictionary<Vector2I, Room> rooms, (Vector2I, Vector2I) edge, Dictionary<Vector2I, int> distances)
    {
        (Vector2I a, Vector2I b) = edge;
        Vector2I source = distances[a] <= distances[b] ? a : b;
        Vector2I target = source.Equals(a) ? b : a;
        Vector2I delta = target - source;

        Room sourceRoom = rooms[source];
        Room targetRoom = rooms[target];

        if (delta.X != 0)
        {
            if (delta.X > 0) { sourceRoom.HasRightDoor = true; targetRoom.HasLeftDoor = true; }
            else { sourceRoom.HasLeftDoor = true; targetRoom.HasRightDoor = true; }
        }
        else
        {
            if (delta.Y > 0) { sourceRoom.HasBottomDoor = true; targetRoom.HasTopDoor = true; }
            else { sourceRoom.HasTopDoor = true; targetRoom.HasBottomDoor = true; }
        }
    }

    private void BuildDoor(Dictionary<Vector2I, Room> rooms, (Vector2I, Vector2I) edge, Dictionary<Vector2I, int> distances)
    {
        (Vector2I a, Vector2I b) = edge;
        Vector2I source = distances[a] <= distances[b] ? a : b;
        Vector2I target = source.Equals(a) ? b : a;
        Vector2I delta = target - source;

        Room sourceRoom = rooms[source];
        Room targetRoom = rooms[target];
        bool horizontal = delta.X != 0;

        Vector2 gapSize = horizontal
            ? new Vector2(RoomSpacing.X - RoomSize.X, DoorGapSize)
            : new Vector2(DoorGapSize, RoomSpacing.Y - RoomSize.Y);

        var door = new Door
        {
            Position = (sourceRoom.Position + targetRoom.Position) / 2f,
            GatedRoomPath = new NodePath("../" + sourceRoom.Name),
            DestinationRoomPath = new NodePath("../" + targetRoom.Name),
            // Same environment layer as Room's walls (see Room.cs's WallZIndex
            // doc comment) — characters must always draw in front of it.
            ZIndex = -1,
        };

        // The door's pixel-art texture is drawn tall-and-narrow (fits a
        // horizontal room-to-room connection natively); rotate it 90° for
        // vertical connections instead of drawing a second variant.
        Texture2D doorTexture = CharacterSprites.BuildDoor();
        Vector2 textureSize = doorTexture.GetSize();
        var sprite = new Sprite2D
        {
            Name = "Sprite2D",
            Texture = doorTexture,
            TextureFilter = CanvasItem.TextureFilterEnum.Nearest,
        };
        if (horizontal)
        {
            sprite.Scale = new Vector2(gapSize.X / textureSize.X, gapSize.Y / textureSize.Y);
        }
        else
        {
            sprite.RotationDegrees = 90f;
            sprite.Scale = new Vector2(gapSize.Y / textureSize.X, gapSize.X / textureSize.Y);
        }
        door.AddChild(sprite);

        var collision = new CollisionShape2D { Name = "CollisionShape2D", Shape = new RectangleShape2D { Size = gapSize } };
        door.AddChild(collision);

        AddChild(door);
    }

    private PlayerController SpawnPlayer(Room room)
    {
        var paladin = (PlayerController)PaladinScene.Instantiate();
        paladin.Position = room.Bounds.GetCenter();
        room.AddChild(paladin);
        return paladin;
    }

    private Enemy SpawnBoss(Room room)
    {
        var boss = (Enemy)PrideBossScene.Instantiate();
        boss.Position = room.Bounds.GetCenter();
        room.AddChild(boss);
        return boss;
    }

    private void SpawnEnemies(Room room, RandomNumberGenerator rng)
    {
        int count = rng.RandiRange(1, 2);
        for (int i = 0; i < count; i++)
        {
            var sinner = (Enemy)SinnerScene.Instantiate();
            sinner.Position = new Vector2(
                rng.RandfRange(room.Bounds.Position.X + 60f, room.Bounds.End.X - 60f),
                rng.RandfRange(room.Bounds.Position.Y + 60f, room.Bounds.End.Y - 60f));
            room.AddChild(sinner);
        }
    }
}
