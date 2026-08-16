class_name BossRoster
extends RefCounted
## The nine non-final trial bosses, shuffled into a random order at the
## start of every run (see RunProgress.ensure_boss_order/boss_order) so
## which sin actually occupies which level varies run to run — only the
## Adversary's position is fixed, always the tenth and final trial.
## DungeonGenerator resolves "which boss belongs at this level" through
## boss_at(), never by hardcoding a specific boss scene per level.

const NON_FINAL_BOSSES: Array[Dictionary] = [
	{"name": "Pride", "scene": "res://scenes/bosses/pride_boss.tscn"},
	{"name": "Envy", "scene": "res://scenes/bosses/envy_boss.tscn"},
	{"name": "Wrath", "scene": "res://scenes/bosses/wrath_boss.tscn"},
	{"name": "Gluttony", "scene": "res://scenes/bosses/gluttony_boss.tscn"},
	{"name": "Greed", "scene": "res://scenes/bosses/greed_boss.tscn"},
	{"name": "Sloth", "scene": "res://scenes/bosses/sloth_boss.tscn"},
	{"name": "Lust", "scene": "res://scenes/bosses/lust_boss.tscn"},
	{"name": "Despair", "scene": "res://scenes/bosses/despair_boss.tscn"},
	{"name": "Doubt", "scene": "res://scenes/bosses/doubt_boss.tscn"},
]

const ADVERSARY: Dictionary = {"name": "The Adversary", "scene": "res://scenes/bosses/adversary_boss.tscn"}

const TRIAL_COUNT := 10


## A random permutation of indices into NON_FINAL_BOSSES — the order this
## run's Trials I-IX will actually appear in. Fisher-Yates over the caller's
## own RandomNumberGenerator (DungeonGenerator's _rng) rather than a fresh
## one, so it's driven by the same seed_value a level was built with when one's set.
static func shuffled_order(rng: RandomNumberGenerator) -> Array[int]:
	var indices: Array[int] = []
	for i in range(NON_FINAL_BOSSES.size()):
		indices.append(i)

	for i in range(indices.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var swap: int = indices[i]
		indices[i] = indices[j]
		indices[j] = swap

	return indices


## level_index is 1-based (1..10, matching level1.tscn..level10.tscn).
## Trial X always resolves to the Adversary regardless of order — order
## only covers where the nine sins land within Trials I-IX.
static func boss_at(order: Array, level_index: int) -> Dictionary:
	if level_index >= TRIAL_COUNT or order.is_empty():
		return ADVERSARY
	var order_index: int = order[(level_index - 1) % order.size()]
	return NON_FINAL_BOSSES[order_index]
