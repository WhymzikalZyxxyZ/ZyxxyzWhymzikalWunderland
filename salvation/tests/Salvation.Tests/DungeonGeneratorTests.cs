using System;
using System.Collections.Generic;
using Godot;
using Salvation.Rooms;
using Xunit;

namespace Salvation.Tests;

/// <summary>
/// Exercises the pure graph-building logic (BuildLPath/NormalizeEdge/
/// ComputeDistances) directly, without ever instantiating a Room or Door —
/// these three methods only touch Vector2I (a struct) and plain
/// collections, so they run under a normal dotnet test host with no Godot
/// engine process involved at all.
/// </summary>
public class DungeonGeneratorTests
{
    [Fact]
    public void BuildLPath_StartsAtStartAndEndsAtBoss()
    {
        var start = new Vector2I(0, 1);
        var boss = new Vector2I(4, 1);

        List<Vector2I> path = DungeonGenerator.BuildLPath(start, new Vector2I(2, 0), boss);

        Assert.Equal(start, path[0]);
        Assert.Equal(boss, path[^1]);
    }

    [Fact]
    public void BuildLPath_NeverTakesADiagonalOrZeroStep()
    {
        List<Vector2I> path = DungeonGenerator.BuildLPath(new Vector2I(0, 1), new Vector2I(3, 2), new Vector2I(4, 1));

        for (int i = 0; i < path.Count - 1; i++)
        {
            Vector2I delta = path[i + 1] - path[i];
            int manhattan = Math.Abs(delta.X) + Math.Abs(delta.Y);
            Assert.Equal(1, manhattan);
        }
    }

    [Fact]
    public void NormalizeEdge_IsOrderIndependent()
    {
        var a = new Vector2I(1, 2);
        var b = new Vector2I(3, 4);

        Assert.Equal(DungeonGenerator.NormalizeEdge(a, b), DungeonGenerator.NormalizeEdge(b, a));
    }

    [Fact]
    public void ComputeDistances_StartIsZero_AndGrowsByOnePerHop()
    {
        var cells = new HashSet<Vector2I> { new(0, 0), new(1, 0), new(2, 0) };
        var edges = new HashSet<(Vector2I, Vector2I)>
        {
            (new Vector2I(0, 0), new Vector2I(1, 0)),
            (new Vector2I(1, 0), new Vector2I(2, 0)),
        };

        Dictionary<Vector2I, int> distances = DungeonGenerator.ComputeDistances(new Vector2I(0, 0), cells, edges);

        Assert.Equal(0, distances[new Vector2I(0, 0)]);
        Assert.Equal(1, distances[new Vector2I(1, 0)]);
        Assert.Equal(2, distances[new Vector2I(2, 0)]);
    }

    [Fact]
    public void ThreeRowFan_AlwaysConvergesOnTheBossWithExactlyThreeEdges()
    {
        // Reproduces exactly what DungeonGenerator._Ready() builds (three
        // paths, one per row, sharing an early trunk before forking) and
        // checks the property players actually experience: the boss room
        // ends up with one door per route, for every possible branch column.
        var start = new Vector2I(0, 1);
        var boss = new Vector2I(4, 1);

        for (int branchColumn = 1; branchColumn <= 3; branchColumn++)
        {
            var edges = new HashSet<(Vector2I, Vector2I)>();

            for (int row = 0; row < 3; row++)
            {
                List<Vector2I> path = DungeonGenerator.BuildLPath(start, new Vector2I(branchColumn, row), boss);
                for (int i = 0; i < path.Count - 1; i++)
                    edges.Add(DungeonGenerator.NormalizeEdge(path[i], path[i + 1]));
            }

            int bossEdgeCount = 0;
            foreach ((Vector2I a, Vector2I b) in edges)
                if (a == boss || b == boss) bossEdgeCount++;

            Assert.Equal(3, bossEdgeCount);
        }
    }
}
