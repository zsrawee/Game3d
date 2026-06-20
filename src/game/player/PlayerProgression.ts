// ===================================================================
// Player Progression - XP, levels, and skill points
// ===================================================================
// Tracks experience points, level, skill points, and total play
// statistics. Handles level-up logic, stat growth, and unlocks.
// ===================================================================

import { PlayerProgression } from '../types'
import {
  LEVELING_CONFIG,
  CLASS_STARTING_STATS,
} from '../config/GameConfig'
import { CharacterClass } from '../types'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'

export class PlayerProgressionManager {
  public progression: PlayerProgression
  private classType: CharacterClass
  private onLevelUpCallback?: (newLevel: number) => void

  constructor(classType: CharacterClass) {
    this.classType = classType
    this.progression = this.createDefaultProgression()
  }

  /**
   * Create default progression for a new character
   */
  private createDefaultProgression(): PlayerProgression {
    return {
      level: 1,
      experience: 0,
      experienceToNext: LEVELING_CONFIG.BASE_XP_REQUIRED,
      skillPoints: 0,
      totalKills: 0,
      totalDeaths: 0,
      totalPlayTime: 0,
      highestLevel: 1,
      totalGoldEarned: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      questsCompleted: 0,
      achievementsUnlocked: 0,
    }
  }

  /**
   * Get the current progression
   */
  getProgression(): PlayerProgression {
    return { ...this.progression }
  }

  /**
   * Get the current level
   */
  getLevel(): number {
    return this.progression.level
  }

  /**
   * Get the current experience
   */
  getExperience(): number {
    return this.progression.experience
  }

  /**
   * Get XP needed for next level
   */
  getExperienceToNext(): number {
    return this.progression.experienceToNext
  }

  /**
   * Get XP progress as a percentage (0-1)
   */
  getExperienceProgress(): number {
    return this.progression.experience / this.progression.experienceToNext
  }

  /**
   * Add experience points
   */
  addExperience(amount: number): void {
    if (this.progression.level >= LEVELING_CONFIG.MAX_LEVEL) return

    const scaledAmount = amount * LEVELING_CONFIG.XP_FROM_KILL_MULTIPLIER
    this.progression.experience += scaledAmount

    eventBus.emit(
      GameEventType.NOTIFICATION,
      {
        type: 'xp_gained',
        amount: scaledAmount,
        total: this.progression.experience,
        toNext: this.progression.experienceToNext,
      },
      'PlayerProgression',
    )

    // Check for level up
    while (
      this.progression.experience >= this.progression.experienceToNext &&
      this.progression.level < LEVELING_CONFIG.MAX_LEVEL
    ) {
      this.levelUp()
    }
  }

  /**
   * Level up the player
   */
  private levelUp(): void {
    this.progression.experience -= this.progression.experienceToNext
    this.progression.level++
    this.progression.skillPoints += LEVELING_CONFIG.SKILL_POINTS_PER_LEVEL
    this.progression.highestLevel = Math.max(this.progression.highestLevel, this.progression.level)

    // Calculate next level XP requirement
    this.progression.experienceToNext = Math.floor(
      LEVELING_CONFIG.BASE_XP_REQUIRED *
        Math.pow(LEVELING_CONFIG.XP_MULTIPLIER_PER_LEVEL, this.progression.level - 1),
    )

    eventBus.emit(
      GameEventType.PLAYER_LEVEL_UP,
      {
        newLevel: this.progression.level,
        skillPoints: this.progression.skillPoints,
        experienceToNext: this.progression.experienceToNext,
      },
      'PlayerProgression',
    )

    if (this.onLevelUpCallback) {
      this.onLevelUpCallback(this.progression.level)
    }

    console.info(`[PlayerProgression] Leveled up to ${this.progression.level}`)
  }

  /**
   * Get stat growth for the current level
   */
  getStatGrowthForLevel(level: number): {
    health: number
    mana: number
    stamina: number
    attack: number
    defense: number
  } {
    const levelDiff = level - 1
    return {
      health: levelDiff * LEVELING_CONFIG.HEALTH_PER_LEVEL,
      mana: levelDiff * LEVELING_CONFIG.MANA_PER_LEVEL,
      stamina: levelDiff * LEVELING_CONFIG.STAMINA_PER_LEVEL,
      attack: levelDiff * LEVELING_CONFIG.ATTACK_PER_LEVEL,
      defense: levelDiff * LEVELING_CONFIG.DEFENSE_PER_LEVEL,
    }
  }

  /**
   * Spend skill points
   */
  spendSkillPoints(amount: number): boolean {
    if (this.progression.skillPoints < amount) return false
    this.progression.skillPoints -= amount
    return true
  }

  /**
   * Add skill points
   */
  addSkillPoints(amount: number): void {
    this.progression.skillPoints += amount
  }

  /**
   * Record a kill
   */
  recordKill(): void {
    this.progression.totalKills++
  }

  /**
   * Record a death
   */
  recordDeath(): void {
    this.progression.totalDeaths++
  }

  /**
   * Add play time
   */
  addPlayTime(seconds: number): void {
    this.progression.totalPlayTime += seconds
  }

  /**
   * Record damage dealt
   */
  recordDamageDealt(amount: number): void {
    this.progression.totalDamageDealt += amount
  }

  /**
   * Record damage taken
   */
  recordDamageTaken(amount: number): void {
    this.progression.totalDamageTaken += amount
  }

  /**
   * Add gold earned
   */
  addGoldEarned(amount: number): void {
    this.progression.totalGoldEarned += amount
  }

  /**
   * Record a completed quest
   */
  recordQuestCompleted(): void {
    this.progression.questsCompleted++
  }

  /**
   * Record an unlocked achievement
   */
  recordAchievementUnlocked(): void {
    this.progression.achievementsUnlocked++
  }

  /**
   * Get the character class
   */
  getClassType(): CharacterClass {
    return this.classType
  }

  /**
   * Get class info
   */
  getClassInfo() {
    return CLASS_STARTING_STATS[this.classType]
  }

  /**
   * Set the level up callback
   */
  onLevelUp(callback: (newLevel: number) => void): void {
    this.onLevelUpCallback = callback
  }

  /**
   * Check if player is at max level
   */
  isMaxLevel(): boolean {
    return this.progression.level >= LEVELING_CONFIG.MAX_LEVEL
  }

  /**
   * Get total play time as a formatted string
   */
  getFormattedPlayTime(): string {
    const seconds = Math.floor(this.progression.totalPlayTime)
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) return `${hours}h ${mins}m`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  /**
   * Get kill/death ratio
   */
  getKDR(): number {
    if (this.progression.totalDeaths === 0) return this.progression.totalKills
    return this.progression.totalKills / this.progression.totalDeaths
  }

  /**
   * Serialize for save data
   */
  serialize(): PlayerProgression {
    return { ...this.progression }
  }

  /**
   * Deserialize from save data
   */
  deserialize(data: PlayerProgression): void {
    this.progression = { ...data }
  }
}
