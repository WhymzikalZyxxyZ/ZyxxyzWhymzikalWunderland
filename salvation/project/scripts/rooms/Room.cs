using System.Collections.Generic;
using Godot;
using Salvation.Core;
using Salvation.Enemies;
using Salvation.Player;

namespace Salvation.Rooms;

/// <summary>
/// A single room: generates its own floor, boundary walls (with gaps on
/// whichever sides have doors), and starts hidden until a player first
/// steps inside — a plain AABB check against PlayerController.ActivePlayers,
/// not a physics query. Tracks its enemies in a list and polls
/// GodotObject.IsInstanceValid each frame rather than subscribing to their
/// TreeExited signal: any cross-object Godot signal subscription reliably
/// corrupted the CLR under this Godot 4.7.1 mono + .NET host (see
/// BossHealthBar.cs / PrideBoss.cs for the fuller writeup) — the same
/// reasoning applies here and in Door.cs, which polls IsCleared/IsRevealed
/// instead of subscribing to signals.
/// </summary>
public partial class Room : Node2D
{
    /// <summary>Room rectangle in this node's local space. Drives the floor, walls, and reveal check.</summary>
    [Export] public Rect2 Bounds { get; set; } = new(-200, -200, 400, 400);

    [Export] public bool StartsHidden { get; set; }
    [Export] public float WallThickness { get; set; } = 20f;
    [Export] public Color FloorColor { get; set; } = new(0.09f, 0.08f, 0.1f);
    [Export] public Color WallColor { get; set; } = new(0.05f, 0.045f, 0.05f);
    [Export] public int GoreSeed { get; set; }

    [Export] public bool HasLeftDoor { get; set; }
    [Export] public bool HasRightDoor { get; set; }
    [Export] public bool HasTopDoor { get; set; }
    [Export] public bool HasBottomDoor { get; set; }
    [Export] public float DoorGapCenterY { get; set; }
    [Export] public float DoorGapCenterX { get; set; }
    [Export] public float DoorGapSize { get; set; } = 90f;

    public bool IsCleared { get; private set; }
    public bool IsRevealed { get; private set; }

    private readonly List<Enemy> _enemies = new();
    private Camera2D _camera = null!;

    public override void _Ready()
    {
        BuildFloor();
        BuildWalls();
        BuildObstacles();
        _camera = BuildCamera();

        foreach (Enemy enemy in FindEnemies(this))
            _enemies.Add(enemy);

        if (_enemies.Count == 0)
            IsCleared = true;

        IsRevealed = !StartsHidden;
        Visible = IsRevealed;
        if (IsRevealed) _camera.MakeCurrent();
    }

    public override void _PhysicsProcess(double delta)
    {
        if (!IsCleared)
        {
            _enemies.RemoveAll(e => !GodotObject.IsInstanceValid(e));
            if (_enemies.Count == 0)
                IsCleared = true;
        }

        if (!IsRevealed)
        {
            foreach (PlayerController player in PlayerController.ActivePlayers)
            {
                if (!GodotObject.IsInstanceValid(player)) continue;
                if (!Bounds.HasPoint(ToLocal(player.GlobalPosition))) continue;

                IsRevealed = true;
                Visible = true;
                _camera.MakeCurrent();
                break;
            }
        }
    }

    /// <summary>Isaac-style locked room camera: fixed on this room's center, swapped in via MakeCurrent the moment the room is revealed.</summary>
    private Camera2D BuildCamera()
    {
        var camera = new Camera2D
        {
            Position = Bounds.GetCenter(),
            Zoom = new Vector2(0.85f, 0.85f),
        };
        AddChild(camera);
        return camera;
    }

    private static IEnumerable<Enemy> FindEnemies(Node root)
    {
        foreach (Node child in root.GetChildren())
        {
            if (child is Enemy enemy) yield return enemy;
            foreach (Enemy nested in FindEnemies(child)) yield return nested;
        }
    }

    /// <summary>
    /// Environment layer, always behind actors. DungeonGenerator attaches
    /// enemies/the player to a Room BEFORE it enters the tree (Room._Ready()
    /// needs them present to count enemies correctly), which means they're
    /// EARLIER children than anything built here — and in Godot 2D, later
    /// siblings draw on top of earlier ones by default. Left alone, the
    /// full-room floor tile and the walls painted right over every
    /// character. Explicit z_index sidesteps child order entirely instead
    /// of relying on it.
    /// </summary>
    private const int FloorZIndex = -2;
    private const int WallZIndex = -1;

    private void BuildFloor()
    {
        Texture2D tile = EnvironmentArt.BuildFloorTile(FloorColor);
        Sprite2D floor = EnvironmentArt.BuildTiledSprite(tile, Bounds.Position, Bounds.Size);
        floor.ZIndex = FloorZIndex;
        AddChild(floor);

        // Decrepit ambiance: a handful of dark stains scattered across the
        // floor, seeded so the same room always looks the same across a
        // single generated run but varies room-to-room and dungeon-to-dungeon.
        var rng = new RandomNumberGenerator();
        rng.Seed = (ulong)GoreSeed;
        int stainCount = rng.RandiRange(3, 6);
        for (int i = 0; i < stainCount; i++)
        {
            Vector2 center = new(
                rng.RandfRange(Bounds.Position.X + 40, Bounds.End.X - 40),
                rng.RandfRange(Bounds.Position.Y + 40, Bounds.End.Y - 40));
            float radius = rng.RandfRange(14f, 34f);
            Polygon2D stain = BuildStain(center, radius, rng);
            stain.ZIndex = FloorZIndex;
            AddChild(stain);
        }
    }

    private static Polygon2D BuildStain(Vector2 center, float radius, RandomNumberGenerator rng)
    {
        const int points = 9;
        var shape = new Vector2[points];
        for (int i = 0; i < points; i++)
        {
            float angle = Mathf.Tau * i / points;
            float wobble = rng.RandfRange(0.6f, 1.15f);
            shape[i] = center + new Vector2(Mathf.Cos(angle), Mathf.Sin(angle)) * radius * wobble;
        }

        return new Polygon2D
        {
            Polygon = shape,
            Color = new Color(0.28f, 0.03f, 0.03f, rng.RandfRange(0.25f, 0.45f)),
        };
    }

    private void BuildWalls()
    {
        float left = Bounds.Position.X;
        float right = Bounds.End.X;
        float top = Bounds.Position.Y;
        float bottom = Bounds.End.Y;

        BuildHorizontalWall(top, left, right, HasTopDoor);
        BuildHorizontalWall(bottom, left, right, HasBottomDoor);
        BuildVerticalWall(left, top, bottom, HasLeftDoor);
        BuildVerticalWall(right, top, bottom, HasRightDoor);
    }

    private void BuildHorizontalWall(float y, float left, float right, bool hasGap)
    {
        bool isTop = y == Bounds.Position.Y;
        float wallY = isTop ? y - WallThickness / 2f : y + WallThickness / 2f;

        if (!hasGap)
        {
            AddWall(new Vector2((left + right) / 2f, wallY), new Vector2(right - left, WallThickness));
            return;
        }

        float gapLeft = DoorGapCenterX - DoorGapSize / 2f;
        float gapRight = DoorGapCenterX + DoorGapSize / 2f;

        if (gapLeft > left)
            AddWall(new Vector2((left + gapLeft) / 2f, wallY), new Vector2(gapLeft - left, WallThickness));
        if (gapRight < right)
            AddWall(new Vector2((gapRight + right) / 2f, wallY), new Vector2(right - gapRight, WallThickness));
    }

    private void BuildVerticalWall(float x, float top, float bottom, bool hasGap)
    {
        if (!hasGap)
        {
            AddWall(new Vector2(x, (top + bottom) / 2f), new Vector2(WallThickness, bottom - top));
            return;
        }

        float gapTop = DoorGapCenterY - DoorGapSize / 2f;
        float gapBottom = DoorGapCenterY + DoorGapSize / 2f;

        if (gapTop > top)
            AddWall(new Vector2(x, (top + gapTop) / 2f), new Vector2(WallThickness, gapTop - top));
        if (gapBottom < bottom)
            AddWall(new Vector2(x, (gapBottom + bottom) / 2f), new Vector2(WallThickness, bottom - gapBottom));
    }

    private void AddWall(Vector2 center, Vector2 size)
    {
        var body = new StaticBody2D { Position = center, ZIndex = WallZIndex };
        var collision = new CollisionShape2D { Shape = new RectangleShape2D { Size = size } };
        body.AddChild(collision);

        Texture2D tile = EnvironmentArt.BuildWallTile(WallColor);
        body.AddChild(EnvironmentArt.BuildTiledSprite(tile, -size / 2f, size));

        AddChild(body);
    }

    /// <summary>
    /// Scatters a handful of rock obstacles, but never one that would cut
    /// the room center off from a door: each candidate is checked with a
    /// flood-fill over a coarse walkability grid before it's kept, so it's
    /// not possible to end up boxed in — verified by construction, not just
    /// spaced out and hoped for.
    /// </summary>
    private void BuildObstacles()
    {
        var rng = new RandomNumberGenerator();
        rng.Seed = (ulong)(GoreSeed + 7919);

        var doorTargets = new List<Vector2>();
        const float doorMargin = 34f;
        if (HasLeftDoor) doorTargets.Add(new Vector2(Bounds.Position.X + doorMargin, DoorGapCenterY));
        if (HasRightDoor) doorTargets.Add(new Vector2(Bounds.End.X - doorMargin, DoorGapCenterY));
        if (HasTopDoor) doorTargets.Add(new Vector2(DoorGapCenterX, Bounds.Position.Y + doorMargin));
        if (HasBottomDoor) doorTargets.Add(new Vector2(DoorGapCenterX, Bounds.End.Y - doorMargin));

        Vector2 center = Bounds.GetCenter();
        var accepted = new List<(Vector2 Pos, float Radius)>();

        int attempts = rng.RandiRange(2, 5);
        for (int i = 0; i < attempts; i++)
        {
            Vector2 candidate = new(
                rng.RandfRange(Bounds.Position.X + 50f, Bounds.End.X - 50f),
                rng.RandfRange(Bounds.Position.Y + 50f, Bounds.End.Y - 50f));
            float radius = rng.RandfRange(16f, 26f);

            if (candidate.DistanceTo(center) < 70f) continue;

            bool tooCloseToDoor = false;
            foreach (Vector2 target in doorTargets)
            {
                if (candidate.DistanceTo(target) < 60f) { tooCloseToDoor = true; break; }
            }
            if (tooCloseToDoor) continue;

            accepted.Add((candidate, radius));
            if (!IsFullyReachable(accepted, center, doorTargets))
                accepted.RemoveAt(accepted.Count - 1);
        }

        foreach ((Vector2 pos, float radius) in accepted)
            AddObstacle(pos, radius);
    }

    /// <summary>
    /// Coarse grid flood-fill from the room center; true only if every door
    /// target is still reachable. internal (not private) so Salvation.Tests
    /// can construct a bare Room (Bounds set, never added to the SceneTree)
    /// and verify this directly — it touches no Node-tree API.
    /// </summary>
    internal bool IsFullyReachable(List<(Vector2 Pos, float Radius)> obstacles, Vector2 start, List<Vector2> targets)
    {
        const float cellSize = 24f;
        const float playerClearance = 18f;
        int cols = Mathf.Max(1, Mathf.CeilToInt(Bounds.Size.X / cellSize));
        int rows = Mathf.Max(1, Mathf.CeilToInt(Bounds.Size.Y / cellSize));
        var blocked = new bool[cols, rows];

        Vector2I ToCell(Vector2 p) => new(
            Mathf.Clamp((int)((p.X - Bounds.Position.X) / cellSize), 0, cols - 1),
            Mathf.Clamp((int)((p.Y - Bounds.Position.Y) / cellSize), 0, rows - 1));

        for (int cx = 0; cx < cols; cx++)
        {
            for (int cy = 0; cy < rows; cy++)
            {
                Vector2 world = Bounds.Position + new Vector2((cx + 0.5f) * cellSize, (cy + 0.5f) * cellSize);
                foreach ((Vector2 pos, float radius) in obstacles)
                {
                    if (world.DistanceTo(pos) < radius + playerClearance)
                    {
                        blocked[cx, cy] = true;
                        break;
                    }
                }
            }
        }

        Vector2I startCell = ToCell(start);
        if (blocked[startCell.X, startCell.Y]) return false;

        var visited = new bool[cols, rows];
        var queue = new Queue<Vector2I>();
        queue.Enqueue(startCell);
        visited[startCell.X, startCell.Y] = true;
        Vector2I[] directions = { new(1, 0), new(-1, 0), new(0, 1), new(0, -1) };

        while (queue.Count > 0)
        {
            Vector2I current = queue.Dequeue();
            foreach (Vector2I dir in directions)
            {
                Vector2I next = current + dir;
                if (next.X < 0 || next.X >= cols || next.Y < 0 || next.Y >= rows) continue;
                if (visited[next.X, next.Y] || blocked[next.X, next.Y]) continue;
                visited[next.X, next.Y] = true;
                queue.Enqueue(next);
            }
        }

        foreach (Vector2 target in targets)
        {
            Vector2I targetCell = ToCell(target);
            if (!visited[targetCell.X, targetCell.Y]) return false;
        }

        return true;
    }

    private void AddObstacle(Vector2 position, float radius)
    {
        var body = new StaticBody2D { Position = position, ZIndex = WallZIndex };
        var collision = new CollisionShape2D { Shape = new CircleShape2D { Radius = radius } };
        body.AddChild(collision);

        Texture2D texture = EnvironmentArt.BuildRock(WallColor.Lightened(0.06f));
        Vector2 textureSize = texture.GetSize();
        var sprite = new Sprite2D
        {
            Texture = texture,
            TextureFilter = CanvasItem.TextureFilterEnum.Nearest,
            Scale = new Vector2(radius * 2f / textureSize.X, radius * 2f / textureSize.Y),
        };
        body.AddChild(sprite);

        AddChild(body);
    }
}
