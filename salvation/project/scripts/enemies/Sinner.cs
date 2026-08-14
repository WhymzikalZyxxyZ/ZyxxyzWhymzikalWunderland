using Godot;
using Salvation.Core;

namespace Salvation.Enemies;

/// <summary>Basic rank-and-file enemy — a plain chaser, no special mechanic. Bosses subclass Enemy directly instead.</summary>
public partial class Sinner : Enemy
{
    protected override Stats CreateStats() => new(
        maxHealth: 30f, maxMagic: 0f, speed: 110f, power: 5f, defense: 1f);

    protected override Texture2D BuildSprite() => CharacterSprites.BuildSinner();
}
