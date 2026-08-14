namespace Salvation.Core;

/// <summary>
/// The full stat block from the design doc: Health, Magic, Speed, Power,
/// Defense, Faith, Luck, Critical Chance, Critical Damage. Current values
/// are mutable at runtime (damage, healing, buffs); Max* fields represent
/// the character's baseline before relics/blessings are applied.
/// </summary>
public class Stats
{
    public float MaxHealth { get; set; }
    public float Health { get; set; }

    public float MaxMagic { get; set; }
    public float Magic { get; set; }

    public float Speed { get; set; }
    public float Power { get; set; }
    public float Defense { get; set; }

    /// <summary>
    /// Rises when enemies are redeemed rather than smitten. Gates
    /// Faith-locked relic effects and shifts cutscene tone at run's end.
    /// </summary>
    public float Faith { get; set; }

    /// <summary>Improves item rarity odds on room clear.</summary>
    public float Luck { get; set; }

    public float CriticalChance { get; set; }
    public float CriticalDamage { get; set; }

    public Stats(
        float maxHealth, float maxMagic, float speed, float power, float defense,
        float faith = 0f, float luck = 0f, float criticalChance = 0f, float criticalDamage = 1.5f)
    {
        MaxHealth = maxHealth;
        Health = maxHealth;
        MaxMagic = maxMagic;
        Magic = maxMagic;
        Speed = speed;
        Power = power;
        Defense = defense;
        Faith = faith;
        Luck = luck;
        CriticalChance = criticalChance;
        CriticalDamage = criticalDamage;
    }

    public bool IsAlive => Health > 0f;

    /// <summary>Applies Defense as flat damage reduction, floored at 1 so Defense can never fully negate an attack.</summary>
    public void TakeDamage(float rawAmount)
    {
        float mitigated = Mathf(rawAmount - Defense, 1f);
        Health = Mathf(Health - mitigated, 0f, clampMax: false);
    }

    public void Heal(float amount) => Health = System.Math.Min(Health + amount, MaxHealth);

    public bool TrySpendMagic(float amount)
    {
        if (Magic < amount) return false;
        Magic -= amount;
        return true;
    }

    public void RestoreMagic(float amount) => Magic = System.Math.Min(Magic + amount, MaxMagic);

    private static float Mathf(float value, float min, bool clampMax = false) =>
        clampMax ? System.Math.Clamp(value, min, min) : System.Math.Max(value, min);
}
