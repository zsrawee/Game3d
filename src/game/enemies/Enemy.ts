// ===================================================================
// Enemy Base Class - Base class for all enemy types
// ===================================================================
// Provides the foundation for all enemies: health, AI state machine,
// target tracking, damage handling, and visual representation.
// Subclasses extend this to define specific behaviors and abilities.
// ===================================================================

import * as THREE from 'three'
import {
  EnemyDefinition,
  EnemyInstance,
  EnemyBehavior,
  DamageType,
  EnemyType,
  StatusEffect,
  EffectType,
  DamageInfo,
} from '../types'
import { COMBAT_CONFIG, ENEMY_SPAWN_CONFIG } from '../config/GameConfig'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import { clamp, horizontalDistance, isWithinHorizontalDistance } from '../utils/MathUtils'
import { generateId } from '../utils/MathUtils'

export abstract class Enemy {
  public id: string
  public definition: EnemyDefinition
  public instance: EnemyInstance
  public mesh: THREE.Group
  public healthBar: THREE.Sprite | null = null
  public isAlive: boolean = true
  public isElite: boolean = false
  public isBoss: boolean = false

  protected target: THREE.Vector3 | null = null
  protected velocity: THREE.Vector3 = new THREE.Vector3()
  protected gravity: number = -25
  protected isGrounded: boolean = true
  protected spawnPosition: THREE.Vector3
  protected lastAttackTime: number = 0
  protected lastAbilityTime: number = 0
  protected statusEffects: StatusEffect[] = []
  protected currentPhase: number = 0
  protected animationTime: number = 0
  protected hitFlashTime: number = 0
  protected knockbackVelocity: THREE.Vector3 = new THREE.Vector3()
  protected knockbackTimer: number = 0
  protected stunTimer: number = 0
  protected frozenTimer: number = 0
  protected originalColor: THREE.Color
  protected bodyMaterial: THREE.MeshStandardMaterial | null = null

  constructor(definition: EnemyDefinition, position: THREE.Vector3, isElite: boolean = false) {
    this.id = generateId('enemy_')
    this.definition = { ...definition }
    this.isElite = isElite || definition.isBoss
    this.isBoss = definition.isBoss
    this.spawnPosition = position.clone()

    // Apply elite multiplier if elite
    if (isElite && !definition.isBoss) {
      this.definition.health = Math.floor(definition.health * 3)
      this.definition.damage = Math.floor(definition.damage * 1.5)
      this.definition.experienceReward = Math.floor(definition.experienceReward * 2)
      this.definition.goldReward = Math.floor(definition.goldReward * 2)
    }

    // Create instance
    this.instance = {
      id: this.id,
      definitionId: definition.id,
      position: position.clone(),
      rotation: new THREE.Euler(0, 0, 0),
      currentHealth: this.definition.health,
      maxHealth: this.definition.health,
      currentMana: 100,
      maxMana: 100,
      state: EnemyBehavior.IDLE,
      spawnTime: performance.now() / 1000,
      lastAttackTime: 0,
      lastAbilityTime: 0,
      currentPhase: 0,
      statusEffects: [],
      isElite,
      isBoss: definition.isBoss,
      aggroTable: new Map(),
      currentPatrolIndex: 0,
    }

    this.originalColor = new THREE.Color(definition.color)
    this.mesh = this.createMesh()
    this.mesh.position.copy(position)
    this.mesh.userData.enemy = this
    this.mesh.userData.id = this.id
  }

  /**
   * Create the visual mesh for this enemy - implemented by subclasses
   */
  protected abstract createMesh(): THREE.Group

  /**
   * Update the enemy AI and behavior - implemented by subclasses
   */
  public abstract updateAI(deltaTime: number, playerPosition: THREE.Vector3): void

  /**
   * Update the enemy (called every frame)
   */
  update(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (!this.isAlive) return

    this.animationTime += deltaTime

    // Update status effects
    this.updateStatusEffects(deltaTime)

    // Skip AI if stunned/frozen
    if (this.stunTimer > 0) {
      this.stunTimer -= deltaTime
      this.instance.state = EnemyBehavior.STUNNED
    } else if (this.frozenTimer > 0) {
      this.frozenTimer -= deltaTime
      this.instance.state = EnemyBehavior.STUNNED
    } else {
      // Run AI
      this.updateAI(deltaTime, playerPosition)
    }

    // Apply knockback
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= deltaTime
      const factor = this.knockbackTimer / 0.2
      this.mesh.position.x += this.knockbackVelocity.x * factor * deltaTime
      this.mesh.position.y += this.knockbackVelocity.y * factor * deltaTime
      this.mesh.position.z += this.knockbackVelocity.z * factor * deltaTime
    }

    // Apply gravity
    this.applyGravity(deltaTime)

    // Apply velocity
    this.applyMovement(deltaTime)

    // Update visual effects
    this.updateVisualEffects(deltaTime)

    // Update instance data
    this.instance.position.copy(this.mesh.position)
  }

  /**
   * Apply gravity to the enemy
   */
  protected applyGravity(deltaTime: number): void {
    if (this.isGrounded && this.velocity.y <= 0) {
      this.velocity.y = 0
      return
    }

    this.velocity.y += this.gravity * deltaTime
    if (this.velocity.y < -30) this.velocity.y = -30
  }

  /**
   * Apply movement with ground collision
   */
  protected applyMovement(deltaTime: number): void {
    this.mesh.position.x += this.velocity.x * deltaTime
    this.mesh.position.y += this.velocity.y * deltaTime
    this.mesh.position.z += this.velocity.z * deltaTime

    // Ground collision
    if (this.mesh.position.y < 0) {
      this.mesh.position.y = 0
      this.velocity.y = 0
      this.isGrounded = true
    } else if (this.mesh.position.y > 0.1) {
      this.isGrounded = false
    }

    // World bounds
    const bound = 95
    this.mesh.position.x = clamp(this.mesh.position.x, -bound, bound)
    this.mesh.position.z = clamp(this.mesh.position.z, -bound, bound)
  }

  /**
   * Move toward a target position
   */
  protected moveToward(targetPos: THREE.Vector3, speed: number, deltaTime: number): void {
    const dx = targetPos.x - this.mesh.position.x
    const dz = targetPos.z - this.mesh.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist > 0.01) {
      const speedMultiplier = this.isFrozen() ? 0.3 : 1
      this.velocity.x = (dx / dist) * speed * speedMultiplier
      this.velocity.z = (dz / dist) * speed * speedMultiplier

      // Face the direction of movement
      const targetAngle = Math.atan2(dx, dz)
      this.smoothRotateTo(targetAngle, deltaTime)
    } else {
      this.velocity.x = 0
      this.velocity.z = 0
    }
  }

  /**
   * Smoothly rotate to face a target angle
   */
  protected smoothRotateTo(targetAngle: number, deltaTime: number): void {
    let diff = targetAngle - this.mesh.rotation.y
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    this.mesh.rotation.y += diff * Math.min(1, deltaTime * 8)
  }

  /**
   * Check if player is within detection range
   */
  protected canDetectPlayer(playerPosition: THREE.Vector3): boolean {
    return isWithinHorizontalDistance(
      this.mesh.position,
      playerPosition,
      this.definition.detectionRange,
    )
  }

  /**
   * Check if player is within attack range
   */
  protected canAttackPlayer(playerPosition: THREE.Vector3): boolean {
    return isWithinHorizontalDistance(
      this.mesh.position,
      playerPosition,
      this.definition.attackRange,
    )
  }

  /**
   * Get distance to player
   */
  protected distanceToPlayer(playerPosition: THREE.Vector3): number {
    return horizontalDistance(this.mesh.position, playerPosition)
  }

  /**
   * Attempt to attack the player
   */
  protected tryAttack(playerPosition: THREE.Vector3): boolean {
    const now = performance.now() / 1000
    if (now - this.instance.lastAttackTime < this.definition.attackCooldown) {
      return false
    }

    if (!this.canAttackPlayer(playerPosition)) {
      return false
    }

    this.instance.lastAttackTime = now

    // Emit attack event
    eventBus.emit(
      GameEventType.ENEMY_DAMAGED, // Reusing - in actual game, this would be a player damage event
      {
        enemyId: this.id,
        damage: this.definition.damage,
        position: this.mesh.position.toArray(),
        target: 'player',
      },
      'Enemy',
    )

    return true
  }

  /**
   * Take damage
   */
  takeDamage(amount: number, damageType: DamageType = DamageType.PHYSICAL, source?: string): number {
    if (!this.isAlive) return 0

    let actualDamage = amount

    // Apply resistance
    if (this.definition.resistances.includes(damageType)) {
      actualDamage *= 0.5
    }
    if (this.definition.immunities.includes(damageType)) {
      actualDamage = 0
    }

    // Apply weakness
    if (this.definition.weaknesses.includes(damageType)) {
      actualDamage *= 1.5
    }

    // Apply defense
    if (damageType === DamageType.PHYSICAL) {
      const mitigation = this.definition.defense / (this.definition.defense + COMBAT_CONFIG.DEFENSE_FORMULA_CONSTANT)
      actualDamage *= 1 - Math.min(mitigation, COMBAT_CONFIG.ARMOR_MITIGATION_CAP)
    }

    actualDamage = Math.max(1, actualDamage)
    this.instance.currentHealth = Math.max(0, this.instance.currentHealth - actualDamage)

    // Trigger hit flash
    this.hitFlashTime = 0.15

    // Update health bar
    this.updateHealthBar()

    eventBus.emit(
      GameEventType.ENEMY_DAMAGED,
      {
        enemyId: this.id,
        damage: actualDamage,
        damageType,
        source,
        remainingHealth: this.instance.currentHealth,
        maxHealth: this.instance.maxHealth,
      },
      'Enemy',
    )

    if (this.instance.currentHealth <= 0) {
      this.die(source)
    }

    return actualDamage
  }

  /**
   * Apply a status effect
   */
  applyStatusEffect(effect: StatusEffect): void {
    if (this.definition.immunities.includes(effect.damageType)) return

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

    // Apply immediate effect
    switch (effect.type) {
      case EffectType.STUN:
        this.stunTimer = Math.max(this.stunTimer, effect.duration)
        break
      case EffectType.FREEZE:
        this.frozenTimer = Math.max(this.frozenTimer, effect.duration)
        break
    }
  }

  /**
   * Apply knockback
   */
  applyKnockback(force: THREE.Vector3, duration: number = 0.2): void {
    this.knockbackVelocity.copy(force)
    this.knockbackTimer = duration
  }

  /**
   * Update status effects
   */
  protected updateStatusEffects(deltaTime: number): void {
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const effect = this.statusEffects[i]
      effect.remainingTime -= deltaTime

      // Tick effects
      if (effect.tickInterval > 0) {
        effect.lastTickTime += deltaTime
        if (effect.lastTickTime >= effect.tickInterval) {
          effect.lastTickTime = 0
          if (effect.type === EffectType.DAMAGE_OVER_TIME) {
            this.takeDamage(effect.magnitude * effect.stacks, effect.damageType, effect.source)
          }
        }
      }

      if (effect.remainingTime <= 0) {
        this.statusEffects.splice(i, 1)
      }
    }

    this.instance.statusEffects = [...this.statusEffects]
  }

  /**
   * Update visual effects (hit flash, etc.)
   */
  protected updateVisualEffects(deltaTime: number): void {
    if (this.hitFlashTime > 0) {
      this.hitFlashTime -= deltaTime
      const flashIntensity = Math.max(0, this.hitFlashTime / 0.15)

      if (this.bodyMaterial) {
        const flashColor = new THREE.Color(0xffffff)
        this.bodyMaterial.color.lerpColors(this.originalColor, flashColor, flashIntensity * 0.8)
        this.bodyMaterial.emissive = new THREE.Color(0xff0000)
        this.bodyMaterial.emissiveIntensity = flashIntensity * 0.5
      }
    } else if (this.bodyMaterial) {
      this.bodyMaterial.color.copy(this.originalColor)
      this.bodyMaterial.emissive = new THREE.Color(0x000000)
      this.bodyMaterial.emissiveIntensity = 0
    }

    // Bobbing animation when idle
    if (this.instance.state === EnemyBehavior.IDLE) {
      this.mesh.position.y = this.spawnPosition.y + Math.sin(this.animationTime * 2) * 0.1
    }
  }

  /**
   * Check if enemy is frozen
   */
  isFrozen(): boolean {
    return this.frozenTimer > 0
  }

  /**
   * Check if enemy is stunned
   */
  isStunned(): boolean {
    return this.stunTimer > 0
  }

  /**
   * Update the health bar
   */
  protected updateHealthBar(): void {
    if (!this.healthBar) return

    const healthPercent = this.instance.currentHealth / this.instance.maxHealth
    // Update the sprite material color based on health
    const material = this.healthBar.material as THREE.SpriteMaterial
    if (healthPercent > 0.5) {
      material.color.setHex(0x00ff00)
    } else if (healthPercent > 0.25) {
      material.color.setHex(0xffff00)
    } else {
      material.color.setHex(0xff0000)
    }

    // Scale bar by health
    this.healthBar.scale.x = Math.max(0.1, healthPercent)
  }

  /**
   * Create a health bar sprite
   */
  protected createHealthBar(): THREE.Sprite {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 8
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, 64, 8)
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(1, 1, 62, 6)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, depthTest: false })
    const sprite = new THREE.Sprite(material)
    sprite.scale.set(2, 0.25, 1)
    sprite.position.y = this.definition.scale + 1
    sprite.renderOrder = 999

    return sprite
  }

  /**
   * Die and clean up
   */
  protected die(source?: string): void {
    this.isAlive = false
    this.instance.state = EnemyBehavior.DEAD

    eventBus.emit(
      GameEventType.ENEMY_DEATH,
      {
        enemyId: this.id,
        definitionId: this.definition.id,
        position: this.mesh.position.toArray(),
        source,
        experience: this.definition.experienceReward,
        gold: this.definition.goldReward,
        isBoss: this.isBoss,
        isElite: this.isElite,
        drops: this.getDrops(),
      },
      'Enemy',
    )

    if (this.isBoss) {
      eventBus.emit(
        GameEventType.BOSS_DEFEATED,
        { bossId: this.definition.id, name: this.definition.name },
        'Enemy',
      )
    }

    // Death animation - fall over
    this.mesh.rotation.z = Math.PI / 2
  }

  /**
   * Get drops from this enemy
   */
  protected getDrops(): string[] {
    if (Math.random() > this.definition.itemDropChance) return []
    return this.definition.possibleDrops.slice(
      0,
      Math.floor(Math.random() * this.definition.possibleDrops.length) + 1,
    )
  }

  /**
   * Check if the enemy should be despawned
   */
  shouldDespawn(playerPosition: THREE.Vector3): boolean {
    return horizontalDistance(this.mesh.position, playerPosition) > ENEMY_SPAWN_CONFIG.DESPAWN_DISTANCE
  }

  /**
   * Get the current state
   */
  getState(): EnemyBehavior {
    return this.instance.state
  }

  /**
   * Set the state
   */
  setState(state: EnemyBehavior): void {
    this.instance.state = state
  }

  /**
   * Get current health percent
   */
  getHealthPercent(): number {
    return this.instance.currentHealth / this.instance.maxHealth
  }

  /**
   * Get the enemy definition
   */
  getDefinition(): EnemyDefinition {
    return { ...this.definition }
  }

  /**
   * Get the enemy instance
   */
  getInstance(): EnemyInstance {
    return { ...this.instance }
  }

  /**
   * Set patrol points for this enemy
   */
  setPatrolPoints(points: THREE.Vector3[]): void {
    this.instance.patrolPoints = points
  }

  /**
   * Get the next patrol point
   */
  protected getNextPatrolPoint(): THREE.Vector3 | null {
    if (!this.instance.patrolPoints || this.instance.patrolPoints.length === 0) {
      return null
    }
    return this.instance.patrolPoints[this.instance.currentPatrolIndex]
  }

  /**
   * Advance to the next patrol point
   */
  protected advancePatrolPoint(): void {
    if (!this.instance.patrolPoints) return
    this.instance.currentPatrolIndex =
      (this.instance.currentPatrolIndex + 1) % this.instance.patrolPoints.length
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material?.dispose()
        }
      }
    })
  }
}
