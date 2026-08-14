using System.Collections.Generic;
using System.Text;
using Godot;

namespace Salvation.Core;

/// <summary>
/// A small pixel grid you draw shapes into (ellipses, rects, triangles),
/// then bake to a crisp, blocky Texture2D — actual per-pixel control
/// rather than smooth vector Polygon2D fills. '.' is always transparent.
/// </summary>
public class PixelCanvas
{
    private readonly char[,] _grid;
    public int Width { get; }
    public int Height { get; }

    public PixelCanvas(int width, int height)
    {
        Width = width;
        Height = height;
        _grid = new char[width, height];
        for (int x = 0; x < width; x++)
            for (int y = 0; y < height; y++)
                _grid[x, y] = '.';
    }

    public void Set(int x, int y, char key)
    {
        if (x < 0 || x >= Width || y < 0 || y >= Height) return;
        _grid[x, y] = key;
    }

    public char Get(int x, int y) => (x < 0 || x >= Width || y < 0 || y >= Height) ? '.' : _grid[x, y];

    public void FillEllipse(float cx, float cy, float rx, float ry, char key)
    {
        for (int y = 0; y < Height; y++)
        {
            for (int x = 0; x < Width; x++)
            {
                float nx = (x + 0.5f - cx) / rx;
                float ny = (y + 0.5f - cy) / ry;
                if (nx * nx + ny * ny <= 1f) Set(x, y, key);
            }
        }
    }

    public void FillRect(int x0, int y0, int x1, int y1, char key)
    {
        for (int y = y0; y <= y1; y++)
            for (int x = x0; x <= x1; x++)
                Set(x, y, key);
    }

    public void FillTriangle(Vector2 a, Vector2 b, Vector2 c, char key)
    {
        int minX = Mathf.FloorToInt(Mathf.Min(a.X, Mathf.Min(b.X, c.X)));
        int maxX = Mathf.CeilToInt(Mathf.Max(a.X, Mathf.Max(b.X, c.X)));
        int minY = Mathf.FloorToInt(Mathf.Min(a.Y, Mathf.Min(b.Y, c.Y)));
        int maxY = Mathf.CeilToInt(Mathf.Max(a.Y, Mathf.Max(b.Y, c.Y)));

        for (int y = minY; y <= maxY; y++)
        {
            for (int x = minX; x <= maxX; x++)
            {
                var p = new Vector2(x + 0.5f, y + 0.5f);
                if (PointInTriangle(p, a, b, c)) Set(x, y, key);
            }
        }
    }

    private static bool PointInTriangle(Vector2 p, Vector2 a, Vector2 b, Vector2 c)
    {
        float d1 = Cross(p - a, b - a);
        float d2 = Cross(p - b, c - b);
        float d3 = Cross(p - c, a - c);
        bool hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
        bool hasPos = d1 > 0 || d2 > 0 || d3 > 0;
        return !(hasNeg && hasPos);
    }

    private static float Cross(Vector2 v1, Vector2 v2) => v1.X * v2.Y - v1.Y * v2.X;

    /// <summary>Turns every transparent pixel touching a filled one into the outline color — a clean silhouette border.</summary>
    public void AutoOutline(char outlineKey)
    {
        var toOutline = new List<(int X, int Y)>();
        for (int y = 0; y < Height; y++)
        {
            for (int x = 0; x < Width; x++)
            {
                if (Get(x, y) != '.') continue;
                bool touchesFilled = Get(x - 1, y) != '.' || Get(x + 1, y) != '.' || Get(x, y - 1) != '.' || Get(x, y + 1) != '.';
                if (touchesFilled) toOutline.Add((x, y));
            }
        }
        foreach ((int x, int y) in toOutline) Set(x, y, outlineKey);
    }

    public Texture2D Bake(Dictionary<char, Color> palette, int pixelScale = 2)
    {
        var image = Image.CreateEmpty(Width * pixelScale, Height * pixelScale, false, Image.Format.Rgba8);

        for (int y = 0; y < Height; y++)
        {
            for (int x = 0; x < Width; x++)
            {
                char key = _grid[x, y];
                Color color = key == '.' ? new Color(0, 0, 0, 0) : palette.GetValueOrDefault(key, new Color(1, 0, 1, 1));
                for (int py = 0; py < pixelScale; py++)
                    for (int px = 0; px < pixelScale; px++)
                        image.SetPixel(x * pixelScale + px, y * pixelScale + py, color);
            }
        }

        return ImageTexture.CreateFromImage(image);
    }

    public override string ToString()
    {
        var sb = new StringBuilder();
        for (int y = 0; y < Height; y++)
        {
            for (int x = 0; x < Width; x++) sb.Append(_grid[x, y]);
            sb.Append('\n');
        }
        return sb.ToString();
    }
}
