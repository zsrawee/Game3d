// ===================================================================
// Player Stats - Health, mana, stamina, and stat management
// ===================================================================
// Manages player character statistics including health, mana, stamina,
// attack, defense, and derived stats. Handles regeneration, buffs,
// debuffs, and stat modifications from equipment and abilities.
// ===================================================================

import { EntityStats, EffectType, StatusEffect, DamageType } from '../types'
import {
  PLAYER_HEALTH_REGEN_DELAY,
  PLAYER_HEALTH_REGEN_RATE,
  PLAYER_STAMINA_REGEN_DELAY,
  PLAYER_STAMINA_REGEN_RATE,
  PLAYER_MANA_REGEN_RATE,
  COMBAT_CONFIG,
} from '../config/GameConfig'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import { clamp } from '../utils/MathUtils'

export class PlayerStats {
  public stats: EntityStats
  private baseStats: EntityStats
  private equipmentBonuses: Partial<EntityStats> = {}
  private buffBonuses: Partial<EntityStats> = {}
  private statusEffects: StatusEffect[] = []
  private lastDamageTime: number = 0
  private lastStaminaUse: number = 0
  private isDead: boolean = false

  constructor(baseStats: EntityStats) {
    this.baseStats = { ...baseStats }
    this.stats = { ...baseStats }
    this.stats.currentHealth = this.stats.maxHealth
    this.stats.currentMana = this.stats.maxMana
    this.stats.currentStamina = this.stats.maxStamina
  }

  /**
   * Get the current stats
   */
  getStats(): EntityStats {
    return { ...this.stats }
  }

  /**
   * Get the base stats (without equipment or buffs)
   */
  getBaseStats(): EntityStats {
    return { ...this.baseStats }
  }

  /**
   * Permanently modify base stats (level up, skill points, etc.)
   */
  modifyBaseStats(modifications: Partial<EntityStats>): void {
    Object.entries(modifications).forEach(([key, value]) => {
      if (typeof value === 'number') {
        ;(this.baseStats as any)[key] += value
      }
    })
    this.recalculateStats()
  }

  /**
   * Set base stats directly
   */
  setBaseStats(stats: EntityStats): void {
    this.baseStats = { ...stats }
    this.recalculateStats()
  }

  /**
   * Set equipment bonuses
   */
  setEquipmentBonuses(bonuses: Partial<EntityStats>): void {
    this.equipmentBonuses = { ...bonuses }
    this.recalculateStats()
  }

  /**
   * Update the stats (called every frame)
   */
  update(deltaTime: number, currentTime: number): void {
    if (this.isDead) return

    // Update status effects
    this.updateStatusEffects(deltaTime, currentTime)

    // Health regeneration
    if (
      currentTime - this.lastDamageTime > PLAYER_HEALTH_REGEN_DELAY &&
      this.stats.currentHealth < this.stats.maxHealth
    ) {
      const regenAmount = PLAYER_HEALTH_REGEN_RATE * deltaTime * (1 + this.stats.lifesteal * 0.5)
      this.stats.currentHealth = Math.min(
        this.stats.maxHealth,
        this.stats.currentHealth + regenAmount,
      )
    }

    // Stamina regeneration
    if (
      currentTime - this.lastStaminaUse > PLAYER_STAMINA_REGEN_DELAY &&
      this.stats.currentStamina < this.stats.maxStamina
    ) {
      const regenAmount = PLAYER_STAMINA_REGEN_RATE * deltaTime
      this.stats.currentStamina = Math.min(
        this.stats.maxStamina,
        this.stats.currentStamina + regenAmount,
      )
    }

    // Mana regeneration
    if (this.stats.currentMana < this.stats.maxMana) {
      const regenAmount = PLAYER_MANA_REGEN_RATE * deltaTime * (1 + this.stats.cooldownReduction * 0.3)
      this.stats.currentMana = Math.min(
        this.stats.maxMana,
        this.stats.currentMana + regenAmount,
      )
    }
  }

  /**
   * Apply damage to the player
   */
  takeDamage(amount: number, damageType: DamageType = DamageType.PHYSICAL): number {
    if (this.isDead) return 0

    let actualDamage = amount
    const now = performance.now() / 1000
    this.lastDamageTime = now

    // Apply defense mitigation
    if (damageType === DamageType.PHYSICAL) {
      const mitigation = this.stats.armor / (this.stats.armor + COMBAT_CONFIG.DEFENSE_FORMULA_CONSTANT)
      actualDamage *= 1 - Math.min(mitigation, COMBAT_CONFIG.ARMOR_MITIGATION_CAP)
    } else if (damageType !== DamageType.TRUE) {
      // Magic resistance applies to non-physical, non-true damage
      const mitigation = this.stats.magicResistance / 100
      actualDamage *= 1 - Math.min(mitigation, COMBAT_CONFIG.MAX_RESISTANCE)
    }

    actualDamage = Math.max(1, actualDamage)
    this.stats.currentHealth = Math.max(0, this.stats.currentHealth - actualDamage)

    eventBus.emit(
      GameEventType.PLAYER_DAMAGED,
      {
        amount: actualDamage,
        damageType,
        remainingHealth: this.stats.currentHealth,
        maxHealth: this.stats.maxHealth,
      },
      'PlayerStats',
    )

    if (this.stats.currentHealth <= 0) {
      this.die()
    }

    return actualDamage
  }

  /**
   * Heal the player
   */
  heal(amount: number): number {
    if (this.isDead) return 0
    const actualHeal = Math.min(amount, this.stats.maxHealth - this.stats.currentHealth)
    this.stats.currentHealth += actualHeal

    eventBus.emit(
      GameEventType.PLAYER_HEALED,
      {
        amount: actualHeal,
        remainingHealth: this.stats.currentHealth,
        maxHealth: this.stats.maxHealth,
      },
      'PlayerStats',
    )

    return actualHeal
  }

  /**
   * Use mana
   */
  useMana(amount: number): boolean {
    if (this.stats.currentMana < amount) return false
    this.stats.currentMana -= amount
    return true
  }

  /**
   * Restore mana
   */
  restoreMana(amount: number): number {
    const actualRestore = Math.min(amount, this.stats.maxMana - this.stats.currentMana)
    this.stats.currentMana += actualRestore
    return actualRestore
  }

  /**
   * Use stamina
   */
  useStamina(amount: number): boolean {
    if (this.stats.currentStamina < amount) return false
    this.stats.currentStamina -= amount
    this.lastStaminaUse = performance.now() / 1000
    return true
  }

  /**
   * Restore stamina
   */
  restoreStamina(amount: number): number {
    const actualRestore = Math.min(amount, this.stats.maxStamina - this.stats.currentStamina)
    this.stats.currentStamina += actualRestore
    return actualRestore
  }

  /**
   * Apply a status effect
   */
  applyStatusEffect(effect: StatusEffect): void {
    const existing = this.statusEffects.find(
      (e) => e.type === effect.type && e.source === effect.source,
    )

    if (existing) {
      if (effect.stacking && existing.stacks < existing.maxStacks) {
        existing.stacks++
        existing.magnitude += effect.magnitude
        existing.remainingTime = effect.duration
      } else {
        existing.remainingTime = Math.max(existing.remainingTime, effect.duration)
      }
    } else {
      this.statusEffects.push({ ...effect })
    }
  }

  /**
   * Remove a status effect
   */
  removeStatusEffect(effectId: string): void {
    const idx = this.statusEffects.findIndex((e) => e.id === effectId)
    if (idx >= 0) {
      this.statusEffects.splice(idx, 1)
    }
  }

  /**
   * Get all active status effects
   */
  getStatusEffects(): StatusEffect[] {
    return [...this.statusEffects]
  }

  /**
   * Clear all status effects
   */
  clearStatusEffects(): void {
    this.statusEffects = []
  }

  /**
   * Update status effects
   */
  private updateStatusEffects(deltaTime: number, currentTime: number): void {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const effect = this.statusEffects[i]
      effect.remainingTime -= deltaTime

      // Tick damage/heal effects
      if (effect.tickInterval > 0 && currentTime - effect.lastTickTime >= effect.tickInterval) {
        effect.lastTickTime = currentTime
        switch (effect.type) {
          case EffectType.DAMAGE_OVER_TIME:
            this.takeDamage(effect.magnitude * effect.stacks, effect.damageType)
            break
          case EffectType.HEAL:
            this.heal(effect.magnitude * effect.stacks)
            break
          case EffectType.MANA_RESTORE:
            this.restoreMana(effect.magnitude * effect.stacks)
            break
          case EffectType.STAMINA_RESTORE:
            this.restoreStamina(effect.magnitude * effect.stacks)
            break
        }
      }

      if (effect.remainingTime <= 0) {
        this.statusEffects.splice(i, 1)
      }
    }

    // Recalculate buff bonuses from active effects
    this.recalculateBuffBonuses()
  }

  /**
   * Recalculate buff bonuses from status effects
   */
  private recalculateBuffBonuses(): void {
    const bonuses: Partial<EntityStats> = {
      attack: 0,
      defense: 0,
      speed: 0,
      criticalChance: 0,
    }

    this.statusEffects.forEach((effect) => {
      const totalMagnitude = effect.magnitude * effect.stacks
      switch (effect.type) {
        case EffectType.BUFF_ATTACK:
          bonuses.attack = (bonuses.attack || 0) + totalMagnitude
          break
        case EffectType.BUFF_DEFENSE:
          bonuses.defense = (bonuses.defense || 0) + totalMagnitude
          break
        case EffectType.BUFF_SPEED:
          bonuses.speed = (bonuses.speed || 0) + totalMagnitude
          break
        case EffectType.BUFF_CRIT:
          bonuses.criticalChance = (bonuses.criticalChance || 0) + totalMagnitude / 100
          break
        case EffectType.SLOW:
          bonuses.speed = (bonuses.speed || 0) - totalMagnitude
          break
      }
    })

    this.buffBonuses = bonuses
    this.recalculateStats()
  }

  /**
   * Recalculate final stats from base + equipment + buffs
   */
  private recalculateStats(): void {
    const oldHealthPercent = this.stats.maxHealth > 0 ? this.stats.currentHealth / this.stats.maxHealth : 1
    const oldManaPercent = this.stats.maxMana > 0 ? this.stats.currentMana / this.stats.maxMana : 1
    const oldStaminaPercent = this.stats.maxStamina > 0 ? this.stats.currentStamina / this.stats.maxStamina : 1

    this.stats = { ...this.baseStats }

    // Apply equipment bonuses
    Object.entries(this.equipmentBonuses).forEach(([key, value]) => {
      if (typeof value === 'number') {
        ;(this.stats as any)[key] += value
      }
    })

    // Apply buff bonuses
    Object.entries(this.buffBonuses).forEach(([key, value]) => {
      if (typeof value === 'number') {
        ;(this.stats as any)[key] += value
      }
    })

    // Maintain percentages
    this.stats.currentHealth = Math.min(this.stats.maxHealth, this.stats.maxHealth * oldHealthPercent)
    this.stats.currentMana = Math.min(this.stats.maxMana, this.stats.maxMana * oldManaPercent)
    this.stats.currentStamina = Math.min(this.stats.maxStamina, this.stats.maxStamina * oldStaminaPercent)

    // Clamp negative stats
    this.stats.attack = Math.max(0, this.stats.attack)
    this.stats.defense = Math.max(0, this.stats.defense)
    this.stats.speed = Math.max(0.1, this.stats.speed)
  }

  /**
   * Kill the player
   */
  die(): void {
    if (this.isDead) return
    this.isDead = true
    this.stats.currentHealth = 0
    this.stats.currentMana = 0
    this.stats.currentStamina = 0
    eventBus.emit(GameEventType.PLAYER_DEATH, { timestamp: Date.now() }, 'PlayerStats')
  }

  /**
   * Revive the player
   */
  revive(healthPercent: number = 0.5): void {
    this.isDead = false
    this.stats.currentHealth = this.stats.maxHealth * clamp(healthPercent, 0, 1)
    this.stats.currentMana = this.stats.maxMana * 0.5
    this.stats.currentStamina = this.stats.maxStamina * 0.5
    this.statusEffects = []
    this.recalculateStats()
  }

  /**
   * Full restore (heal all stats to max)
   */
  fullRestore(): void {
    this.stats.currentHealth = this.stats.maxHealth
    this.stats.currentMana = this.stats.maxMana
    this.stats.currentStamina = this.stats.maxStamina
    this.statusEffects = []
    this.isDead = false
  }

  /**
   * Check if the player is dead
   */
  getIsDead(): boolean {
    return this.isDead
  }

  /**
   * Get current health percentage (0-1)
   */
  getHealthPercent(): number {
    return this.stats.maxHealth > 0 ? this.stats.currentHealth / this.stats.maxHealth : 0
  }

  /**
   * Get current mana percentage (0-1)
   */
  getManaPercent(): number {
    return this.stats.maxMana > 0 ? this.stats.currentMana / this.stats.maxMana : 0
  }

  /**
   * Get current stamina percentage (0-1)
   */
  getStaminaPercent(): number {
    return this.stats.maxStamina > 0 ? this.stats.currentStamina / this.stats.maxStamina : 0
  }

  /**
   * Check if player has enough resources for an ability
   */
  hasResources(health?: number, mana?: number, stamina?: number): boolean {
    if (health !== undefined && this.stats.currentHealth < health) return false
    if (mana !== undefined && this.stats.currentMana < mana) return false
    if (stamina !== undefined && this.stats.currentStamina < stamina) return false
    return true
  }

  /**
   * Get a damage multiplier based on critical chance
   */
  rollCriticalDamage(baseDamage: number): { damage: number; isCritical: boolean } {
    const isCritical = Math.random() < this.stats.criticalChance
    const multiplier = isCritical
      ? 1 + this.stats.criticalDamage
      : 1
    return {
      damage: baseDamage * multiplier,
      isCritical,
    }
  }

  /**
   * Get evasion check
   */
  rollEvasion(): boolean {
    return Math.random() < this.stats.evasion
  }

  /**
   * Serialize for save data
   */
  serialize(): EntityStats {
    return { ...this.stats }
  }

  /**
   * Deserialize from save data
   */
  deserialize(data: EntityStats): void {
    this.stats = { ...data }
    this.baseStats = { ...data }
    this.isDead = this.stats.currentHealth <= 0
  }
}
