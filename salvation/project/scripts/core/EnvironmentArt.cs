using System.Collections.Generic;
using Godot;

namespace Salvation.Core;

/// <summary>
/// Small, seamlessly-tileable pixel-art textures for floors and walls,
/// parametrized by a base color so a room's existing FloorColor/WallColor
/// (already varies per room type — boss rooms run redder) still drives the
/// palette. Pair with CanvasItem.TextureRepeat = Enabled and a region_rect
/// covering the target area to tile across an arbitrarily large room.
/// </summary>
public static class EnvironmentArt
{
    /// <summary>
    /// Shifts a color by a flat amount per channel rather than a percentage
    /// (Color.Darkened/Lightened) — floor/wall base colors here are already
    /// near-black, so a 40-60% multiplicative darken barely moves the
    /// number (0.09 -> 0.054) and reads as a flat, textureless blur. A flat
    /// shift stays visible no matter how dark the base color is.
    /// </summary>
    private static Color Shift(Color c, float amount) => new(
        Mathf.Clamp(c.R + amount, 0f, 1f),
        Mathf.Clamp(c.G + amount, 0f, 1f),
        Mathf.Clamp(c.B + amount, 0f, 1f),
        c.A);

    /// <summary>Four flagstones per tile with mortar seams, corner grain, and a couple of worn/cracked pixels.</summary>
    public static Texture2D BuildFloorTile(Color baseColor)
    {
        var canvas = new PixelCanvas(16, 16);
        canvas.FillRect(0, 0, 15, 15, 'f');

        // Mortar seams — thickened to 2px so they read clearly at nearest-filter scale.
        for (int i = 0; i < 16; i++)
        {
            canvas.Set(i, 0, 'm');
            canvas.Set(i, 1, 'm');
            canvas.Set(i, 8, 'm');
            canvas.Set(i, 9, 'm');
            canvas.Set(0, i, 'm');
            canvas.Set(1, i, 'm');
            canvas.Set(8, i, 'm');
            canvas.Set(9, i, 'm');
        }

        // Grain scattered across each flagstone quadrant — worn low spots and dust-catch highlights.
        canvas.Set(4, 4, 'c');
        canvas.Set(5, 4, 'c');
        canvas.Set(3, 12, 'c');
        canvas.Set(13, 4, 'c');
        canvas.Set(12, 13, 'c');
        canvas.Set(13, 12, 'c');
        canvas.Set(3, 3, 'h');
        canvas.Set(12, 4, 'h');
        canvas.Set(4, 13, 'h');
        canvas.Set(13, 13, 'h');

        var palette = new Dictionary<char, Color>
        {
            ['f'] = baseColor,
            ['m'] = Shift(baseColor, -0.055f),
            ['c'] = Shift(baseColor, -0.09f),
            ['h'] = Shift(baseColor, 0.06f),
        };
        return canvas.Bake(palette, pixelScale: 3);
    }

    /// <summary>Running-bond brick coursing (offset joints between rows), mortar-lined.</summary>
    public static Texture2D BuildWallTile(Color baseColor)
    {
        var canvas = new PixelCanvas(16, 8);
        canvas.FillRect(0, 0, 15, 7, 'b');

        // Horizontal mortar course splitting the two brick rows.
        for (int x = 0; x < 16; x++) canvas.Set(x, 3, 'm');
        // Row 1 (y 0-2): a single vertical joint at x=7.
        for (int y = 0; y < 3; y++) canvas.Set(7, y, 'm');
        // Row 2 (y 4-7): joints at x=3 and x=11 — offset by half a brick from row 1 (running bond).
        for (int y = 4; y < 8; y++)
        {
            canvas.Set(3, y, 'm');
            canvas.Set(11, y, 'm');
        }

        canvas.Set(2, 1, 'h');
        canvas.Set(10, 5, 'h');
        canvas.Set(13, 2, 'c');
        canvas.Set(5, 6, 'c');

        var palette = new Dictionary<char, Color>
        {
            ['b'] = baseColor,
            ['m'] = Shift(baseColor, -0.08f),
            ['h'] = Shift(baseColor, 0.07f),
            ['c'] = Shift(baseColor, -0.05f),
        };
        return canvas.Bake(palette, pixelScale: 3);
    }

    /// <summary>A single jagged rubble/boulder obstacle. Callers scale it to whatever collision radius they used.</summary>
    public static Texture2D BuildRock(Color baseColor)
    {
        var canvas = new PixelCanvas(12, 12);
        canvas.FillEllipse(6, 7, 5, 4, 'r');
        canvas.FillEllipse(8, 8, 3, 3, 'R');
        canvas.FillEllipse(4, 5, 2, 1.5f, 'h');
        canvas.AutoOutline('o');

        var palette = new Dictionary<char, Color>
        {
            ['r'] = baseColor,
            ['R'] = Shift(baseColor, -0.08f),
            ['h'] = Shift(baseColor, 0.1f),
            ['o'] = new Color(0.02f, 0.02f, 0.02f),
        };
        return canvas.Bake(palette, pixelScale: 3);
    }

    /// <summary>Configures a Sprite2D to tile the given texture across a rectangular area, crisp edges preserved.</summary>
    public static Sprite2D BuildTiledSprite(Texture2D tile, Vector2 topLeft, Vector2 size)
    {
        var sprite = new Sprite2D
        {
            Texture = tile,
            TextureFilter = CanvasItem.TextureFilterEnum.Nearest,
            TextureRepeat = CanvasItem.TextureRepeatEnum.Enabled,
            RegionEnabled = true,
            RegionRect = new Rect2(Vector2.Zero, size),
            Centered = false,
            Position = topLeft,
        };
        return sprite;
    }
}
