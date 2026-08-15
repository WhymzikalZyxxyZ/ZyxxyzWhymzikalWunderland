class_name PlayerController
extends CharacterBody2D
## Base twin-stick controller shared by all five characters: left stick /
## WASD moves, right stick / mouse aims, and a single attack action fires
## whatever the concrete character's attack() implements. Concrete
## characters (Paladin, Cleric, ...) extend this and supply stats + their
## own ability.

## The damage of the last ability that actually landed, and a counter that
## increments every time a new one does. Exists so bosses like Pride
## ("mirrors your last-used ability back at you") can observe and replay
## the player's own offense.
var last_ability_damage: float = 0.0
var last_ability_use_id: int = 0

## Rolled per-run growth: every boss defeated grants exactly one of these,
## picked at random — see apply_random_boss_upgrade(). All reset to
## nothing at the start of every run just by virtue of being a fresh
## PlayerController instance; nothing here is persisted between runs.
enum BossUpgradeType { DAMAGE, ATTACK_SPEED, MOVE_SPEED, NEW_MAGIC, CRIT_CHANCE, CRIT_DAMAGE }

const DAMAGE_UPGRADE_AMOUNT := 0.15
const ATTACK_SPEED_UPGRADE_FACTOR := 0.85
const MOVE_SPEED_UPGRADE_FACTOR := 1.12
const CRIT_CHANCE_UPGRADE_AMOUNT := 0.08
const CRIT_DAMAGE_UPGRADE_AMOUNT := 0.25
## A cooldown of exactly zero would let Attack Speed upgrades stack toward
## an unclickable-fast, physics-frame-limited attack rate — this is the
## floor no amount of stacking can go under.
const MIN_ATTACK_COOLDOWN := 0.08

## Multiplies every point of melee/ranged damage this character deals —
## see _rolled_damage(). Grown by the Damage boss upgrade; nothing else
## touches it.
var bonus_damage_multiplier: float = 1.0

## Each stack triggers one bonus Arcane Echo (a small extra burst +
## fraction of the ability's own effect) alongside every future Magic
## cast — see _trigger_arcane_echo(), called from each concrete
## character's own _use_magic(). Grown by the New Magic boss upgrade.
var echo_stacks: int = 0

## Every currently-active player, maintained by hand as a simple registry.
static var active_players: Array[PlayerController] = []

@export var character_id: int = CharacterId.PALADIN

@export var dash_speed: float = 720.0
@export var dash_duration: float = 0.15
@export var dash_cooldown: float = 0.6

## How fast velocity chases the target each second (not a top speed cap).
## Zero would be instant snap-to-input, which reads as stiff/robotic; this
## is a light Hades-style "fluid but immediate" curve — high enough that
## full speed arrives in under a tenth of a second, not the kind of lag
## that reads as sliding.
@export var acceleration: float = 26.0

@export var hit_flash_duration: float = 0.08

## The basic attack had no cooldown at all before boss upgrades existed —
## spam-clickable, gated only by the player's own click rate. A real
## cooldown had to exist first for an "Attack Speed" upgrade to have
## anything to actually shrink; 0.35s (~2.85/s uncapped) is picked to
## still feel snappy for a character with no upgrades yet, not a nerf
## dressed up as infrastructure.
@export var attack_cooldown: float = 0.35
var _attack_cooldown_remaining: float = 0.0

## A minor shove away from whatever landed the hit — same idea as Enemy's
## own knockback on take_damage, kept deliberately light (lower force,
## shorter duration than Enemy's) so it reads as impact feedback rather
## than a stagger that costs the player real control.
@export var knockback_force: float = 160.0
@export var knockback_duration: float = 0.1

## Furi-style parry: a short, precise window — much narrower than the
## dash's i-frames, and rewards actually landing it rather than just
## surviving. A hit absorbed during the window costs nothing and refunds
## Magic instead.
@export var parry_window: float = 0.18
@export var parry_cooldown: float = 0.9
@export var parry_magic_refund: float = 15.0

## Path to the screen shown on death. Exported (not a hardcoded scene-change
## call) so a future multi-character run can override it per-character, and
## so tests can construct a PlayerController without a live SceneTree behind it.
@export var death_screen_path: String = "res://scenes/ui/death_screen.tscn"

var stats: Stats

var health_ratio: float:
	get: return stats.health / stats.max_health if stats.max_health > 0.0 else 0.0
var magic_ratio: float:
	get: return stats.magic / stats.max_magic if stats.max_magic > 0.0 else 0.0

## True only for the duration of an active dash — the "minimal i-frames".
var is_invulnerable: bool = false

var _is_dashing: bool = false
var _dash_time_remaining: float = 0.0
var _dash_cooldown_remaining: float = 0.0
var _dash_direction: Vector2 = Vector2.ZERO
var _dash_afterimage_timer: float = 0.0

var _is_parrying: bool = false
var _parry_time_remaining: float = 0.0
var _parry_cooldown_remaining: float = 0.0
var _parry_flash_remaining: float = 0.0

var _sprite: Sprite2D
var _hit_flash_remaining: float = 0.0

var _knockback_remaining: float = 0.0
var _knockback_velocity: Vector2 = Vector2.ZERO


## Environment (floor/walls/obstacles) sits at negative z_index, but that's
## only relative to Room, its immediate parent. Actors set an explicit,
## unambiguously positive z_index instead of relying on being "0 by default,
## which happens to be above -1/-2" — this stays correct even if a future
## room layer, decoration, or effect gets added between the environment and
## the actors without every one of those additions having to reason about
## the exact z_index gap it's not allowed to cross.
const ACTOR_Z_INDEX := 10


func _ready() -> void:
	active_players.append(self)
	stats = _create_stats()
	z_index = ACTOR_Z_INDEX

	# Grounded is the CharacterBody2D default and applies floor/slope/
	# wall-slide physics meant for platformers — with no gravity here,
	# that's what makes movement feel "slidey". Floating is the mode
	# meant for top-down movement: input maps directly to velocity, no
	# residual slide against surfaces.
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING

	var texture := _build_sprite()
	if texture != null:
		_sprite = Sprite2D.new()
		_sprite.name = "Sprite2D"
		_sprite.texture = texture
		_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		add_child(_sprite)


## Concrete characters return their pixel-art texture (see CharacterSprites). Base has none.
func _build_sprite() -> Texture2D:
	return null


func _exit_tree() -> void:
	active_players.erase(self)


## Concrete characters return their own baseline stat block.
func _create_stats() -> Stats:
	return Stats.new(100.0, 50.0, 220.0, 12.0, 4.0)


func _physics_process(delta: float) -> void:
	var move_input := Input.get_vector("move_left", "move_right", "move_up", "move_down")

	_dash_cooldown_remaining -= delta
	if Input.is_action_just_pressed("dash") and not _is_dashing and not _is_parrying and _dash_cooldown_remaining <= 0.0:
		_dash_direction = move_input.normalized() if move_input != Vector2.ZERO else Vector2.RIGHT.rotated(rotation)
		_is_dashing = true
		_dash_time_remaining = dash_duration
		_dash_cooldown_remaining = dash_cooldown
		is_invulnerable = true

	if _is_dashing:
		_dash_time_remaining -= delta
		velocity = _dash_direction * dash_speed

		_dash_afterimage_timer -= delta
		if _dash_afterimage_timer <= 0.0:
			_dash_afterimage_timer = 0.03
			_spawn_dash_afterimage()

		if _dash_time_remaining <= 0.0:
			_is_dashing = false
			is_invulnerable = false
	elif _knockback_remaining > 0.0:
		_knockback_remaining -= delta
		velocity = _knockback_velocity
	elif move_input == Vector2.ZERO:
		# Releasing the stick/keys stops the character immediately rather than
		# coasting — the lerp below is for ramping smoothly INTO motion, not
		# for how it ends. Decaying velocity toward zero at the same rate
		# reads as sliding/ice-skating, which is exactly what MOTION_MODE_FLOATING
		# was chosen over the grounded default to avoid in the first place.
		velocity = Vector2.ZERO
	else:
		var target := move_input * stats.speed
		velocity = velocity.lerp(target, clampf(acceleration * delta, 0.0, 1.0))

	move_and_slide()

	_parry_cooldown_remaining -= delta
	if Input.is_action_just_pressed("parry") and not _is_parrying and not _is_dashing and _parry_cooldown_remaining <= 0.0:
		_is_parrying = true
		_parry_time_remaining = parry_window
		_parry_cooldown_remaining = parry_cooldown
	if _is_parrying:
		_parry_time_remaining -= delta
		if _parry_time_remaining <= 0.0:
			_is_parrying = false

	if _hit_flash_remaining > 0.0:
		_hit_flash_remaining -= delta
	if _parry_flash_remaining > 0.0:
		_parry_flash_remaining -= delta

	# Priority: hit flash (red) > perfect-parry flash (gold) > active parry window (blue tint) > normal.
	if _sprite != null:
		if _hit_flash_remaining > 0.0:
			_sprite.modulate = Color(1.0, 0.4, 0.4)
		elif _parry_flash_remaining > 0.0:
			_sprite.modulate = Color(1.0, 0.95, 0.55)
		elif _is_parrying:
			_sprite.modulate = Color(0.6, 0.9, 1.0)
		else:
			_sprite.modulate = Color.WHITE

	# Right stick preferred over mouse when both are present — a controller
	# player moving the stick shouldn't have facing hijacked by wherever the
	# mouse cursor happens to be sitting.
	var aim_input := Input.get_vector("aim_left", "aim_right", "aim_up", "aim_down")
	if aim_input != Vector2.ZERO:
		look_at(global_position + aim_input)
	elif get_viewport() != null:
		# get_mouse_position() is viewport/screen-space; look_at() needs a
		# global/world position. Every Room camera sits at that room's own
		# world center with a non-default zoom, so feeding screen-space
		# coordinates in directly aimed at a wildly wrong point the instant
		# the camera wasn't sitting at the world origin at 1:1 zoom — which
		# is to say, in every room except by coincidence. get_global_mouse_position()
		# is the transform-aware equivalent and is what look_at() actually needs.
		look_at(get_global_mouse_position())

	_attack_cooldown_remaining -= delta
	if Input.is_action_just_pressed("attack") and _attack_cooldown_remaining <= 0.0:
		_attack()
		_attack_cooldown_remaining = attack_cooldown
	if Input.is_action_just_pressed("magic"):
		_use_magic()


func _spawn_dash_afterimage() -> void:
	if _sprite == null or _sprite.texture == null or get_parent() == null:
		return

	var ghost := DashAfterimage.new()
	ghost.texture = _sprite.texture
	ghost.global_position = global_position
	ghost.rotation = rotation
	ghost.modulate = Color(1.0, 1.0, 1.0, 0.45)
	ghost.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	get_parent().add_child(ghost)


## Basic pixel-level attack feedback: a crescent that sweeps through an arc
## centered on the current facing direction, at roughly the range the
## strike actually lands. Concrete characters call this from their own
## _attack()/_use_magic() — the range differs per ability, so it's a
## parameter rather than baked in here. angle_offset_degrees rotates just
## the slash's facing away from the character's actual facing (rotation
## itself is untouched) — Monk's Flurry Strike spawns a few of these at
## slightly different offsets to read as multiple quick hits landing
## rather than one bigger swing.
func _spawn_attack_slash(swing_radius: float, angle_offset_degrees: float = 0.0) -> void:
	if get_parent() == null:
		return

	var angle: float = rotation + deg_to_rad(angle_offset_degrees)

	var slash := AttackSlash.new()
	slash.texture = CharacterSprites.build_slash()
	slash.pivot = self
	slash.facing_angle = angle
	slash.radius = swing_radius
	slash.global_position = global_position + Vector2.RIGHT.rotated(angle) * swing_radius
	slash.rotation = angle
	slash.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	slash.z_index = ACTOR_Z_INDEX
	get_parent().add_child(slash)


## A radial glow at at_position, tinted per spell — the visual for Magic
## abilities that don't read as a weapon swing (see MagicBurst). Concrete
## characters call this from their own _use_magic() instead of/alongside
## _spawn_attack_slash depending on what the spell actually does: a heal
## centers it on self, a smite centers it where the strike lands.
## end_scale_override, when positive, replaces MagicBurst's own default
## end_scale — Prophet's Final Verse wants a visibly bigger burst than
## everyone else's, being the single hardest-hitting Magic ability in the
## game; the game-wide default is right for everyone else.
func _spawn_magic_burst(at_position: Vector2, tint: Color, end_scale_override: float = -1.0) -> void:
	if get_parent() == null:
		return

	var burst := MagicBurst.new()
	burst.texture = CharacterSprites.build_burst()
	burst.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	burst.global_position = at_position
	burst.modulate = tint
	if end_scale_override > 0.0:
		burst.end_scale = end_scale_override
	burst.z_index = ACTOR_Z_INDEX
	get_parent().add_child(burst)


## Free basic attack, always available. Base is an unarmed placeholder.
func _attack() -> void:
	print("%s attacks (base implementation — override in the concrete character)." % CharacterId.name_of(character_id))


## Damages every Enemy and Rock within attack_range that's roughly ahead
## of the current facing direction (dot product against facing, not a
## precise arc) — the shared melee shape every character except
## Exorcist's ranged Banishing Rite uses for both their basic attack and
## their Magic ability. Returns whether anything was actually hit, since
## some callers (e.g. a Magic ability) only want to spend the cast's
## resource / record it as the player's last landed ability if it did.
## damage should already be the output of _rolled_damage() — this applies
## it as-is to every target caught in the swing, it doesn't roll anything itself.
func _strike_in_facing_cone(damage: float, attack_range: float, is_crit: bool = false) -> bool:
	var origin := global_position
	var facing := Vector2.RIGHT.rotated(rotation)
	var landed := false

	for target: Enemy in Enemy.active_enemies:
		if not is_instance_valid(target):
			continue
		if origin.distance_to(target.global_position) > attack_range:
			continue
		if origin.direction_to(target.global_position).dot(facing) < 0.5:
			continue

		target.take_damage(damage, is_crit)
		landed = true

	for rock: Rock in Rock.active_rocks:
		if not is_instance_valid(rock):
			continue
		if origin.distance_to(rock.global_position) > attack_range:
			continue
		if origin.direction_to(rock.global_position).dot(facing) < 0.5:
			continue

		rock.take_damage(damage, is_crit)
		landed = true

	return landed


## Each character's signature Magic-costing ability. Base does nothing.
func _use_magic() -> void:
	print("%s has no magic ability (base implementation — override in the concrete character)." % CharacterId.name_of(character_id))


func record_ability_used(damage: float) -> void:
	last_ability_damage = damage
	last_ability_use_id += 1


## True only for the target(s) hit by the most recent _rolled_damage()
## call — read this immediately after rolling, before the next roll
## overwrites it, to pass is_crit through to _strike_in_facing_cone/a
## Projectile so the target actually flashes gold instead of the plain
## white hit-flash. Not reset between rolls (each call sets it fresh either way).
var _last_roll_was_crit: bool = false


## Applies bonus_damage_multiplier and rolls stats.critical_chance/
## critical_damage — every concrete character's _attack()/_use_magic()
## should route its base damage number through this exactly once per use
## (not once per target hit) before handing it to _strike_in_facing_cone
## or a Projectile, so every target caught in the same swing/shot takes
## the identical (possibly critical) amount, and so record_ability_used
## reflects what actually landed rather than the un-rolled base number.
func _rolled_damage(base_damage: float) -> float:
	var amount: float = base_damage * bonus_damage_multiplier
	_last_roll_was_crit = randf() < stats.critical_chance
	if _last_roll_was_crit:
		amount *= stats.critical_damage
		print("%s critical hit!" % CharacterId.name_of(character_id))
	return amount


## Called from each concrete character's own _use_magic(), after its
## normal effect — a no-op until at least one New Magic boss upgrade has
## been granted. Each stack fires one additional small burst dealing a
## fraction of the ability's own base amount, landing on whatever's in
## front of the caster the same way a basic attack would (a flat cone
## strike, not the ability's own possibly-different shape — Exorcist's
## Rite echo doesn't launch a second Projectile, for instance, it just
## strikes like everyone else's melee cone does).
func _trigger_arcane_echo(base_amount: float, tint: Color) -> void:
	if echo_stacks <= 0:
		return

	for i in range(echo_stacks):
		var rolled := _rolled_damage(base_amount * 0.4)
		_strike_in_facing_cone(rolled, 60.0, _last_roll_was_crit)
		_spawn_magic_burst(global_position + Vector2.RIGHT.rotated(rotation) * 40.0, tint, 0.9)


## Picks count DISTINCT upgrade types at random (Fisher-Yates over
## BossUpgradeType's own values, then the first count) — what
## VictoryScreen actually offers the player to choose between, replacing
## the old fully-random apply-one-immediately behavior. Static and pure:
## doesn't need (or touch) any character instance, since which options
## exist doesn't depend on who's playing.
static func random_upgrade_choices(count: int) -> Array[BossUpgradeType]:
	# BossUpgradeType.values() returns a plain Array (of ints), not
	# Array[BossUpgradeType] — assigning it directly errors under GDScript's
	# static typing; .assign() does the actual element-by-element conversion.
	var pool: Array[BossUpgradeType] = []
	pool.assign(BossUpgradeType.values())
	for i in range(pool.size() - 1, 0, -1):
		var j := randi() % (i + 1)
		var swap: BossUpgradeType = pool[i]
		pool[i] = pool[j]
		pool[j] = swap
	return pool.slice(0, mini(count, pool.size()))


## The fixed-magnitude label for a given upgrade type (e.g. "+15% Damage")
## — static and pure, doesn't depend on any character's current stats, so
## VictoryScreen can show it as a choice option before anything's actually
## been applied to anyone.
static func describe_upgrade(type: BossUpgradeType) -> String:
	match type:
		BossUpgradeType.DAMAGE:
			return "+%d%% Damage" % roundi(DAMAGE_UPGRADE_AMOUNT * 100)
		BossUpgradeType.ATTACK_SPEED:
			return "+%d%% Attack Speed" % roundi((1.0 - ATTACK_SPEED_UPGRADE_FACTOR) * 100)
		BossUpgradeType.MOVE_SPEED:
			return "+%d%% Move Speed" % roundi((MOVE_SPEED_UPGRADE_FACTOR - 1.0) * 100)
		BossUpgradeType.NEW_MAGIC:
			return "New Magic: Arcane Echo"
		BossUpgradeType.CRIT_CHANCE:
			return "+%d%% Critical Chance" % roundi(CRIT_CHANCE_UPGRADE_AMOUNT * 100)
		BossUpgradeType.CRIT_DAMAGE:
			return "+%d%% Critical Damage" % roundi(CRIT_DAMAGE_UPGRADE_AMOUNT * 100)

	return ""


## Applies one specific upgrade type to this character. Split out from the
## old apply_random_boss_upgrade() so DungeonGenerator can replay a run's
## entire accumulated upgrade history onto a freshly-spawned character
## (see RunProgress.upgrades — every level spawns a brand new
## PlayerController, so nothing here survives on its own past the level
## boundary without being explicitly reapplied) and so VictoryScreen's
## choice UI can apply exactly the one the player actually picked, not a
## random one.
func apply_boss_upgrade(type: BossUpgradeType) -> void:
	match type:
		BossUpgradeType.DAMAGE:
			bonus_damage_multiplier += DAMAGE_UPGRADE_AMOUNT
		BossUpgradeType.ATTACK_SPEED:
			attack_cooldown = maxf(attack_cooldown * ATTACK_SPEED_UPGRADE_FACTOR, MIN_ATTACK_COOLDOWN)
		BossUpgradeType.MOVE_SPEED:
			stats.speed *= MOVE_SPEED_UPGRADE_FACTOR
		BossUpgradeType.NEW_MAGIC:
			echo_stacks += 1
		BossUpgradeType.CRIT_CHANCE:
			stats.critical_chance = clampf(stats.critical_chance + CRIT_CHANCE_UPGRADE_AMOUNT, 0.0, 1.0)
		BossUpgradeType.CRIT_DAMAGE:
			stats.critical_damage += CRIT_DAMAGE_UPGRADE_AMOUNT


## Rolls one upgrade at random and applies+describes it in one call — kept
## for callers (and existing tests) that don't need the player to choose
## between options.
func apply_random_boss_upgrade() -> String:
	var upgrade: BossUpgradeType = BossUpgradeType.values()[randi() % BossUpgradeType.size()]
	apply_boss_upgrade(upgrade)
	return describe_upgrade(upgrade)


## source_position is the attacker's position, used to push the player away
## from whatever landed the hit — INF means "no known source" (e.g. a future
## non-directional damage source), which skips knockback rather than
## computing a nonsense direction from it.
func take_damage(amount: float, source_position: Vector2 = Vector2.INF) -> void:
	if is_invulnerable:
		return

	if _is_parrying:
		# Perfect parry: no damage taken, and it pays for itself — reward
		# for the precise timing risk, not just a free block.
		_is_parrying = false
		_parry_flash_remaining = 0.18
		stats.restore_magic(parry_magic_refund)
		return

	stats.take_damage(amount)
	_hit_flash_remaining = hit_flash_duration

	if source_position.is_finite() and source_position != global_position:
		_knockback_velocity = source_position.direction_to(global_position) * knockback_force
		_knockback_remaining = knockback_duration

	if not stats.is_alive():
		_die()


func _die() -> void:
	print("%s has fallen." % CharacterId.name_of(character_id))
	active_players.erase(self)

	# Disable collision before freeing: an enemy is very likely still
	# actively sliding against this body via move_and_slide the instant it
	# dies (that's usually what killed it).
	var collision := get_node_or_null("CollisionShape2D")
	if collision != null:
		collision.disabled = true

	if is_inside_tree():
		get_tree().change_scene_to_file(death_screen_path)

	queue_free()
