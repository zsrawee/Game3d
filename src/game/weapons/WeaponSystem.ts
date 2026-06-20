// ===================================================================
// Weapon System - Manages weapon usage and attacks
// ===================================================================
// Coordinates weapon-based combat: handles melee attacks, ranged
// attacks, and combo systems. Acts as the bridge between player
// input and the damage system.
// ===================================================================

import * as THREE from 'three'
import { Weapon, WeaponType, DamageType } from '../types'
import { getWeapon } from './WeaponsDatabase'
import { ProjectileSystem } from './ProjectileSystem'
import { DamageSystem } from './DamageSystem'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import { Player } from '../player/Player'

export class WeaponSystem {
  public equippedWeapon: Weapon | null = null
  private projectileSystem: ProjectileSystem
  private damageSystem: DamageSystem
  private player: Player | null = null

  private attackCooldown: number = 0
  private comboCount: number = 0
  private comboTimer: number = 0
  private comboResetTime: number = 1.0
  private isAttacking: boolean = false
  private attackAnimTime: number = 0
  private attackDuration: number = 0.4
  private hasHitThisAttack: boolean = false
  private lastAttackTime: number = 0

  constructor(projectileSystem: ProjectileSystem, damageSystem: DamageSystem) {
    this.projectileSystem = projectileSystem
    this.damageSystem = damageSystem
  }

  /**
   * Set the player reference
   */
  setPlayer(player: Player): void {
    this.player = player
  }

  /**
   * Equip a weapon by ID
   */
  equipWeapon(weaponId: string): boolean {
    const weapon = getWeapon(weaponId)
    if (!weapon) return false
    this.equippedWeapon = { ...weapon }
    return true
  }

  /**
   * Equip a weapon object directly
   */
  equipWeaponObject(weapon: Weapon): void {
    this.equippedWeapon = { ...weapon }
  }

  /**
   * Get the equipped weapon
   */
  getEquippedWeapon(): Weapon | null {
    return this.equippedWeapon
  }

  /**
   * Update the weapon system
   */
  update(deltaTime: number): void {
    // Update cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime
    }

    // Update combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime
      if (this.comboTimer <= 0) {
        this.comboCount = 0
      }
    }

    // Update attack animation
    if (this.isAttacking) {
      this.attackAnimTime += deltaTime

      // Check for hit moment in attack animation (when to apply damage)
      if (!this.hasHitThisAttack && this.attackAnimTime >= this.attackDuration * 0.4) {
        this.executeAttackHit()
        this.hasHitThisAttack = true
      }

      if (this.attackAnimTime >= this.attackDuration) {
        this.isAttacking = false
        this.attackAnimTime = 0
      }
    }
  }

  /**
   * Try to perform an attack
   */
  tryAttack(): boolean {
    if (this.attackCooldown > 0 || this.isAttacking) return false
    if (!this.equippedWeapon || !this.player) return false

    // Start attack
    this.isAttacking = true
    this.hasHitThisAttack = false
    this.attackAnimTime = 0
    this.attackDuration = 1 / this.equippedWeapon.attackSpeed
    this.attackCooldown = this.attackDuration * 0.8
    this.comboCount = (this.comboCount + 1) % (this.equippedWeapon.comboCount || 3)
    this.comboTimer = this.comboResetTime
    this.lastAttackTime = performance.now() / 1000

    eventBus.emit(
      GameEventType.WEAPON_FIRED,
      {
        weaponId: this.equippedWeapon.id,
        weaponName: this.equippedWeapon.name,
        weaponType: this.equippedWeapon.weaponType,
        combo: this.comboCount,
        position: this.player.getPosition().toArray(),
      },
      'WeaponSystem',
    )

    return true
  }

  /**
   * Execute the actual hit of the attack
   */
  private executeAttackHit(): void {
    if (!this.equippedWeapon || !this.player) return

    const playerPos = this.player.getPosition()
    const facing = this.player.controller.facing

    switch (this.equippedWeapon.weaponType) {
      case WeaponType.SWORD:
      case WeaponType.DAGGER:
      case WeaponType.HAMMER:
      case WeaponType.SPEAR:
      case WeaponType.SCYTHE:
        this.executeMeleeAttack(playerPos, facing)
        break

      case WeaponType.BOW:
        this.executeRangedAttack(playerPos, facing)
        break

      case WeaponType.STAFF:
        this.executeMagicAttack(playerPos, facing)
        break

      case WeaponType.CHAKRAM:
        this.executeThrownAttack(playerPos, facing)
        break

      default:
        this.executeMeleeAttack(playerPos, facing)
    }
  }

  /**
   * Execute a melee attack
   */
  private executeMeleeAttack(playerPos: THREE.Vector3, facing: THREE.Vector3): void {
    if (!this.equippedWeapon) return

    const weapon = this.equippedWeapon
    const baseDamage = weapon.baseDamage
    const damageType = weapon.elementalDamage && weapon.elementalDamage.length > 0
      ? weapon.elementalDamage[0].type
      : DamageType.PHYSICAL

    // Calculate combo damage bonus
    const comboBonus = 1 + this.comboCount * 0.15
    const totalDamage = baseDamage * comboBonus

    // Apply attack
    const knockback = facing.clone().multiplyScalar(weapon.knockback)
    knockback.y = 2

    this.damageSystem.processPlayerAttack(
      playerPos,
      facing,
      totalDamage,
      weapon.range,
      damageType,
      weapon.knockback,
    )

    // Apply elemental damage
    if (weapon.elementalDamage) {
      weapon.elementalDamage.forEach((elemental) => {
        this.damageSystem.processPlayerAttack(
          playerPos,
          facing,
          elemental.amount * comboBonus,
          weapon.range,
          elemental.type,
          0,
        )
      })
    }
  }

  /**
   * Execute a ranged attack (bow)
   */
  private executeRangedAttack(playerPos: THREE.Vector3, facing: THREE.Vector3): void {
    if (!this.equippedWeapon) return

    const weapon = this.equippedWeapon
    const projectileCount = weapon.projectileCount || 1
    const spread = weapon.spread || 0

    for (let i = 0; i < projectileCount; i++) {
      let direction = facing.clone()

      // Apply spread
      if (spread > 0 && projectileCount > 1) {
        const spreadAngle = (i / (projectileCount - 1) - 0.5) * THREE.MathUtils.degToRad(spread)
        const cos = Math.cos(spreadAngle)
        const sin = Math.sin(spreadAngle)
        direction = new THREE.Vector3(
          direction.x * cos - direction.z * sin,
          0,
          direction.x * sin + direction.z * cos,
        )
      } else if (spread > 0) {
        const randomSpread = (Math.random() - 0.5) * THREE.MathUtils.degToRad(spread)
        const cos = Math.cos(randomSpread)
        const sin = Math.sin(randomSpread)
        direction = new THREE.Vector3(
          direction.x * cos - direction.z * sin,
          0,
          direction.x * sin + direction.z * cos,
        )
      }

      direction.normalize()

      // Spawn position (slightly above player center)
      const spawnPos = playerPos.clone()
      spawnPos.y += 1.2
      spawnPos.add(direction.clone().multiplyScalar(0.5))

      this.projectileSystem.spawnProjectile({
        position: spawnPos,
        direction,
        speed: weapon.projectileSpeed || 25,
        damage: weapon.baseDamage,
        damageType: DamageType.PHYSICAL,
        range: weapon.range,
        source: 'player',
        sourceId: this.player?.id,
        knockback: weapon.knockback,
        size: 1,
      })
    }
  }

  /**
   * Execute a magic attack (staff)
   */
  private executeMagicAttack(playerPos: THREE.Vector3, facing: THREE.Vector3): void {
    if (!this.equippedWeapon) return

    const weapon = this.equippedWeapon
    const damageType = weapon.elementalDamage && weapon.elementalDamage.length > 0
      ? weapon.elementalDamage[0].type
      : DamageType.FIRE
    const elementalDamage = weapon.elementalDamage?.[0]?.amount || 0

    // Spawn position (staff tip)
    const spawnPos = playerPos.clone()
    spawnPos.y += 1.5
    spawnPos.add(facing.clone().multiplyScalar(0.8))

    this.projectileSystem.spawnProjectile({
      position: spawnPos,
      direction: facing.clone(),
      speed: weapon.projectileSpeed || 20,
      damage: weapon.baseDamage + elementalDamage,
      damageType,
      range: weapon.range,
      source: 'player',
      sourceId: this.player?.id,
      knockback: weapon.knockback,
      size: 1.2,
      onHit: (target) => {
        // AoE on hit for magic
        if (target.mesh) {
          this.damageSystem.applyAoEDamage(
            target.mesh.position,
            2,
            weapon.baseDamage * 0.5,
            damageType,
            5,
          )
        }
      },
    })
  }

  /**
   * Execute a thrown weapon attack (chakram)
   */
  private executeThrownAttack(playerPos: THREE.Vector3, facing: THREE.Vector3): void {
    if (!this.equippedWeapon) return

    const weapon = this.equippedWeapon
    const spawnPos = playerPos.clone()
    spawnPos.y += 1.2
    spawnPos.add(facing.clone().multiplyScalar(0.5))

    this.projectileSystem.spawnProjectile({
      position: spawnPos,
      direction: facing.clone(),
      speed: weapon.projectileSpeed || 15,
      damage: weapon.baseDamage,
      damageType: DamageType.PHYSICAL,
      range: weapon.range,
      source: 'player',
      sourceId: this.player?.id,
      knockback: weapon.knockback,
      piercing: true,
      maxPierce: 3,
      size: 1.5,
    })
  }

  /**
   * Check if currently attacking
   */
  getIsAttacking(): boolean {
    return this.isAttacking
  }

  /**
   * Get attack progress (0-1)
   */
  getAttackProgress(): number {
    if (!this.isAttacking) return 1
    return this.attackAnimTime / this.attackDuration
  }

  /**
   * Get combo count
   */
  getComboCount(): number {
    return this.comboCount
  }

  /**
   * Get attack cooldown remaining
   */
  getAttackCooldown(): number {
    return Math.max(0, this.attackCooldown)
  }

  /**
   * Get attack cooldown progress (0-1, 1 = ready)
   */
  getAttackCooldownProgress(): number {
    if (!this.equippedWeapon) return 1
    const maxCooldown = 1 / this.equippedWeapon.attackSpeed * 0.8
    return 1 - this.attackCooldown / maxCooldown
  }

  /**
   * Check if can attack
   */
  canAttack(): boolean {
    return this.attackCooldown <= 0 && !this.isAttacking && this.equippedWeapon !== null
  }

  /**
   * Get weapon damage per hit
   */
  getWeaponDamage(): number {
    if (!this.equippedWeapon) return 0
    let total = this.equippedWeapon.baseDamage
    if (this.equippedWeapon.elementalDamage) {
      this.equippedWeapon.elementalDamage.forEach((e) => {
        total += e.amount
      })
    }
    return total
  }

  /**
   * Get weapon DPS (damage per second)
   */
  getWeaponDPS(): number {
    if (!this.equippedWeapon) return 0
    return this.getWeaponDamage() * this.equippedWeapon.attackSpeed
  }

  /**
   * Repair the equipped weapon
   */
  repairWeapon(amount: number): void {
    if (!this.equippedWeapon) return
    this.equippedWeapon.durability = Math.min(
      this.equippedWeapon.maxDurability,
      this.equippedWeapon.durability + amount,
    )
  }

  /**
   * Upgrade the equipped weapon
   */
  upgradeWeapon(): boolean {
    if (!this.equippedWeapon) return false
    this.equippedWeapon.upgradeLevel++
    this.equippedWeapon.baseDamage = Math.floor(this.equippedWeapon.baseDamage * 1.15)
    this.equippedWeapon.attackSpeed *= 1.05
    return true
  }

  /**
   * Equip a gem to the weapon
   */
  equipGem(gemId: string): boolean {
    if (!this.equippedWeapon) return false
    if (this.equippedWeapon.equippedGems.length >= this.equippedWeapon.gemSlots) return false
    this.equippedWeapon.equippedGems.push(gemId)
    return true
  }

  /**
   * Reset state
   */
  reset(): void {
    this.attackCooldown = 0
    this.comboCount = 0
    this.comboTimer = 0
    this.isAttacking = false
    this.attackAnimTime = 0
    this.hasHitThisAttack = false
  }
}
