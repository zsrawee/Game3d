// ===================================================================
// 3D Mobile Game - Comprehensive Type Definitions
// ===================================================================
// This file contains all shared TypeScript types, enums, and interfaces
// used throughout the entire game system. Every module imports from
// here to maintain strict type safety and consistency.
// ===================================================================

import * as THREE from 'three'

// -------------------------------------------------------------------
// Core Game State Enumerations
// -------------------------------------------------------------------

/** Represents the various high-level states the game can be in */
export enum GameState {
  BOOTING = 'booting',
  LOADING = 'loading',
  MAIN_MENU = 'main_menu',
  SETTINGS = 'settings',
  CHARACTER_SELECT = 'character_select',
  INVENTORY = 'inventory',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  VICTORY = 'victory',
  LEVEL_COMPLETE = 'level_complete',
  SHOP = 'shop',
  QUESTS = 'quests',
  ACHIEVEMENTS = 'achievements',
  CREDITS = 'credits',
}

/** Difficulty levels that scale enemy health, damage, and spawn rates */
export enum Difficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  NIGHTMARE = 'nightmare',
  INSANE = 'insane',
}

/** Biome types that change visual appearance and gameplay mechanics */
export enum BiomeType {
  FOREST = 'forest',
  DESERT = 'desert',
  SNOW = 'snow',
  VOLCANIC = 'volcanic',
  CRYSTAL = 'crystal',
  VOID = 'void',
  OCEAN = 'ocean',
  SKY = 'sky',
}

/** Categories of items that can be collected or used */
export enum ItemCategory {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  CONSUMABLE = 'consumable',
  MATERIAL = 'material',
  KEY_ITEM = 'key_item',
  COSMETIC = 'cosmetic',
  CURRENCY = 'currency',
  TREASURE = 'treasure',
}

/** Rarity tiers that affect item stats and visual glow colors */
export enum Rarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MYTHIC = 'mythic',
  DIVINE = 'divine',
}

/** Damage types for elemental and physical attacks */
export enum DamageType {
  PHYSICAL = 'physical',
  FIRE = 'fire',
  ICE = 'ice',
  LIGHTNING = 'lightning',
  POISON = 'poison',
  HOLY = 'holy',
  SHADOW = 'shadow',
  TRUE = 'true',
}

/** Enemy AI behavior modes */
export enum EnemyBehavior {
  IDLE = 'idle',
  PATROL = 'patrol',
  CHASE = 'chase',
  ATTACK = 'attack',
  FLEE = 'flee',
  STUNNED = 'stunned',
  DEAD = 'dead',
  SPECIAL = 'special',
}

/** Enemy classification types */
export enum EnemyType {
  GRUNT = 'grunt',
  RUNNER = 'runner',
  FLYER = 'flyer',
  TANK = 'tank',
  SHOOTER = 'shooter',
  HEALER = 'healer',
  SUMMONER = 'summoner',
  BOSS = 'boss',
  MINIBOSS = 'miniboss',
}

/** Weapon categories */
export enum WeaponType {
  SWORD = 'sword',
  BOW = 'bow',
  STAFF = 'staff',
  GUN = 'gun',
  HAMMER = 'hammer',
  DAGGER = 'dagger',
  SPEAR = 'spear',
  SHIELD = 'shield',
  CHAKRAM = 'chakram',
  SCYTHE = 'scythe',
}

/** Combat stance modes that change player behavior */
export enum CombatStance {
  AGGRESSIVE = 'aggressive',
  DEFENSIVE = 'defensive',
  BALANCED = 'balanced',
  RANGED = 'ranged',
  STEALTH = 'stealth',
}

/** Animation states for character models */
export enum AnimationState {
  IDLE = 'idle',
  WALKING = 'walking',
  RUNNING = 'running',
  JUMPING = 'jumping',
  FALLING = 'falling',
  LANDING = 'landing',
  ATTACKING = 'attacking',
  DAMAGED = 'damaged',
  DEATH = 'death',
  DASHING = 'dashing',
  CASTING = 'casting',
  BLOCKING = 'blocking',
  ROLLING = 'rolling',
}

// -------------------------------------------------------------------
// Player-Related Interfaces
// -------------------------------------------------------------------

/** Core statistics for any living entity (player or enemy) */
export interface EntityStats {
  maxHealth: number
  currentHealth: number
  maxMana: number
  currentMana: number
  maxStamina: number
  currentStamina: number
  attack: number
  defense: number
  speed: number
  jumpForce: number
  criticalChance: number
  criticalDamage: number
  armor: number
  magicResistance: number
  lifesteal: number
  cooldownReduction: number
  luck: number
  evasion: number
  accuracy: number
}

/** Player progression data */
export interface PlayerProgression {
  level: number
  experience: number
  experienceToNext: number
  skillPoints: number
  totalKills: number
  totalDeaths: number
  totalPlayTime: number
  highestLevel: number
  totalGoldEarned: number
  totalDamageDealt: number
  totalDamageTaken: number
  questsCompleted: number
  achievementsUnlocked: number
}

/** Player character customization */
export interface PlayerCharacter {
  name: string
  classType: CharacterClass
  appearance: CharacterAppearance
  stats: EntityStats
  progression: PlayerProgression
  equippedWeapon: string
  equippedArmor: string
  unlockedAbilities: string[]
  unlockedSkins: string[]
  activeSkin: string
}

/** Character classes that determine starting stats and abilities */
export enum CharacterClass {
  WARRIOR = 'warrior',
  ARCHER = 'archer',
  MAGE = 'mage',
  ASSASSIN = 'assassin',
  TANK = 'tank',
  NECROMANCER = 'necromancer',
  PALADIN = 'paladin',
  BERSERKER = 'berserker',
}

/** Visual appearance of a character */
export interface CharacterAppearance {
  bodyColor: number
  headColor: number
  accentColor: number
  eyeColor: number
  scale: number
  height: number
  width: number
  hasCape: boolean
  capeColor: number
  hasHelmet: boolean
  helmetStyle: number
  hasArmor: boolean
  armorStyle: number
}

// -------------------------------------------------------------------
// Item and Inventory Interfaces
// -------------------------------------------------------------------

/** Base item definition */
export interface Item {
  id: string
  name: string
  description: string
  category: ItemCategory
  rarity: Rarity
  icon: string
  model?: string
  stackable: boolean
  maxStack: number
  value: number
  weight: number
  level: number
  requirements?: ItemRequirements
  stats?: Partial<EntityStats>
  effects?: ItemEffect[]
  element?: DamageType
  tradeable: boolean
  sellable: boolean
  destructible: boolean
  tags: string[]
}

/** Requirements to equip or use an item */
export interface ItemRequirements {
  level?: number
  classType?: CharacterClass[]
  strength?: number
  agility?: number
  intelligence?: number
  vitality?: number
}

/** Effects that items can apply when used or equipped */
export interface ItemEffect {
  type: EffectType
  magnitude: number
  duration: number
  chance?: number
  stacking?: boolean
}

/** Types of effects items can have */
export enum EffectType {
  HEAL = 'heal',
  MANA_RESTORE = 'mana_restore',
  STAMINA_RESTORE = 'stamina_restore',
  BUFF_ATTACK = 'buff_attack',
  BUFF_DEFENSE = 'buff_defense',
  BUFF_SPEED = 'buff_speed',
  BUFF_CRIT = 'buff_crit',
  DEBUFF_ENEMY = 'debuff_enemy',
  CURE = 'cure',
  REVIVE = 'revive',
  TELEPORT = 'teleport',
  INVISIBILITY = 'invisibility',
  SHIELD = 'shield',
  DAMAGE_OVER_TIME = 'damage_over_time',
  FREEZE = 'freeze',
  STUN = 'stun',
  SLOW = 'slow',
}

/** Inventory slot containing an item and quantity */
export interface InventorySlot {
  item: Item
  quantity: number
  slotIndex: number
  locked: boolean
  acquiredAt: number
}

// -------------------------------------------------------------------
// Weapon Interfaces
// -------------------------------------------------------------------

/** Weapon definition extending the base item */
export interface Weapon extends Item {
  weaponType: WeaponType
  baseDamage: number
  attackSpeed: number
  range: number
  knockback: number
  projectileSpeed?: number
  projectileCount?: number
  spread?: number
  elementalDamage?: { type: DamageType; amount: number }[]
  comboCount?: number
  chargeTime?: number
  durability: number
  maxDurability: number
  upgradeLevel: number
  gemSlots: number
  equippedGems: string[]
}

// -------------------------------------------------------------------
// Enemy Interfaces
// -------------------------------------------------------------------

/** Enemy definition template */
export interface EnemyDefinition {
  id: string
  name: string
  type: EnemyType
  health: number
  damage: number
  defense: number
  speed: number
  attackRange: number
  detectionRange: number
  attackCooldown: number
  experienceReward: number
  goldReward: number
  itemDropChance: number
  possibleDrops: string[]
  behavior: EnemyBehavior
  abilities: string[]
  weaknesses: DamageType[]
  resistances: DamageType[]
  immunities: DamageType[]
  scale: number
  color: number
  isElite: boolean
  isBoss: boolean
  bossPhases?: BossPhase[]
}

/** Boss phase definition */
export interface BossPhase {
  phaseNumber: number
  healthThreshold: number
  damageMultiplier: number
  speedMultiplier: number
  attackPattern: string[]
  newAbilities: string[]
  enrageTimer: number
}

/** Active enemy instance in the world */
export interface EnemyInstance {
  id: string
  definitionId: string
  position: THREE.Vector3
  rotation: THREE.Euler
  currentHealth: number
  maxHealth: number
  currentMana: number
  maxMana: number
  state: EnemyBehavior
  target?: string
  spawnTime: number
  lastAttackTime: number
  lastAbilityTime: number
  currentPhase: number
  statusEffects: StatusEffect[]
  isElite: boolean
  isBoss: boolean
  aggroTable: Map<string, number>
  patrolPoints?: THREE.Vector3[]
  currentPatrolIndex: number
}

// -------------------------------------------------------------------
// Combat and Damage Interfaces
// -------------------------------------------------------------------

/** Status effect applied to entities */
export interface StatusEffect {
  id: string
  type: EffectType
  damageType: DamageType
  magnitude: number
  duration: number
  remainingTime: number
  tickInterval: number
  lastTickTime: number
  source: string
  stacking: boolean
  stacks: number
  maxStacks: number
}

/** Damage information for a hit */
export interface DamageInfo {
  amount: number
  type: DamageType
  isCritical: boolean
  source: string
  target: string
  position: THREE.Vector3
  knockback: THREE.Vector3
  statusEffects?: StatusEffect[]
  ignoredDefense: number
  trueDamage: number
}

// -------------------------------------------------------------------
// World and Level Interfaces
// -------------------------------------------------------------------

/** World/level definition */
export interface WorldDefinition {
  id: string
  name: string
  biome: BiomeType
  size: number
  segments: number
  seed: number
  ambientColor: number
  fogColor: number
  fogDensity: number
  skyColor: number
  sunColor: number
  sunIntensity: number
  sunPosition: THREE.Vector3
  groundColor: number
  obstacleDensity: number
  collectibleDensity: number
  enemySpawnRate: number
  maxEnemies: number
  bossId?: string
  bossSpawnTrigger?: number
  musicTrack: string
  ambientSound: string
  recommendedLevel: number
  unlockRequirement?: string
  specialRules?: string[]
}

/** Collectible item in the world */
export interface Collectible {
  id: string
  itemId: string
  position: THREE.Vector3
  rotation: THREE.Euler
  quantity: number
  bobHeight: number
  bobSpeed: number
  rotationSpeed: number
  glowColor: number
  pickupRadius: number
  respawnTime: number
  spawnTime: number
  isCollected: boolean
}

// -------------------------------------------------------------------
// Quest and Achievement Interfaces
// -------------------------------------------------------------------

/** Quest definition */
export interface Quest {
  id: string
  name: string
  description: string
  type: QuestType
  difficulty: Difficulty
  requirements: QuestRequirement[]
  rewards: QuestReward[]
  prerequisites: string[]
  isMainQuest: boolean
  isRepeatable: boolean
  cooldown?: number
  minLevel: number
  location?: string
  timeLimit?: number
  storyChapter?: number
}

/** Quest requirement that needs to be completed */
export interface QuestRequirement {
  type: QuestRequirementType
  targetId: string
  targetName: string
  requiredAmount: number
  currentAmount: number
  isCompleted: boolean
  description: string
}

/** Quest requirement types */
export enum QuestRequirementType {
  KILL_ENEMIES = 'kill_enemies',
  COLLECT_ITEMS = 'collect_items',
  REACH_LEVEL = 'reach_level',
  VISIT_LOCATION = 'visit_location',
  TALK_TO_NPC = 'talk_to_npc',
  DEFEAT_BOSS = 'defeat_boss',
  COMPLETE_QUEST = 'complete_quest',
  SURVIVE_TIME = 'survive_time',
  DEAL_DAMAGE = 'deal_damage',
  USE_ABILITY = 'use_ability',
  REACH_SCORE = 'reach_score',
  COLLECT_CURRENCY = 'collect_currency',
}

/** Quest type */
export enum QuestType {
  MAIN = 'main',
  SIDE = 'side',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  EVENT = 'event',
  HIDDEN = 'hidden',
}

/** Quest rewards */
export interface QuestReward {
  type: RewardType
  itemId?: string
  amount: number
  isGuaranteed: boolean
}

/** Reward types */
export enum RewardType {
  EXPERIENCE = 'experience',
  GOLD = 'gold',
  ITEM = 'item',
  SKILL_POINT = 'skill_point',
  UNLOCK = 'unlock',
  ACHIEVEMENT = 'achievement',
  CURRENCY = 'currency',
}

/** Achievement definition */
export interface Achievement {
  id: string
  name: string
  description: string
  category: AchievementCategory
  icon: string
  points: number
  isHidden: boolean
  isUnlocked: boolean
  unlockedAt?: number
  progress: number
  maxProgress: number
  reward?: QuestReward
}

/** Achievement categories */
export enum AchievementCategory {
  COMBAT = 'combat',
  EXPLORATION = 'exploration',
  COLLECTION = 'collection',
  PROGRESSION = 'progression',
  SOCIAL = 'social',
  SPECIAL = 'special',
  SECRET = 'secret',
}

// -------------------------------------------------------------------
// Configuration Interfaces
// -------------------------------------------------------------------

/** Game configuration */
export interface GameConfig {
  version: string
  debug: boolean
  showFps: boolean
  targetFps: number
  vsync: boolean
  renderScale: number
  shadowMapEnabled: boolean
  shadowMapSize: number
  antialiasing: boolean
  postProcessing: boolean
  audioEnabled: boolean
  musicVolume: number
  sfxVolume: number
  voiceVolume: number
  masterVolume: number
  controls: ControlConfig
  difficulty: Difficulty
  autoSave: boolean
  autoSaveInterval: number
  language: string
  region: string
  tutorialCompleted: boolean
}

/** Control configuration */
export interface ControlConfig {
  virtualJoystickSize: number
  virtualJoystickOpacity: number
  virtualJoystickPosition: 'left' | 'right'
  buttonSize: number
  buttonOpacity: number
  hapticFeedback: boolean
  invertY: boolean
  sensitivity: number
  autoAttack: boolean
  autoTarget: boolean
}

// -------------------------------------------------------------------
// Event System Interfaces
// -------------------------------------------------------------------

/** Game event types */
export enum GameEventType {
  PLAYER_DAMAGED = 'player_damaged',
  PLAYER_HEALED = 'player_healed',
  PLAYER_DEATH = 'player_death',
  PLAYER_LEVEL_UP = 'player_level_up',
  PLAYER_KILL = 'player_kill',
  ENEMY_SPAWNED = 'enemy_spawned',
  ENEMY_DEATH = 'enemy_death',
  ENEMY_DAMAGED = 'enemy_damaged',
  ITEM_PICKED_UP = 'item_picked_up',
  ITEM_USED = 'item_used',
  QUEST_STARTED = 'quest_started',
  QUEST_COMPLETED = 'quest_completed',
  QUEST_PROGRESS = 'quest_progress',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  LEVEL_LOADED = 'level_loaded',
  GAME_PAUSED = 'game_paused',
  GAME_RESUMED = 'game_resumed',
  GAME_OVER = 'game_over',
  BOSS_DEFEATED = 'boss_defeated',
  BOSS_PHASE_CHANGE = 'boss_phase_change',
  WEAPON_FIRED = 'weapon_fired',
  PROJECTILE_HIT = 'projectile_hit',
  ABILITY_USED = 'ability_used',
  UI_OPEN = 'ui_open',
  UI_CLOSE = 'ui_close',
  NOTIFICATION = 'notification',
  TUTORIAL_STEP = 'tutorial_step',
  SETTINGS_CHANGED = 'settings_changed',
  SAVE_COMPLETE = 'save_complete',
  LOAD_COMPLETE = 'load_complete',
}

/** Game event payload */
export interface GameEvent {
  type: GameEventType
  data: any
  timestamp: number
  source?: string
}

/** Event listener function */
export type EventListener = (event: GameEvent) => void

// -------------------------------------------------------------------
// Save Data Interface
// -------------------------------------------------------------------

/** Complete save data structure */
export interface SaveData {
  version: string
  saveTime: number
  playTime: number
  player: PlayerCharacter
  inventory: InventorySlot[]
  equipment: EquipmentSave
  world: WorldSave
  quests: QuestSave[]
  achievements: string[]
  settings: GameConfig
  statistics: GameStatistics
  unlocks: string[]
  currencies: Currencies
  lastCheckpoint?: CheckpointData
}

/** Equipment save data */
export interface EquipmentSave {
  weapon: string | null
  helmet: string | null
  chest: string | null
  legs: string | null
  boots: string | null
  gloves: string | null
  ring1: string | null
  ring2: string | null
  amulet: string | null
  belt: string | null
}

/** World save data */
export interface WorldSave {
  currentWorldId: string
  visitedWorlds: string[]
  defeatedBosses: string[]
  collectedCollectibles: string[]
  unlockedAreas: string[]
  worldStates: Record<string, any>
}

/** Quest save data */
export interface QuestSave {
  questId: string
  status: QuestStatus
  startedAt: number
  completedAt?: number
  progress: Record<string, number>
}

/** Quest status enum */
export enum QuestStatus {
  NOT_STARTED = 'not_started',
  AVAILABLE = 'available',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  TURNED_IN = 'turned_in',
  FAILED = 'failed',
  LOCKED = 'locked',
}

/** Game statistics */
export interface GameStatistics {
  totalPlayTime: number
  totalDeaths: number
  totalKills: number
  totalDamageDealt: number
  totalDamageTaken: number
  totalGoldEarned: number
  totalGoldSpent: number
  itemsCollected: number
  itemsUsed: number
  questsCompleted: number
  achievementsUnlocked: number
  bossesDefeated: number
  highestCombo: number
  longestSurvival: number
  deathsByEnemy: Record<string, number>
  killsByWeapon: Record<string, number>
  itemsByRarity: Record<string, number>
}

/** Currencies */
export interface Currencies {
  gold: number
  gems: number
  tokens: number
  shards: number
  crystals: number
  souls: number
  glory: number
}

/** Checkpoint data */
export interface CheckpointData {
  worldId: string
  position: THREE.Vector3
  rotation: THREE.Euler
  health: number
  mana: number
  stamina: number
  timestamp: number
}

// -------------------------------------------------------------------
// Particle and Effect Interfaces
// -------------------------------------------------------------------

/** Particle system configuration */
export interface ParticleConfig {
  count: number
  lifetime: number
  startSize: number
  endSize: number
  startColor: THREE.Color
  endColor: THREE.Color
  startOpacity: number
  endOpacity: number
  velocity: THREE.Vector3
  velocityVariation: THREE.Vector3
  acceleration: THREE.Vector3
  rotationSpeed: number
  rotationVariation: number
  texture?: string
  blending: THREE.Blending
  depthWrite: boolean
  emitterShape: 'point' | 'sphere' | 'box' | 'cone'
  emitterSize: THREE.Vector3
  followEmitter: boolean
  loop: boolean
  duration: number
  delay: number
}

// -------------------------------------------------------------------
// Audio Interfaces
// -------------------------------------------------------------------

/** Audio track definition */
export interface AudioTrack {
  id: string
  name: string
  url: string
  category: AudioCategory
  volume: number
  loop: boolean
  pitch: number
  fadeIn: number
  fadeOut: number
  priority: number
  preload: boolean
}

/** Audio categories */
export enum AudioCategory {
  MUSIC = 'music',
  SFX = 'sfx',
  VOICE = 'voice',
  AMBIENT = 'ambient',
  UI = 'ui',
}

// -------------------------------------------------------------------
// Utility Types
// -------------------------------------------------------------------

/** A serializable vector3 */
export interface SerializedVector3 {
  x: number
  y: number
  z: number
}

/** A serializable euler */
export interface SerializedEuler {
  x: number
  y: number
  z: number
  order?: string
}

/** Result of a raycast */
export interface RaycastHit {
  point: THREE.Vector3
  normal: THREE.Vector3
  distance: number
  object: THREE.Object3D
  collider?: string
}

/** Touch input data */
export interface TouchData {
  id: number
  position: { x: number; y: number }
  startPosition: { x: number; y: number }
  delta: { x: number; y: number }
  startTime: number
  duration: number
  phase: 'start' | 'move' | 'end' | 'cancel'
  target?: HTMLElement
}

/** Virtual joystick state */
export interface JoystickState {
  active: boolean
  position: { x: number; y: number }
  direction: { x: number; y: number }
  magnitude: number
  angle: number
}

/** Performance metrics */
export interface PerformanceMetrics {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  vertices: number
  memoryUsed: number
  memoryLimit: number
  textureMemory: number
  geometryMemory: number
  scriptsTime: number
  renderTime: number
}
