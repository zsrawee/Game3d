// ===================================================================
// Projectile System - Manages all projectiles in the world
// ===================================================================
// Handles creation, movement, collision detection, and lifetime
// management for all projectiles (arrows, magic bolts, enemy
// projectiles, etc.). Provides visual representation for each.
// ===================================================================

import * as THREE from 'three'
import { DamageType } from '../types'
import { DAMAGE_TYPE_COLORS } from '../config/GameConfig'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import { EnemyManager } from '../enemies/EnemyManager'
import { clamp } from '../utils/MathUtils'
import { generateId } from '../utils/MathUtils'

export interface ProjectileConfig {
  position: THREE.Vector3
  direction: THREE.Vector3
  speed: number
  damage: number
  damageType: DamageType
  range: number
  source: 'player' | 'enemy'
  sourceId?: string
  knockback?: number
  piercing?: boolean
  maxPierce?: number
  homing?: boolean
  homingStrength?: number
  targetId?: string
  size?: number
  color?: number
  gravity?: number
  lifetime?: number
  onHit?: (target: any) => void
}

interface ActiveProjectile {
  id: string
  mesh: THREE.Object3D
  position: THREE.Vector3
  velocity: THREE.Vector3
  damage: number
  damageType: DamageType
  remainingRange: number
  source: 'player' | 'enemy'
  sourceId?: string
  knockback: number
  piercing: boolean
  pierceCount: number
  maxPierce: number
  homing: boolean
  homingStrength: number
  targetId?: string
  gravity: number
  lifetime: number
  age: number
  hitEnemies: Set<string>
  onHit?: (target: any) => void
  light: THREE.Light | null
  trail: THREE.Mesh | null
  trailPositions: THREE.Vector3[]
}

export class ProjectileSystem {
  public scene: THREE.Scene
  public projectiles: Map<string, ActiveProjectile> = new Map()
  private projectileGroup: THREE.Group
  private enemyManager: EnemyManager | null = null
  private playerPosition: THREE.Vector3 = new THREE.Vector3()
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map()
  private materialCache: Map<string, THREE.Material> = new Map()

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.projectileGroup = new THREE.Group()
    this.projectileGroup.name = 'projectiles'
    this.scene.add(this.projectileGroup)

    // Pre-cache common geometries
    this.geometryCache.set('arrow', new THREE.ConeGeometry(0.1, 0.5, 6))
    this.geometryCache.set('bolt', new THREE.SphereGeometry(0.2, 8, 6))
    this.geometryCache.set('fireball', new THREE.SphereGeometry(0.4, 12, 10))
    this.geometryCache.set('ice', new THREE.OctahedronGeometry(0.3, 0))
    this.geometryCache.set('lightning', new THREE.CylinderGeometry(0.05, 0.15, 1, 6))
    this.geometryCache.set('shadow', new THREE.IcosahedronGeometry(0.3, 0))
    this.geometryCache.set('holy', new THREE.SphereGeometry(0.25, 16, 12))
  }

  /**
   * Set the enemy manager for collision detection
   */
  setEnemyManager(enemyManager: EnemyManager): void {
    this.enemyManager = enemyManager
  }

  /**
   * Set the current player position
   */
  setPlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position)
  }

  /**
   * Spawn a new projectile
   */
  spawnProjectile(config: ProjectileConfig): string {
    const id = generateId('proj_')
    const direction = config.direction.clone().normalize()
    const velocity = direction.clone().multiplyScalar(config.speed)

    // Create mesh based on damage type
    const mesh = this.createProjectileMesh(config.damageType, config.size, config.color)
    mesh.position.copy(config.position)
    mesh.lookAt(config.position.clone().add(direction))

    // Add light for glowing effect
    let light: THREE.PointLight | null = null
    if (config.damageType !== DamageType.PHYSICAL) {
      const color = config.color || DAMAGE_TYPE_COLORS[config.damageType]
      light = new THREE.PointLight(color, 1, 5)
      mesh.add(light)
    }

    // Add trail
    const trail = this.createTrail(config.damageType, config.color)

    const projectile: ActiveProjectile = {
      id,
      mesh,
      position: config.position.clone(),
      velocity,
      damage: config.damage,
      damageType: config.damageType,
      remainingRange: config.range,
      source: config.source,
      sourceId: config.sourceId,
      knockback: config.knockback || 0,
      piercing: config.piercing || false,
      pierceCount: 0,
      maxPierce: config.maxPierce || 0,
      homing: config.homing || false,
      homingStrength: config.homingStrength || 0,
      targetId: config.targetId,
      gravity: config.gravity || 0,
      lifetime: config.lifetime || 10,
      age: 0,
      hitEnemies: new Set(),
      onHit: config.onHit,
      light,
      trail,
      trailPositions: [],
    }

    this.projectiles.set(id, projectile)
    this.projectileGroup.add(mesh)
    if (trail) {
      this.projectileGroup.add(trail)
    }

    return id
  }

  /**
   * Create a projectile mesh based on damage type
   */
  private createProjectileMesh(damageType: DamageType, size?: number, customColor?: number): THREE.Mesh {
    let geometry: THREE.BufferGeometry
    let color: number

    switch (damageType) {
      case DamageType.PHYSICAL:
        geometry = this.geometryCache.get('arrow')!
        color = customColor || 0xcccccc
        break
      case DamageType.FIRE:
        geometry = this.geometryCache.get('fireball')!
        color = customColor || 0xff6020
        break
      case DamageType.ICE:
        geometry = this.geometryCache.get('ice')!
        color = customColor || 0x60c0ff
        break
      case DamageType.LIGHTNING:
        geometry = this.geometryCache.get('lightning')!
        color = customColor || 0xffff40
        break
      case DamageType.POISON:
        geometry = this.geometryCache.get('bolt')!
        color = customColor || 0x80ff40
        break
      case DamageType.HOLY:
        geometry = this.geometryCache.get('holy')!
        color = customColor || 0xfff0c0
        break
      case DamageType.SHADOW:
        geometry = this.geometryCache.get('shadow')!
        color = customColor || 0xa040ff
        break
      case DamageType.TRUE:
        geometry = this.geometryCache.get('bolt')!
        color = customColor || 0xff40ff
        break
      default:
        geometry = this.geometryCache.get('bolt')!
        color = customColor || 0xffffff
    }

    if (size && size !== 1) {
      geometry = geometry.clone()
      geometry.scale(size, size, size)
    }

    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: damageType === DamageType.PHYSICAL ? 0.2 : 0.8,
      roughness: 0.4,
      metalness: 0.3,
    })

    return new THREE.Mesh(geometry, material)
  }

  /**
   * Create a trail effect for a projectile
   */
  private createTrail(damageType: DamageType, customColor?: number): THREE.Mesh | null {
    if (damageType === DamageType.PHYSICAL) return null

    const color = customColor || DAMAGE_TYPE_COLORS[damageType]
    const geometry = new THREE.SphereGeometry(0.2, 6, 4)
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    })
    const trail = new THREE.Mesh(geometry, material)
    trail.visible = false
    return trail
  }

  /**
   * Update all projectiles
   */
  update(deltaTime: number): void {
    const toRemove: string[] = []

    this.projectiles.forEach((projectile, id) => {
      projectile.age += deltaTime

      // Lifetime check
      if (projectile.age > projectile.lifetime) {
        toRemove.push(id)
        return
      }

      // Homing
      if (projectile.homing && this.enemyManager) {
        let target: THREE.Vector3 | null = null
        if (projectile.targetId) {
          const enemy = this.enemyManager.getAllEnemies().find((e) => e.id === projectile.targetId)
          if (enemy && enemy.isAlive) {
            target = enemy.mesh.position
          }
        }
        if (!target) {
          // Find closest enemy
          const closest = this.enemyManager.getClosestEnemy(projectile.position, 15)
          if (closest) {
            target = closest.mesh.position
          }
        }
        if (target) {
          const desiredVel = target.clone().sub(projectile.position).normalize().multiplyScalar(projectile.velocity.length())
          projectile.velocity.lerp(desiredVel, projectile.homingStrength * deltaTime)
        }
      }

      // Apply gravity
      if (projectile.gravity !== 0) {
        projectile.velocity.y += projectile.gravity * deltaTime
      }

      // Move projectile
      const movement = projectile.velocity.clone().multiplyScalar(deltaTime)
      projectile.position.add(movement)
      projectile.mesh.position.copy(projectile.position)

      // Update mesh rotation to face velocity
      if (projectile.velocity.lengthSq() > 0.01) {
        projectile.mesh.lookAt(projectile.position.clone().add(projectile.velocity))
      }

      // Update range
      projectile.remainingRange -= movement.length()
      if (projectile.remainingRange <= 0) {
        toRemove.push(id)
        return
      }

      // Update trail
      if (projectile.trail) {
        projectile.trailPositions.push(projectile.position.clone())
        if (projectile.trailPositions.length > 5) {
          projectile.trailPositions.shift()
        }
        if (projectile.trailPositions.length > 0) {
          projectile.trail.position.copy(projectile.trailPositions[0])
          projectile.trail.visible = true
          const opacity = Math.max(0.05, 0.3 - projectile.age * 0.05)
          ;(projectile.trail.material as THREE.MeshBasicMaterial).opacity = opacity
          const scale = Math.max(0.1, 1 - projectile.age * 0.1)
          projectile.trail.scale.setScalar(scale)
        }
      }

      // Ground collision
      if (projectile.position.y < 0) {
        this.onProjectileHitGround(projectile)
        toRemove.push(id)
        return
      }

      // World bounds
      const bound = 100
      if (
        Math.abs(projectile.position.x) > bound ||
        Math.abs(projectile.position.z) > bound
      ) {
        toRemove.push(id)
        return
      }

      // Enemy collision (player projectiles)
      if (projectile.source === 'player' && this.enemyManager) {
        const hitEnemy = this.checkEnemyCollision(projectile)
        if (hitEnemy) {
          this.onProjectileHitEnemy(projectile, hitEnemy)
          if (!projectile.piercing || projectile.pierceCount >= projectile.maxPierce) {
            toRemove.push(id)
            return
          }
        }
      }

      // Player collision (enemy projectiles)
      if (projectile.source === 'enemy') {
        const distToPlayer = projectile.position.distanceTo(this.playerPosition)
        if (distToPlayer < 1.0) {
          this.onProjectileHitPlayer(projectile)
          toRemove.push(id)
          return
        }
      }
    })

    // Remove expired projectiles
    toRemove.forEach((id) => this.removeProjectile(id))
  }

  /**
   * Check if projectile hit an enemy
   */
  private checkEnemyCollision(projectile: ActiveProjectile): any | null {
    if (!this.enemyManager) return null

    const enemies = this.enemyManager.getAllEnemies()
    for (const enemy of enemies) {
      if (!enemy.isAlive) continue
      if (projectile.hitEnemies.has(enemy.id)) continue

      const dist = projectile.position.distanceTo(enemy.mesh.position)
      if (dist < 1.5) {
        return enemy
      }
    }
    return null
  }

  /**
   * Handle projectile hitting an enemy
   */
  private onProjectileHitEnemy(projectile: ActiveProjectile, enemy: any): void {
    enemy.takeDamage(projectile.damage, projectile.damageType, projectile.sourceId)
    projectile.hitEnemies.add(enemy.id)
    projectile.pierceCount++

    // Apply knockback
    if (projectile.knockback > 0) {
      const dir = projectile.velocity.clone().normalize()
      dir.y = 0.3
      enemy.applyKnockback(dir.multiplyScalar(projectile.knockback))
    }

    // Call onHit callback
    if (projectile.onHit) {
      projectile.onHit(enemy)
    }

    // Emit hit event
    eventBus.emit(
      GameEventType.PROJECTILE_HIT,
      {
        projectileId: projectile.id,
        targetId: enemy.id,
        damage: projectile.damage,
        damageType: projectile.damageType,
        position: projectile.position.toArray(),
      },
      'ProjectileSystem',
    )
  }

  /**
   * Handle projectile hitting the player
   */
  private onProjectileHitPlayer(projectile: ActiveProjectile): void {
    eventBus.emit(
      GameEventType.PLAYER_DAMAGED,
      {
        amount: projectile.damage,
        damageType: projectile.damageType,
        source: projectile.sourceId,
        isProjectile: true,
      },
      'ProjectileSystem',
    )
  }

  /**
   * Handle projectile hitting the ground
   */
  private onProjectileHitGround(projectile: ActiveProjectile): void {
    eventBus.emit(
      GameEventType.PROJECTILE_HIT,
      {
        projectileId: projectile.id,
        target: 'ground',
        position: projectile.position.toArray(),
      },
      'ProjectileSystem',
    )
  }

  /**
   * Remove a projectile
   */
  removeProjectile(id: string): void {
    const projectile = this.projectiles.get(id)
    if (projectile) {
      this.projectileGroup.remove(projectile.mesh)
      if (projectile.trail) {
        this.projectileGroup.remove(projectile.trail)
        projectile.trail.geometry.dispose()
        ;(projectile.trail.material as THREE.Material).dispose()
      }
      projectile.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose())
          } else {
            child.material?.dispose()
          }
        }
      })
      this.projectiles.delete(id)
    }
  }

  /**
   * Get all active projectiles
   */
  getProjectiles(): ActiveProjectile[] {
    return Array.from(this.projectiles.values())
  }

  /**
   * Get projectile count
   */
  getProjectileCount(): number {
    return this.projectiles.size
  }

  /**
   * Clear all projectiles
   */
  clearAll(): void {
    const ids = Array.from(this.projectiles.keys())
    ids.forEach((id) => this.removeProjectile(id))
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearAll()
    this.geometryCache.forEach((geo) => geo.dispose())
    this.materialCache.forEach((mat) => mat.dispose())
    this.geometryCache.clear()
    this.materialCache.clear()
  }
}
