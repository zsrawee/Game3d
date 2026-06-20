// ===================================================================
// Damage System - Combat damage calculation and application
// ===================================================================
// Central system for calculating and applying damage between entities.
// Handles damage type interactions (weaknesses/resistances), critical
// hits, damage mitigation, and damage events.
// ===================================================================

import * as THREE from 'three'
import { DamageInfo, DamageType, StatusEffect } from '../types'
import { COMBAT_CONFIG, DIFFICULTY_MULTIPLIERS } from '../config/GameConfig'
import { Difficulty } from '../types'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import { clamp } from '../utils/MathUtils'
import { Player } from '../player/Player'
import { EnemyManager } from '../enemies/EnemyManager'
import { Enemy } from '../enemies/Enemy'

export class DamageSystem {
  private player: Player | null = null
  private enemyManager: EnemyManager | null = null
  private difficulty: Difficulty = Difficulty.NORMAL
  private damageNumbers: DamageNumber[] = []
  private scene: THREE.Scene | null = null
  private damageNumberGroup: THREE.Group | null = null

  constructor() {}

  /**
   * Set required references
   */
  setReferences(
    player: Player,
    enemyManager: EnemyManager,
    scene: THREE.Scene,
  ): void {
    this.player = player
    this.enemyManager = enemyManager
    this.scene = scene
    this.damageNumberGroup = new THREE.Group()
    this.damageNumberGroup.name = 'damageNumbers'
    this.scene.add(this.damageNumberGroup)
  }

  /**
   * Set the difficulty
   */
  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty
  }

  /**
   * Calculate damage from player to an enemy
   */
  calculatePlayerDamage(
    baseDamage: number,
    damageType: DamageType = DamageType.PHYSICAL,
    isCritical: boolean = false,
  ): number {
    let damage = baseDamage

    // Apply critical multiplier
    if (isCritical) {
      const critMultiplier = COMBAT_CONFIG.BASE_CRITICAL_MULTIPLIER
      damage *= critMultiplier
    }

    // Apply player stat bonuses
    if (this.player) {
      const stats = this.player.stats.getStats()
      damage += stats.attack * 0.5
      damage *= 1 + stats.luck * 0.005
    }

    return Math.floor(damage)
  }

  /**
   * Apply damage from player to an enemy
   */
  applyPlayerDamageToEnemy(
    enemy: Enemy,
    baseDamage: number,
    damageType: DamageType = DamageType.PHYSICAL,
    isCritical: boolean = false,
    knockback?: THREE.Vector3,
    statusEffects?: StatusEffect[],
  ): number {
    if (!enemy.isAlive) return 0

    // Calculate damage
    let damage = this.calculatePlayerDamage(baseDamage, damageType, isCritical)

    // Apply weakness/resistance
    const def = enemy.getDefinition()
    if (def.weaknesses.includes(damageType)) {
      damage *= 1.5
    }
    if (def.resistances.includes(damageType)) {
      damage *= 0.5
    }
    if (def.immunities.includes(damageType)) {
      damage = 0
    }

    // Apply defense
    if (damageType === DamageType.PHYSICAL) {
      const mitigation = def.defense / (def.defense + COMBAT_CONFIG.DEFENSE_FORMULA_CONSTANT)
      damage *= 1 - clamp(mitigation, 0, COMBAT_CONFIG.ARMOR_MITIGATION_CAP)
    }

    damage = Math.max(1, Math.floor(damage))

    // Apply damage to enemy
    const actualDamage = enemy.takeDamage(damage, damageType, 'player')

    // Apply knockback
    if (knockback && knockback.lengthSq() > 0) {
      enemy.applyKnockback(knockback, 0.2)
    }

    // Apply status effects
    if (statusEffects) {
      statusEffects.forEach((effect) => {
        enemy.applyStatusEffect(effect)
      })
    }

    // Show damage number
    this.showDamageNumber(enemy.mesh.position.clone(), actualDamage, damageType, isCritical, false)

    // Record stats
    if (this.player) {
      this.player.progression.recordDamageDealt(actualDamage)
    }

    // Emit damage event
    const damageInfo: DamageInfo = {
      amount: actualDamage,
      type: damageType,
      isCritical,
      source: 'player',
      target: enemy.id,
      position: enemy.mesh.position.clone(),
      knockback: knockback || new THREE.Vector3(),
      ignoredDefense: 0,
      trueDamage: 0,
    }

    eventBus.emit(
      GameEventType.ENEMY_DAMAGED,
      {
        enemyId: enemy.id,
        damage: actualDamage,
        damageType,
        isCritical,
        source: 'player',
        position: enemy.mesh.position.toArray(),
      },
      'DamageSystem',
    )

    return actualDamage
  }

  /**
   * Apply damage from enemy to player
   */
  applyEnemyDamageToPlayer(
    enemyId: string,
    baseDamage: number,
    damageType: DamageType = DamageType.PHYSICAL,
    knockback?: THREE.Vector3,
  ): number {
    if (!this.player) return 0

    // Apply difficulty multiplier
    const diffMult = DIFFICULTY_MULTIPLIERS[this.difficulty]
    let damage = baseDamage * diffMult.enemyDamage * diffMult.playerDamageTaken

    // Apply player defenses
    const stats = this.player.stats.getStats()
    if (damageType === DamageType.PHYSICAL) {
      const mitigation = stats.armor / (stats.armor + COMBAT_CONFIG.DEFENSE_FORMULA_CONSTANT)
      damage *= 1 - clamp(mitigation, 0, COMBAT_CONFIG.ARMOR_MITIGATION_CAP)
    } else if (damageType !== DamageType.TRUE) {
      const mitigation = stats.magicResistance / 100
      damage *= 1 - clamp(mitigation, 0, COMBAT_CONFIG.MAX_RESISTANCE)
    }

    // Check evasion
    if (this.player.stats.rollEvasion()) {
      this.showDamageNumber(
        this.player.getPosition().clone(),
        0,
        damageType,
        false,
        true,
      )
      return 0
    }

    damage = Math.max(1, Math.floor(damage))

    // Check if player is invincible (dash i-frames)
    if (this.player.controller.isInvincible) {
      return 0
    }

    // Apply damage
    const actualDamage = this.player.stats.takeDamage(damage, damageType)

    // Apply knockback
    if (knockback && knockback.lengthSq() > 0) {
      const reducedKnockback = knockback.clone().multiplyScalar(
        1 - stats.lifesteal * 0.5, // Use a player stat for knockback reduction
      )
      this.player.controller.applyKnockback(reducedKnockback, 0.2)
    }

    // Show damage number
    this.showDamageNumber(
      this.player.getPosition().clone(),
      actualDamage,
      damageType,
      false,
      false,
    )

    // Emit damage event
    eventBus.emit(
      GameEventType.PLAYER_DAMAGED,
      {
        amount: actualDamage,
        damageType,
        source: enemyId,
        remainingHealth: this.player.stats.getStats().currentHealth,
      },
      'DamageSystem',
    )

    return actualDamage
  }

  /**
   * Apply AoE damage from player to all enemies in range
   */
  applyAoEDamage(
    center: THREE.Vector3,
    radius: number,
    baseDamage: number,
    damageType: DamageType = DamageType.PHYSICAL,
    knockback?: number,
    statusEffects?: StatusEffect[],
  ): number {
    if (!this.enemyManager) return 0

    const enemies = this.enemyManager.getEnemiesInRange(center, radius)
    let hitCount = 0

    enemies.forEach((enemy) => {
      const distance = enemy.mesh.position.distanceTo(center)
      const falloff = 1 - (distance / radius) * 0.4 // 40% falloff at edge
      const scaledDamage = baseDamage * falloff

      const isCritical = this.player ? this.player.stats.getStats().criticalChance > Math.random() : false

      let knockbackVec: THREE.Vector3 | undefined
      if (knockback && knockback > 0) {
        const dir = enemy.mesh.position.clone().sub(center)
        dir.y = 0.5
        knockbackVec = dir.normalize().multiplyScalar(knockback)
      }

      this.applyPlayerDamageToEnemy(
        enemy,
        scaledDamage,
        damageType,
        isCritical,
        knockbackVec,
        statusEffects,
      )
      hitCount++
    })

    return hitCount
  }

  /**
   * Apply damage in a cone (for breath attacks, sweeps)
   */
  applyConeDamage(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    coneAngleDeg: number,
    baseDamage: number,
    damageType: DamageType = DamageType.PHYSICAL,
    knockback?: number,
  ): number {
    if (!this.enemyManager) return 0

    const enemies = this.enemyManager.getEnemiesInCone(origin, direction, range, coneAngleDeg)
    let hitCount = 0

    enemies.forEach((enemy) => {
      const isCritical = this.player ? this.player.stats.getStats().criticalChance > Math.random() : false

      let knockbackVec: THREE.Vector3 | undefined
      if (knockback && knockback > 0) {
        const dir = enemy.mesh.position.clone().sub(origin)
        dir.y = 0.5
        knockbackVec = dir.normalize().multiplyScalar(knockback)
      }

      this.applyPlayerDamageToEnemy(enemy, baseDamage, damageType, isCritical, knockbackVec)
      hitCount++
    })

    return hitCount
  }

  /**
   * Show a floating damage number in 3D space
   */
  private showDamageNumber(
    position: THREE.Vector3,
    amount: number,
    damageType: DamageType,
    isCritical: boolean,
    isMiss: boolean,
  ): void {
    if (!this.damageNumberGroup) return

    // Create canvas-based sprite for damage number
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    if (isMiss) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.font = 'bold 28px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('MISS', 64, 40)
    } else {
      // Determine color based on damage type
      const colors: Record<DamageType, string> = {
        [DamageType.PHYSICAL]: '#ffffff',
        [DamageType.FIRE]: '#ff6020',
        [DamageType.ICE]: '#60c0ff',
        [DamageType.LIGHTNING]: '#ffff40',
        [DamageType.POISON]: '#80ff40',
        [DamageType.HOLY]: '#fff0c0',
        [DamageType.SHADOW]: '#a040ff',
        [DamageType.TRUE]: '#ff40ff',
      }

      ctx.fillStyle = colors[damageType] || '#ffffff'
      ctx.font = isCritical ? 'bold 48px Arial' : 'bold 32px Arial'
      ctx.textAlign = 'center'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      const text = isCritical ? `${amount}!` : `${amount}`
      ctx.strokeText(text, 64, 40)
      ctx.fillText(text, 64, 40)
    }

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true,
    })
    const sprite = new THREE.Sprite(material)
    sprite.position.copy(position)
    sprite.position.y += 2
    sprite.scale.set(1.5, 0.75, 1)
    sprite.renderOrder = 999

    this.damageNumberGroup.add(sprite)

    this.damageNumbers.push({
      sprite,
      texture,
      material,
      lifetime: COMBAT_CONFIG.DAMAGE_NUMBER_LIFETIME,
      age: 0,
      riseSpeed: COMBAT_CONFIG.DAMAGE_NUMBER_RISE,
      isCritical,
    })
  }

  /**
   * Update damage numbers
   */
  update(deltaTime: number): void {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i]
      dn.age += deltaTime
      dn.sprite.position.y += dn.riseSpeed * deltaTime

      // Fade out
      const fadeStart = dn.lifetime * 0.7
      if (dn.age > fadeStart) {
        const fadeAmount = 1 - (dn.age - fadeStart) / (dn.lifetime - fadeStart)
        dn.material.opacity = Math.max(0, fadeAmount)
      }

      // Pop scale effect
      if (dn.age < 0.2) {
        const t = dn.age / 0.2
        const scale = dn.isCritical ? 1.5 + (1 - t) * 0.5 : 1.0 + (1 - t) * 0.3
        dn.sprite.scale.setScalar(scale * 0.75)
      }

      if (dn.age >= dn.lifetime) {
        this.damageNumberGroup?.remove(dn.sprite)
        dn.texture.dispose()
        dn.material.dispose()
        this.damageNumbers.splice(i, 1)
      }
    }
  }

  /**
   * Get the active damage number count (for debug)
   */
  getDamageNumberCount(): number {
    return this.damageNumbers.length
  }

  /**
   * Clear all damage numbers
   */
  clearDamageNumbers(): void {
    this.damageNumbers.forEach((dn) => {
      this.damageNumberGroup?.remove(dn.sprite)
      dn.texture.dispose()
      dn.material.dispose()
    })
    this.damageNumbers = []
  }

  /**
   * Check if the player's attack hits any enemies
   */
  checkPlayerMeleeAttack(
    attackBox: THREE.Box3,
    baseDamage: number,
    damageType: DamageType = DamageType.PHYSICAL,
    knockback?: THREE.Vector3,
  ): number {
    if (!this.enemyManager) return 0

    const enemies = this.enemyManager.getEnemiesInBox(attackBox)
    let hitCount = 0

    enemies.forEach((enemy) => {
      const isCritical = this.player ? this.player.stats.getStats().criticalChance > Math.random() : false
      this.applyPlayerDamageToEnemy(enemy, baseDamage, damageType, isCritical, knockback)
      hitCount++
    })

    return hitCount
  }

  /**
   * Process a player attack (called when player attacks)
   */
  processPlayerAttack(
    playerPosition: THREE.Vector3,
    facingDirection: THREE.Vector3,
    weaponDamage: number,
    weaponRange: number,
    damageType: DamageType = DamageType.PHYSICAL,
    weaponKnockback: number = 5,
  ): number {
    if (!this.enemyManager) return 0

    // Calculate attack hitbox in front of player
    const hitboxCenter = playerPosition.clone()
    hitboxCenter.add(facingDirection.clone().multiplyScalar(weaponRange * 0.5))
    hitboxCenter.y += 1

    const hitbox = new THREE.Box3().setFromCenterAndSize(
      hitboxCenter,
      new THREE.Vector3(weaponRange, 2, 2),
    )

    const knockback = facingDirection.clone().multiplyScalar(weaponKnockback)
    knockback.y = 2

    return this.checkPlayerMeleeAttack(hitbox, weaponDamage, damageType, knockback)
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearDamageNumbers()
    if (this.damageNumberGroup && this.scene) {
      this.scene.remove(this.damageNumberGroup)
    }
  }
}

interface DamageNumber {
  sprite: THREE.Sprite
  texture: THREE.Texture
  material: THREE.SpriteMaterial
  lifetime: number
  age: number
  riseSpeed: number
  isCritical: boolean
}

// Global singleton
export const damageSystem = new DamageSystem()
