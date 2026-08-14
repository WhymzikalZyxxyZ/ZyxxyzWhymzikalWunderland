using Salvation.Core;
using Xunit;

namespace Salvation.Tests;

/// <summary>
/// Only exercises the grid-logic side of PixelCanvas (Set/Get/Fill*/AutoOutline)
/// — never Bake(), which constructs actual Godot engine resources (Image,
/// ImageTexture) and needs a running Godot process. The pattern-drawing
/// logic itself is plain char[,] manipulation and runs fine under a normal
/// dotnet test host.
/// </summary>
public class PixelCanvasTests
{
    [Fact]
    public void NewCanvas_IsFullyTransparent()
    {
        var canvas = new PixelCanvas(4, 4);

        Assert.Equal('.', canvas.Get(0, 0));
        Assert.Equal('.', canvas.Get(3, 3));
    }

    [Fact]
    public void Set_OutOfBounds_IsIgnoredNotThrown()
    {
        var canvas = new PixelCanvas(4, 4);

        canvas.Set(-1, -1, 'x');
        canvas.Set(100, 100, 'x');

        Assert.Equal('.', canvas.Get(0, 0));
    }

    [Fact]
    public void Get_OutOfBounds_ReturnsTransparentRatherThanThrowing()
    {
        var canvas = new PixelCanvas(4, 4);

        Assert.Equal('.', canvas.Get(-5, 2));
        Assert.Equal('.', canvas.Get(2, 999));
    }

    [Fact]
    public void FillRect_FillsInclusiveRangeOnly()
    {
        var canvas = new PixelCanvas(4, 4);

        canvas.FillRect(1, 1, 2, 2, 'a');

        Assert.Equal('a', canvas.Get(1, 1));
        Assert.Equal('a', canvas.Get(2, 2));
        Assert.Equal('.', canvas.Get(0, 0));
        Assert.Equal('.', canvas.Get(3, 3));
    }

    [Fact]
    public void FillEllipse_FillsCenterButNotFarCorners()
    {
        var canvas = new PixelCanvas(10, 10);

        canvas.FillEllipse(5, 5, 3, 3, 'e');

        Assert.Equal('e', canvas.Get(5, 5));
        Assert.Equal('.', canvas.Get(0, 0));
    }

    [Fact]
    public void AutoOutline_OnlyMarksTransparentPixelsTouchingAFilledOne()
    {
        var canvas = new PixelCanvas(5, 5);
        canvas.Set(2, 2, 'f');

        canvas.AutoOutline('o');

        Assert.Equal('o', canvas.Get(1, 2));
        Assert.Equal('o', canvas.Get(3, 2));
        Assert.Equal('f', canvas.Get(2, 2));
        Assert.Equal('.', canvas.Get(0, 0));
    }

    [Fact]
    public void Set_CanCarveANotchBackToTransparent()
    {
        // This is exactly how CharacterSprites carves tattered robe hems:
        // fill a shape, then Set specific pixels back to '.'.
        var canvas = new PixelCanvas(5, 5);
        canvas.FillRect(0, 0, 4, 4, 'r');

        canvas.Set(2, 2, '.');

        Assert.Equal('.', canvas.Get(2, 2));
        Assert.Equal('r', canvas.Get(0, 0));
    }
}
