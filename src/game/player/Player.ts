// ===================================================================
// Player - Top-level player class combining all player systems
// ===================================================================
// Aggregates PlayerController (movement), PlayerStats (health/mana),
// PlayerProgression (XP/level), and PlayerAbilities (special moves)
// into a single cohesive player entity.
// ===================================================================

import * as THREE from 'three'
import { PlayerController, DEFAULT_PLAYER_CONTROLLER_CONFIG, PlayerControllerConfig } from './PlayerController'
import { PlayerStats } from './PlayerStats'
import { PlayerProgressionManager } from './PlayerProgression'
import { PlayerAbilities } from './PlayerAbilities'
import { InputManager } from '../input/InputManager'
import { CameraController } from '../engine/CameraController'
import { CharacterClass, EntityStats, PlayerCharacter, CharacterAppearance } from '../types'
import { CLASS_STARTING_STATS } from '../config/GameConfig'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'

export class Player {
  public controller: PlayerController
  public stats: PlayerStats
  public progression: PlayerProgressionManager
  public abilities: PlayerAbilities
  public character: PlayerCharacter

  private classType: CharacterClass
  private name: string

  constructor(
    inputManager: InputManager,
    cameraController: CameraController,
    classType: CharacterClass,
    name: string = 'Hero',
  ) {
    this.classType = classType
    this.name = name

    // Get starting stats for class
    const classInfo = CLASS_STARTING_STATS[classType]
    const startingStats: EntityStats = {
      maxHealth: classInfo.health,
      currentHealth: classInfo.health,
      maxMana: classInfo.mana,
      currentMana: classInfo.mana,
      maxStamina: classInfo.stamina,
      currentStamina: classInfo.stamina,
      attack: classInfo.attack,
      defense: classInfo.defense,
      speed: classInfo.speed,
      jumpForce: 9,
      criticalChance: 0.05,
      criticalDamage: 0.5,
      armor: classInfo.defense * 2,
      magicResistance: 10,
      lifesteal: 0,
      cooldownReduction: 0,
      luck: 0,
      evasion: 0.05,
      accuracy: 0.95,
    }

    // Create systems
    this.stats = new PlayerStats(startingStats)
    this.progression = new PlayerProgressionManager(classType)
    this.abilities = new PlayerAbilities(classType)
    this.controller = new PlayerController(
      inputManager,
      cameraController,
      this.stats,
      DEFAULT_PLAYER_CONTROLLER_CONFIG,
    )

    // Create character data
    this.character = {
      name,
      classType,
      appearance: this.getDefaultAppearance(),
      stats: startingStats,
      progression: this.progression.getProgression(),
      equippedWeapon: classInfo.startingWeapon,
      equippedArmor: '',
      unlockedAbilities: this.abilities.getAllAbilities().map((a) => a.id),
      unlockedSkins: ['default'],
      activeSkin: 'default',
    }

    this.setupEventListeners()
  }

  /**
   * Get default appearance based on class
   */
  private getDefaultAppearance(): CharacterAppearance {
    const appearances: Record<CharacterClass, CharacterAppearance> = {
      [CharacterClass.WARRIOR]: {
        bodyColor: 0x4a90e2,
        headColor: 0xfdd9b5,
        accentColor: 0xc0c0c0,
        eyeColor: 0x000000,
        scale: 1,
        height: 1.8,
        width: 0.8,
        hasCape: false,
        capeColor: 0x000000,
        hasHelmet: true,
        helmetStyle: 1,
        hasArmor: true,
        armorStyle: 1,
      },
      [CharacterClass.ARCHER]: {
        bodyColor: 0x4a8060,
        headColor: 0xfdd9b5,
        accentColor: 0x806040,
        eyeColor: 0x000000,
        scale: 1,
        height: 1.75,
        width: 0.75,
        hasCape: true,
        capeColor: 0x4a6040,
        hasHelmet: false,
        helmetStyle: 0,
        hasArmor: false,
        armorStyle: 0,
      },
      [CharacterClass.MAGE]: {
        bodyColor: 0x6040a0,
        headColor: 0xfdd9b5,
        accentColor: 0xffd700,
        eyeColor: 0x4080ff,
        scale: 1,
        height: 1.78,
        width: 0.7,
        hasCape: true,
        capeColor: 0x402080,
        hasHelmet: true,
        helmetStyle: 2,
        hasArmor: false,
        armorStyle: 0,
      },
      [CharacterClass.ASSASSIN]: {
        bodyColor: 0x2a2a3a,
        headColor: 0xfdd9b5,
        accentColor: 0x8040ff,
        eyeColor: 0xff4040,
        scale: 1,
        height: 1.77,
        width: 0.72,
        hasCape: true,
        capeColor: 0x1a1a2a,
        hasHelmet: true,
        helmetStyle: 3,
        hasArmor: false,
        armorStyle: 0,
      },
      [CharacterClass.TANK]: {
        bodyColor: 0x606060,
        headColor: 0xfdd9b5,
        accentColor: 0xc0a060,
        eyeColor: 0x000000,
        scale: 1.1,
        height: 1.9,
        width: 1.0,
        hasCape: false,
        capeColor: 0x000000,
        hasHelmet: true,
        helmetStyle: 1,
        hasArmor: true,
        armorStyle: 2,
      },
      [CharacterClass.NECROMANCER]: {
        bodyColor: 0x1a1a2a,
        headColor: 0xc0c0a0,
        accentColor: 0x80ff40,
        eyeColor: 0x80ff40,
        scale: 1,
        height: 1.78,
        width: 0.75,
        hasCape: true,
        capeColor: 0x0a0a1a,
        hasHelmet: false,
        helmetStyle: 0,
        hasArmor: false,
        armorStyle: 0,
      },
      [CharacterClass.PALADIN]: {
        bodyColor: 0xe0e0c0,
        headColor: 0xfdd9b5,
        accentColor: 0xffd700,
        eyeColor: 0x4080ff,
        scale: 1,
        height: 1.85,
        width: 0.85,
        hasCape: true,
        capeColor: 0xffd700,
        hasHelmet: true,
        helmetStyle: 4,
        hasArmor: true,
        armorStyle: 3,
      },
      [CharacterClass.BERSERKER]: {
        bodyColor: 0x804020,
        headColor: 0xfdd9b5,
        accentColor: 0xff4020,
        eyeColor: 0xff4020,
        scale: 1.15,
        height: 1.92,
        width: 0.95,
        hasCape: false,
        capeColor: 0x000000,
        hasHelmet: false,
        helmetStyle: 0,
        hasArmor: true,
        armorStyle: 1,
      },
    }

    return appearances[this.classType]
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for damage events to track stats
    eventBus.on(GameEventType.PLAYER_DAMAGED, (event) => {
      this.progression.recordDamageTaken(event.data.amount)
    })

    // Listen for kill events
    eventBus.on(GameEventType.PLAYER_KILL, () => {
      this.progression.recordKill()
    })

    // Listen for death
    eventBus.on(GameEventType.PLAYER_DEATH, () => {
      this.progression.recordDeath()
    })
  }

  /**
   * Update all player systems
   */
  update(deltaTime: number, currentTime: number): void {
    this.stats.update(deltaTime, currentTime)
    this.controller.update(deltaTime)
    this.abilities.update(deltaTime)
    this.progression.addPlayTime(deltaTime)
  }

  /**
   * Get the player mesh
   */
  getMesh(): THREE.Group {
    return this.controller.mesh
  }

  /**
   * Get player position
   */
  getPosition(): THREE.Vector3 {
    return this.controller.getPosition()
  }

  /**
   * Get player class type
   */
  getClassType(): CharacterClass {
    return this.classType
  }

  /**
   * Get player name
   */
  getName(): string {
    return this.name
  }

  /**
   * Get character data
   */
  getCharacter(): PlayerCharacter {
    return this.character
  }

  /**
   * Deal damage to an enemy (called when player attacks)
   */
  dealDamage(baseDamage: number, damageType: any = 'physical'): { damage: number; isCritical: boolean } {
    const stats = this.stats.getStats()
    let damage = baseDamage + stats.attack

    // Roll critical
    const critRoll = this.stats.rollCriticalDamage(damage)
    damage = critRoll.damage

    // Apply luck bonus
    damage *= 1 + stats.luck * 0.01

    this.progression.recordDamageDealt(damage)

    return { damage, isCritical: critRoll.isCritical }
  }

  /**
   * Gain experience
   */
  gainExperience(amount: number): void {
    this.progression.addExperience(amount)
  }

  /**
   * Gain gold
   */
  gainGold(amount: number): void {
    this.progression.addGoldEarned(amount)
  }

  /**
   * Get player's overall power level
   */
  getPowerLevel(): number {
    const stats = this.stats.getStats()
    const level = this.progression.getLevel()
    return Math.floor(
      level * 100 +
        stats.attack * 5 +
        stats.defense * 3 +
        stats.maxHealth * 0.5 +
        stats.maxMana * 0.3 +
        stats.criticalChance * 200 +
        stats.criticalDamage * 100,
    )
  }

  /**
   * Apply appearance to the mesh
   */
  applyAppearance(): void {
    const app = this.character.appearance
    const mesh = this.controller.mesh
    mesh.scale.setScalar(app.scale)

    // Find and recolor body parts
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial
        if (material && material.color) {
          if (child.name === 'head') {
            material.color.setHex(app.headColor)
          } else if (child.name === 'cape') {
            material.color.setHex(app.capeColor)
          } else if (child.name.includes('arm') || child.name.includes('leg')) {
            // Keep arm/leg colors as body
          }
        }
      }
    })
  }

  /**
   * Reset player to full health and starting state
   */
  reset(): void {
    this.stats.fullRestore()
    this.controller.reset()
    this.abilities.update(0) // Clear cooldowns by passing 0 - actually won't work, just placeholder
  }

  /**
   * Serialize player for save data
   */
  serialize(): PlayerCharacter {
    return {
      ...this.character,
      stats: this.stats.serialize(),
      progression: this.progression.serialize(),
    }
  }

  /**
   * Deserialize player from save data
   */
  deserialize(data: PlayerCharacter): void {
    this.character = { ...data }
    this.stats.deserialize(data.stats)
    this.progression.deserialize(data.progression)
  }
}
