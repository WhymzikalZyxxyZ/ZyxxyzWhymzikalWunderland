using System.Collections.Generic;
using Godot;

namespace Salvation.Core;

/// <summary>
/// Pixel-art textures for the game's actors, built once at runtime via
/// PixelCanvas rather than hand-drawn. Each is a small grid (real per-pixel
/// shading and outline, not a smooth vector shape) baked at pixelScale so
/// it stays crisp — pair with CanvasItem.TextureFilter = Nearest wherever
/// these are assigned, or the blocky edges blur away.
/// </summary>
public static class CharacterSprites
{
    public static Texture2D BuildPaladin()
    {
        var canvas = new PixelCanvas(18, 20);

        // Cape trailing back-left, drawn first so the body overlaps it —
        // this one asymmetric shape is what stops the whole figure reading
        // as a centered blob.
        canvas.FillTriangle(new Vector2(2, 9), new Vector2(0, 19), new Vector2(8, 15), 'R');

        canvas.FillEllipse(10, 14, 5, 6, 'r');
        canvas.FillEllipse(12, 15, 3, 5, 'R');
        canvas.FillEllipse(10, 5, 3.3f, 3.3f, 'r');

        // Pauldrons — the right (sword-arm) shoulder built up larger than the left.
        canvas.FillEllipse(5, 10, 2, 1.5f, 'g');
        canvas.FillEllipse(14, 10, 2.3f, 1.7f, 'g');

        canvas.FillRect(9, 5, 11, 5, 's');
        canvas.FillRect(9, 8, 10, 16, 'g');
        canvas.FillRect(7, 11, 12, 12, 'g');
        canvas.FillRect(9, 8, 9, 9, 'G');
        canvas.AutoOutline('o');

        // Vivid, heroic — the Paladin should read clearly against the dark
        // world rather than blend into it, the way Link's green tunic pops
        // against duller dungeon palettes. Sinner/Pride stay desaturated
        // and grim by contrast.
        var palette = new Dictionary<char, Color>
        {
            ['r'] = new Color(0.16f, 0.32f, 0.6f),
            ['R'] = new Color(0.09f, 0.19f, 0.36f),
            ['s'] = new Color(0.08f, 0.06f, 0.05f),
            ['g'] = new Color(0.95f, 0.8f, 0.35f),
            ['G'] = new Color(0.72f, 0.58f, 0.22f),
            ['o'] = new Color(0.03f, 0.03f, 0.04f),
        };
        return canvas.Bake(palette, pixelScale: 2);
    }

    public static Texture2D BuildSinner()
    {
        var canvas = new PixelCanvas(16, 16);
        canvas.FillEllipse(8, 9, 5, 5, 'r');
        canvas.FillEllipse(10, 10, 3, 4, 'R');
        canvas.FillEllipse(6, 8, 2, 3, 'H');
        // Hood tilted off-center — a hunched, off-balance stance rather than a figure standing upright and centered.
        canvas.FillEllipse(6, 3, 3, 2.5f, 'r');
        canvas.FillRect(5, 4, 5, 4, 'e');
        canvas.FillRect(7, 4, 7, 4, 'e');
        // A thin, reaching arm — breaks the silhouette out of a pure oval.
        canvas.FillRect(12, 8, 13, 11, 'R');

        // Tattered hem: notches carved out of the bottom of the robe.
        canvas.FillTriangle(new Vector2(2, 13), new Vector2(4, 16), new Vector2(5, 12), '.');
        canvas.FillTriangle(new Vector2(6, 13), new Vector2(7, 16), new Vector2(9, 13), '.');
        canvas.FillTriangle(new Vector2(9, 12), new Vector2(11, 16), new Vector2(12, 13), '.');

        canvas.AutoOutline('o');

        var palette = new Dictionary<char, Color>
        {
            ['r'] = new Color(0.3f, 0.08f, 0.1f),
            ['R'] = new Color(0.18f, 0.04f, 0.06f),
            ['H'] = new Color(0.4f, 0.13f, 0.15f),
            ['e'] = new Color(0.85f, 0.35f, 0.1f),
            ['o'] = new Color(0.02f, 0.01f, 0.01f),
        };
        return canvas.Bake(palette, pixelScale: 2);
    }

    public static Texture2D BuildPrideBoss()
    {
        var canvas = new PixelCanvas(25, 24);

        // Robe train dragging to one side, drawn first so the body overlaps
        // it — the asymmetry that sells "a figure", not a purple oval.
        canvas.FillTriangle(new Vector2(3, 14), new Vector2(0, 23), new Vector2(11, 20), 'P');

        canvas.FillEllipse(12, 14, 9, 8, 'p');
        canvas.FillEllipse(15, 16, 6, 6, 'P');
        canvas.FillEllipse(8, 11, 3, 5, 'H');
        canvas.FillEllipse(12, 5, 5, 4, 'p');
        canvas.FillTriangle(new Vector2(5, 7), new Vector2(1, 0), new Vector2(9, 5), 'k');
        // Right horn built larger/more curved than the left — deliberately lopsided, not mirrored.
        canvas.FillTriangle(new Vector2(19, 7), new Vector2(24, -1), new Vector2(15, 5), 'k');
        canvas.FillRect(8, 3, 15, 4, 'g');
        canvas.FillRect(9, 5, 9, 5, 'e');
        canvas.FillRect(14, 5, 14, 5, 'e');

        // Chest gem — the mark of a boss, not just a bigger Sinner.
        canvas.FillRect(11, 12, 13, 14, 'g');

        // Tattered hem, larger shreds befitting a boss-scale robe.
        canvas.FillTriangle(new Vector2(3, 19), new Vector2(6, 22), new Vector2(8, 18), '.');
        canvas.FillTriangle(new Vector2(10, 19), new Vector2(12, 22), new Vector2(14, 19), '.');
        canvas.FillTriangle(new Vector2(16, 18), new Vector2(18, 22), new Vector2(21, 19), '.');

        canvas.AutoOutline('o');

        var palette = new Dictionary<char, Color>
        {
            ['p'] = new Color(0.32f, 0.14f, 0.42f),
            ['P'] = new Color(0.2f, 0.08f, 0.28f),
            ['H'] = new Color(0.42f, 0.2f, 0.52f),
            ['k'] = new Color(0.12f, 0.04f, 0.16f),
            ['g'] = new Color(0.78f, 0.63f, 0.24f),
            ['e'] = new Color(0.9f, 0.75f, 0.3f),
            ['o'] = new Color(0.03f, 0.01f, 0.04f),
        };
        return canvas.Bake(palette, pixelScale: 2);
    }

    /// <summary>Iron-bound gothic door. Native size is fixed; callers stretch via Sprite2D.Scale to fit the actual gap.</summary>
    public static Texture2D BuildDoor()
    {
        var canvas = new PixelCanvas(10, 18);
        canvas.FillRect(1, 0, 8, 17, 'w');
        canvas.FillRect(1, 0, 8, 2, 'a');
        canvas.FillRect(0, 4, 9, 5, 'b');
        canvas.FillRect(0, 12, 9, 13, 'b');
        canvas.FillRect(4, 8, 5, 9, 'k');
        canvas.AutoOutline('o');

        var palette = new Dictionary<char, Color>
        {
            ['w'] = new Color(0.24f, 0.18f, 0.13f),
            ['a'] = new Color(0.32f, 0.26f, 0.16f),
            ['b'] = new Color(0.12f, 0.11f, 0.11f),
            ['k'] = new Color(0.35f, 0.3f, 0.15f),
            ['o'] = new Color(0.03f, 0.03f, 0.03f),
        };
        return canvas.Bake(palette, pixelScale: 2);
    }
}
