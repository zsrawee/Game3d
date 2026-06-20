// ===================================================================
// Game Configuration - Central configuration constants
// ===================================================================
// All tunable game balance values, default settings, and shared
// configuration constants live here. Adjusting these values changes
// gameplay feel without requiring code changes elsewhere.
// ===================================================================

import {
  GameConfig,
  Difficulty,
  CharacterClass,
  BiomeType,
  DamageType,
} from '../types'

// -------------------------------------------------------------------
// Version & Meta
// -------------------------------------------------------------------

export const GAME_VERSION = '1.0.0'
export const GAME_NAME = 'Aether Realms 3D'
export const GAME_NAME_AR = 'عوالم الأثير ثلاثية الأبعاد'
export const SAVE_VERSION = '1.0.0'
export const SAVE_SLOT_COUNT = 5
export const AUTOSAVE_SLOT = 0

// -------------------------------------------------------------------
// Engine / Rendering
// -------------------------------------------------------------------

export const TARGET_FPS = 60
export const FIXED_TIMESTEP = 1 / 60
export const MAX_DELTA_TIME = 0.1
export const RENDER_SCALE_MOBILE = 0.85
export const RENDER_SCALE_DESKTOP = 1.0
export const SHADOW_MAP_SIZE = 2048
export const SHADOW_MAP_SIZE_MOBILE = 1024
export const CAMERA_FOV = 60
export const CAMERA_NEAR = 0.1
export const CAMERA_FAR = 1000
export const MAX_LIGHTS = 8
export const FOG_NEAR = 50
export const FOG_FAR = 200

// -------------------------------------------------------------------
// Player Defaults
// -------------------------------------------------------------------

export const PLAYER_DEFAULT_HEIGHT = 1.8
export const PLAYER_DEFAULT_RADIUS = 0.4
export const PLAYER_DEFAULT_MASS = 70
export const PLAYER_DEFAULT_SPEED = 6
export const PLAYER_SPRINT_MULTIPLIER = 1.8
export const PLAYER_JUMP_FORCE = 9
export const PLAYER_DASH_DISTANCE = 8
export const PLAYER_DASH_COOLDOWN = 2.5
export const PLAYER_DASH_DURATION = 0.25
export const PLAYER_DASH_INVINCIBILITY = 0.3
export const PLAYER_GRAVITY = -25
export const PLAYER_MAX_SLOPE_ANGLE = 50
export const PLAYER_GROUND_CHECK_DISTANCE = 0.15
export const PLAYER_AIR_CONTROL = 0.35
export const PLAYER_ROTATION_SPEED = 12
export const PLAYER_ATTACK_COOLDOWN = 0.4
export const PLAYER_COMBO_WINDOW = 0.8
export const PLAYER_MAX_COMBO = 3
export const PLAYER_INVINCIBILITY_DURATION = 0.6
export const PLAYER_KNOCKBACK_RESISTANCE = 0.15
export const PLAYER_HEALTH_REGEN_DELAY = 5
export const PLAYER_HEALTH_REGEN_RATE = 2
export const PLAYER_STAMINA_REGEN_DELAY = 1.5
export const PLAYER_STAMINA_REGEN_RATE = 15
export const PLAYER_MANA_REGEN_RATE = 5

// -------------------------------------------------------------------
// Starting Stats Per Class
// -------------------------------------------------------------------

export const CLASS_STARTING_STATS: Record<CharacterClass, {
  health: number
  mana: number
  stamina: number
  attack: number
  defense: number
  speed: number
  startingWeapon: string
  description: string
  descriptionAr: string
}> = {
  [CharacterClass.WARRIOR]: {
    health: 150,
    mana: 50,
    stamina: 120,
    attack: 22,
    defense: 18,
    speed: 6,
    startingWeapon: 'iron_sword',
    description: 'A balanced melee fighter with strong defensive capabilities',
    descriptionAr: 'مقاتل متوازن في القتال القريب مع قدرات دفاعية قوية',
  },
  [CharacterClass.ARCHER]: {
    health: 110,
    mana: 60,
    stamina: 140,
    attack: 25,
    defense: 12,
    speed: 7.5,
    startingWeapon: 'oak_bow',
    description: 'Ranged specialist with high mobility and critical strikes',
    descriptionAr: 'متخصص قتال بعيد مع حركة عالية وضربات حرجة',
  },
  [CharacterClass.MAGE]: {
    health: 90,
    mana: 200,
    stamina: 80,
    attack: 30,
    defense: 8,
    speed: 5.5,
    startingWeapon: 'apprentice_staff',
    description: 'Devastating spellcaster with powerful elemental magic',
    descriptionAr: 'ساحر مدمّر بقدرات سحرية عناصرية قوية',
  },
  [CharacterClass.ASSASSIN]: {
    health: 100,
    mana: 70,
    stamina: 150,
    attack: 28,
    defense: 10,
    speed: 8.5,
    startingWeapon: 'twin_daggers',
    description: 'Stealthy killer with high burst damage and evasion',
    descriptionAr: 'قاتل خفي بأضرار عالية وتفادي ممتاز',
  },
  [CharacterClass.TANK]: {
    health: 220,
    mana: 40,
    stamina: 100,
    attack: 18,
    defense: 28,
    speed: 4.5,
    startingWeapon: 'war_hammer',
    description: 'Unmovable protector with massive health and defense',
    descriptionAr: 'حامٍ لا يتزحزح بصحة ودفاع هائلين',
  },
  [CharacterClass.NECROMANCER]: {
    health: 95,
    mana: 180,
    stamina: 90,
    attack: 24,
    defense: 11,
    speed: 5.8,
    startingWeapon: 'bone_staff',
    description: 'Dark summoner who commands undead minions',
    descriptionAr: 'مستدعٍ مظلم يقود عبيد الموتى',
  },
  [CharacterClass.PALADIN]: {
    health: 175,
    mana: 110,
    stamina: 110,
    attack: 20,
    defense: 22,
    speed: 5.5,
    startingWeapon: 'holy_sword',
    description: 'Holy warrior blending melee combat with healing magic',
    descriptionAr: 'محارب مقدس يمزج القتال القريب بسحر الشفاء',
  },
  [CharacterClass.BERSERKER]: {
    health: 165,
    mana: 30,
    stamina: 160,
    attack: 32,
    defense: 14,
    speed: 6.5,
    startingWeapon: 'great_axe',
    description: 'Reckless attacker who grows stronger as they take damage',
    descriptionAr: 'مهاجم متهتك يزداد قوة كلما تعرض للأذى',
  },
}

// -------------------------------------------------------------------
// Difficulty Multipliers
// -------------------------------------------------------------------

export const DIFFICULTY_MULTIPLIERS: Record<Difficulty, {
  enemyHealth: number
  enemyDamage: number
  enemySpeed: number
  spawnRate: number
  maxEnemies: number
  xpMultiplier: number
  goldMultiplier: number
  itemDropRate: number
  playerDamageTaken: number
}> = {
  [Difficulty.EASY]: {
    enemyHealth: 0.7,
    enemyDamage: 0.6,
    enemySpeed: 0.85,
    spawnRate: 0.7,
    maxEnemies: 12,
    xpMultiplier: 1.2,
    goldMultiplier: 1.0,
    itemDropRate: 1.3,
    playerDamageTaken: 0.7,
  },
  [Difficulty.NORMAL]: {
    enemyHealth: 1.0,
    enemyDamage: 1.0,
    enemySpeed: 1.0,
    spawnRate: 1.0,
    maxEnemies: 18,
    xpMultiplier: 1.0,
    goldMultiplier: 1.0,
    itemDropRate: 1.0,
    playerDamageTaken: 1.0,
  },
  [Difficulty.HARD]: {
    enemyHealth: 1.4,
    enemyDamage: 1.35,
    enemySpeed: 1.1,
    spawnRate: 1.25,
    maxEnemies: 24,
    xpMultiplier: 1.5,
    goldMultiplier: 1.25,
    itemDropRate: 1.1,
    playerDamageTaken: 1.2,
  },
  [Difficulty.NIGHTMARE]: {
    enemyHealth: 1.9,
    enemyDamage: 1.75,
    enemySpeed: 1.2,
    spawnRate: 1.5,
    maxEnemies: 32,
    xpMultiplier: 2.0,
    goldMultiplier: 1.5,
    itemDropRate: 1.2,
    playerDamageTaken: 1.5,
  },
  [Difficulty.INSANE]: {
    enemyHealth: 2.6,
    enemyDamage: 2.3,
    enemySpeed: 1.35,
    spawnRate: 1.8,
    maxEnemies: 40,
    xpMultiplier: 3.0,
    goldMultiplier: 2.0,
    itemDropRate: 1.35,
    playerDamageTaken: 1.8,
  },
}

// -------------------------------------------------------------------
// Biome Settings
// -------------------------------------------------------------------

export const BIOME_SETTINGS: Record<BiomeType, {
  groundColor: number
  skyColor: number
  fogColor: number
  fogDensity: number
  ambientColor: number
  ambientIntensity: number
  sunColor: number
  sunIntensity: number
  obstacleColor: number
  particleColor: number
  musicTrack: string
  ambientSound: string
}> = {
  [BiomeType.FOREST]: {
    groundColor: 0x3a5f3a,
    skyColor: 0x87ceeb,
    fogColor: 0xa8c8a8,
    fogDensity: 0.008,
    ambientColor: 0xb0d0b0,
    ambientIntensity: 0.6,
    sunColor: 0xfff4d8,
    sunIntensity: 1.2,
    obstacleColor: 0x4a3a2a,
    particleColor: 0x90ee90,
    musicTrack: 'forest_theme',
    ambientSound: 'forest_ambient',
  },
  [BiomeType.DESERT]: {
    groundColor: 0xc2a878,
    skyColor: 0xf5d99f,
    fogColor: 0xe8c89c,
    fogDensity: 0.012,
    ambientColor: 0xffe8c0,
    ambientIntensity: 0.8,
    sunColor: 0xffd27a,
    sunIntensity: 1.6,
    obstacleColor: 0x8a6f4a,
    particleColor: 0xffd700,
    musicTrack: 'desert_theme',
    ambientSound: 'desert_wind',
  },
  [BiomeType.SNOW]: {
    groundColor: 0xe0eef5,
    skyColor: 0xb0c8d8,
    fogColor: 0xd0e0e8,
    fogDensity: 0.018,
    ambientColor: 0xc0d8e8,
    ambientIntensity: 0.9,
    sunColor: 0xe8f0ff,
    sunIntensity: 1.0,
    obstacleColor: 0x506070,
    particleColor: 0xffffff,
    musicTrack: 'snow_theme',
    ambientSound: 'wind_howl',
  },
  [BiomeType.VOLCANIC]: {
    groundColor: 0x3a1a1a,
    skyColor: 0x4a1a10,
    fogColor: 0x6a2a1a,
    fogDensity: 0.025,
    ambientColor: 0xff6030,
    ambientIntensity: 0.5,
    sunColor: 0xff8040,
    sunIntensity: 1.4,
    obstacleColor: 0x1a0a0a,
    particleColor: 0xff4020,
    musicTrack: 'volcanic_theme',
    ambientSound: 'lava_bubble',
  },
  [BiomeType.CRYSTAL]: {
    groundColor: 0x2a3a5a,
    skyColor: 0x4060a0,
    fogColor: 0x5070b0,
    fogDensity: 0.015,
    ambientColor: 0x6080ff,
    ambientIntensity: 0.7,
    sunColor: 0xa0c0ff,
    sunIntensity: 1.1,
    obstacleColor: 0x80a0e0,
    particleColor: 0x60ffe0,
    musicTrack: 'crystal_theme',
    ambientSound: 'crystal_chime',
  },
  [BiomeType.VOID]: {
    groundColor: 0x0a0a14,
    skyColor: 0x000010,
    fogColor: 0x0a0a20,
    fogDensity: 0.03,
    ambientColor: 0x402060,
    ambientIntensity: 0.4,
    sunColor: 0x8040ff,
    sunIntensity: 0.8,
    obstacleColor: 0x301040,
    particleColor: 0xc080ff,
    musicTrack: 'void_theme',
    ambientSound: 'void_hum',
  },
  [BiomeType.OCEAN]: {
    groundColor: 0x1a4a6a,
    skyColor: 0x4a8aaa,
    fogColor: 0x2a5a7a,
    fogDensity: 0.02,
    ambientColor: 0x60a0c0,
    ambientIntensity: 0.7,
    sunColor: 0xa0d0e0,
    sunIntensity: 1.2,
    obstacleColor: 0x2a4a5a,
    particleColor: 0x80d0ff,
    musicTrack: 'ocean_theme',
    ambientSound: 'ocean_waves',
  },
  [BiomeType.SKY]: {
    groundColor: 0xa0c0e0,
    skyColor: 0x6090d0,
    fogColor: 0xc0e0ff,
    fogDensity: 0.01,
    ambientColor: 0xe0f0ff,
    ambientIntensity: 1.0,
    sunColor: 0xfff0e0,
    sunIntensity: 1.5,
    obstacleColor: 0xe0e0f0,
    particleColor: 0xffffff,
    musicTrack: 'sky_theme',
    ambientSound: 'wind_gentle',
  },
}

// -------------------------------------------------------------------
// Combat Balance
// -------------------------------------------------------------------

export const COMBAT_CONFIG = {
  BASE_CRITICAL_MULTIPLIER: 1.5,
  CRITICAL_MULTIPLIER_PER_LEVEL: 0.05,
  MAX_CRITICAL_MULTIPLIER: 4.0,
  BASE_CRITICAL_CHANCE: 0.05,
  ELEMENTAL_DAMAGE_MULTIPLIER: 1.5,
  RESISTANCE_REDUCTION_PER_HIT: 0.1,
  MAX_RESISTANCE: 0.85,
  MIN_RESISTANCE: -0.5,
  DEFENSE_FORMULA_CONSTANT: 100,
  ARMOR_MITIGATION_CAP: 0.75,
  KNOCKBACK_FORCE: 8,
  KNOCKBACK_VERTICAL: 3,
  HIT_STUN_DURATION: 0.2,
  POISE_BREAK_THRESHOLD: 100,
  COMBO_TIMEOUT: 1.5,
  MAX_PARTICLES_PER_HIT: 30,
  DAMAGE_NUMBER_LIFETIME: 1.5,
  DAMAGE_NUMBER_RISE: 1.5,
  LIFESTEAL_CAP: 0.5,
  HEALING_RECEIVE_MULTIPLIER: 1.0,
  SHIELD_DURATION: 5,
  STATUS_EFFECT_MAX_STACKS: 5,
}

// -------------------------------------------------------------------
// XP & Leveling
// -------------------------------------------------------------------

export const LEVELING_CONFIG = {
  BASE_XP_REQUIRED: 100,
  XP_MULTIPLIER_PER_LEVEL: 1.35,
  MAX_LEVEL: 100,
  XP_FROM_KILL_MULTIPLIER: 1.0,
  XP_FROM_QUEST_MULTIPLIER: 1.2,
  XP_FROM_EXPLORATION: 0.5,
  XP_LOSS_ON_DEATH: 0.0,
  STAT_POINTS_PER_LEVEL: 5,
  SKILL_POINTS_PER_LEVEL: 1,
  HEALTH_PER_LEVEL: 10,
  MANA_PER_LEVEL: 8,
  STAMINA_PER_LEVEL: 5,
  ATTACK_PER_LEVEL: 1.5,
  DEFENSE_PER_LEVEL: 1.2,
}

// -------------------------------------------------------------------
// Enemy Spawn
// -------------------------------------------------------------------

export const ENEMY_SPAWN_CONFIG = {
  MIN_SPAWN_DISTANCE: 25,
  MAX_SPAWN_DISTANCE: 60,
  DESPAWN_DISTANCE: 100,
  SPAWN_INTERVAL: 2.5,
  SPAWN_INTERVAL_VARIANCE: 1.0,
  MAX_SPAWN_RETRIES: 5,
  SPAWN_HEIGHT_OFFSET: 1,
  ELITE_SPAWN_CHANCE: 0.05,
  BOSS_SPAWN_TRIGGER_KILLS: 50,
  CONCURRENT_SPAWN_COUNT: 3,
  RESPAWN_TIME: 30,
  SAFE_ZONE_RADIUS: 15,
}

// -------------------------------------------------------------------
// World Generation
// -------------------------------------------------------------------

export const WORLD_CONFIG = {
  WORLD_SIZE: 200,
  WORLD_SEGMENTS: 32,
  OBSTACLE_COUNT: 80,
  COLLECTIBLE_COUNT: 40,
  OBSTACLE_MIN_SCALE: 1,
  OBSTACLE_MAX_SCALE: 5,
  OBSTACLE_MIN_DISTANCE: 4,
  COLLECTIBLE_RESPAWN_TIME: 60,
  WORLD_BORDER_WARNING: 90,
  WORLD_BORDER_HARD: 100,
}

// -------------------------------------------------------------------
// Inventory
// -------------------------------------------------------------------

export const INVENTORY_CONFIG = {
  DEFAULT_SLOTS: 30,
  MAX_SLOTS: 60,
  STACK_SIZE_DEFAULT: 99,
  STACK_SIZE_MATERIALS: 999,
  STACK_SIZE_CURRENCY: 999999,
  EQUIPMENT_SLOTS: 10,
  HOTBAR_SLOTS: 8,
}

// -------------------------------------------------------------------
// Audio Defaults
// -------------------------------------------------------------------

export const AUDIO_CONFIG = {
  MASTER_VOLUME_DEFAULT: 0.8,
  MUSIC_VOLUME_DEFAULT: 0.6,
  SFX_VOLUME_DEFAULT: 0.8,
  VOICE_VOLUME_DEFAULT: 0.9,
  AMBIENT_VOLUME_DEFAULT: 0.5,
  UI_VOLUME_DEFAULT: 0.7,
  MAX_CONCURRENT_SOUNDS: 16,
  SOUND_FADE_TIME: 0.5,
  MUSIC_CROSSFADE_TIME: 2.0,
}

// -------------------------------------------------------------------
// Damage Type Colors
// -------------------------------------------------------------------

export const DAMAGE_TYPE_COLORS: Record<DamageType, number> = {
  [DamageType.PHYSICAL]: 0xffffff,
  [DamageType.FIRE]: 0xff6020,
  [DamageType.ICE]: 0x60c0ff,
  [DamageType.LIGHTNING]: 0xffff40,
  [DamageType.POISON]: 0x80ff40,
  [DamageType.HOLY]: 0xfff0c0,
  [DamageType.SHADOW]: 0xa040ff,
  [DamageType.TRUE]: 0xff40ff,
}

// -------------------------------------------------------------------
// Rarity Colors
// -------------------------------------------------------------------

export const RARITY_COLORS = {
  common: 0xc0c0c0,
  uncommon: 0x40c040,
  rare: 0x4080ff,
  epic: 0xa040ff,
  legendary: 0xffa040,
  mythic: 0xff4040,
  divine: 0xffff80,
}

// -------------------------------------------------------------------
// Default Game Config
// -------------------------------------------------------------------

export const DEFAULT_GAME_CONFIG: GameConfig = {
  version: GAME_VERSION,
  debug: false,
  showFps: true,
  targetFps: TARGET_FPS,
  vsync: true,
  renderScale: RENDER_SCALE_MOBILE,
  shadowMapEnabled: true,
  shadowMapSize: SHADOW_MAP_SIZE_MOBILE,
  antialiasing: true,
  postProcessing: false,
  audioEnabled: true,
  musicVolume: AUDIO_CONFIG.MUSIC_VOLUME_DEFAULT,
  sfxVolume: AUDIO_CONFIG.SFX_VOLUME_DEFAULT,
  voiceVolume: AUDIO_CONFIG.VOICE_VOLUME_DEFAULT,
  masterVolume: AUDIO_CONFIG.MASTER_VOLUME_DEFAULT,
  controls: {
    virtualJoystickSize: 120,
    virtualJoystickOpacity: 0.65,
    virtualJoystickPosition: 'left',
    buttonSize: 80,
    buttonOpacity: 0.7,
    hapticFeedback: true,
    invertY: false,
    sensitivity: 1.0,
    autoAttack: false,
    autoTarget: true,
  },
  difficulty: Difficulty.NORMAL,
  autoSave: true,
  autoSaveInterval: 60,
  language: 'ar',
  region: 'ME',
  tutorialCompleted: false,
}

// -------------------------------------------------------------------
// Storage Keys
// -------------------------------------------------------------------

export const STORAGE_KEYS = {
  SAVE_DATA: 'aether_realms_save',
  SETTINGS: 'aether_realms_settings',
  HIGH_SCORES: 'aether_realms_highscores',
  TUTORIAL: 'aether_realms_tutorial',
  ANALYTICS: 'aether_realms_analytics',
  CACHE_VERSION: 'aether_realms_cache_version',
}

// -------------------------------------------------------------------
// UI Animation Timings
// -------------------------------------------------------------------

export const UI_ANIMATION = {
  FADE_IN: 0.3,
  FADE_OUT: 0.2,
  SLIDE_IN: 0.35,
  SLIDE_OUT: 0.25,
  POP_IN: 0.25,
  POP_OUT: 0.15,
  NOTIFICATION_DURATION: 3,
  NOTIFICATION_SLIDE: 0.4,
  TOOLTIP_DELAY: 0.5,
  SCREEN_SHAKE_DURATION: 0.3,
  SCREEN_SHAKE_INTENSITY: 0.5,
}
