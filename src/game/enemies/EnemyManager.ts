// ===================================================================
// Enemy Manager - Spawns, manages, and disposes of all enemies
// ===================================================================
// Handles enemy spawning around the player, lifecycle management,
// and serves as the central registry for all active enemies. Provides
// query methods for the combat system to find enemies to damage.
// ===================================================================

import * as THREE from 'three'
import { Enemy } from './Enemy'
import { GroundEnemy } from './GroundEnemy'
import { FlyingEnemy } from './FlyingEnemy'
import { FastEnemy } from './FastEnemy'
import { TankEnemy } from './TankEnemy'
import { ShooterEnemy } from './ShooterEnemy'
import { BossEnemy, BOSS_DEFINITION } from './BossEnemy'
import { EnemyType, Difficulty, DamageType } from '../types'
import {
  ENEMY_SPAWN_CONFIG,
  DIFFICULTY_MULTIPLIERS,
} from '../config/GameConfig'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import { horizontalDistance } from '../utils/MathUtils'
import { randRange, randInt, randChance, pointInCircle } from '../utils/RandomUtils'

export interface EnemySpawnConfig {
  maxEnemies: number
  spawnInterval: number
  difficulty: Difficulty
  bossEnabled: boolean
  killCountForBoss: number
}

export class EnemyManager {
  public enemies: Map<string, Enemy> = new Map()
  public scene: THREE.Scene
  private spawnTimer: number = 0
  private config: EnemySpawnConfig
  private killCount: number = 0
  private bossSpawned: boolean = false
  private boss: BossEnemy | null = null
  private playerPosition: THREE.Vector3 = new THREE.Vector3()
  private enemyGroup: THREE.Group
  private difficultyMultipliers: typeof DIFFICULTY_MULTIPLIERS[Difficulty]

  constructor(scene: THREE.Scene, config: EnemySpawnConfig) {
    this.scene = scene
    this.config = config
    this.difficultyMultipliers = DIFFICULTY_MULTIPLIERS[config.difficulty]

    // Create a group for all enemies
    this.enemyGroup = new THREE.Group()
    this.enemyGroup.name = 'enemies'
    this.scene.add(this.enemyGroup)

    // Listen for enemy death events
    eventBus.on(GameEventType.ENEMY_DEATH, (event) => {
      this.onEnemyDeath(event.data.enemyId, event.data.experience, event.data.gold)
    })
  }

  /**
   * Update all enemies and handle spawning
   */
  update(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.playerPosition.copy(playerPosition)

    // Spawn timer
    this.spawnTimer -= deltaTime
    if (this.spawnTimer <= 0 && this.enemies.size < this.config.maxEnemies) {
      this.trySpawnEnemy()
      this.spawnTimer = this.config.spawnInterval * (0.5 + Math.random())
    }

    // Check for boss spawn
    if (
      this.config.bossEnabled &&
      !this.bossSpawned &&
      this.killCount >= this.config.killCountForBoss
    ) {
      this.spawnBoss()
    }

    // Update all enemies
    const toRemove: string[] = []
    this.enemies.forEach((enemy) => {
      enemy.update(deltaTime, playerPosition)

      // Check if should despawn
      if (!enemy.isAlive || enemy.shouldDespawn(playerPosition)) {
        toRemove.push(enemy.id)
      }
    })

    // Remove dead/despawned enemies
    toRemove.forEach((id) => {
      this.removeEnemy(id)
    })

    // Update boss
    if (this.boss) {
      this.boss.update(deltaTime, playerPosition)
      if (!this.boss.isAlive) {
        this.boss = null
        this.bossSpawned = false
      }
    }
  }

  /**
   * Try to spawn an enemy near the player
   */
  private trySpawnEnemy(): void {
    if (this.enemies.size >= this.config.maxEnemies) return

    // Determine spawn position
    const angle = Math.random() * Math.PI * 2
    const distance = randRange(
      ENEMY_SPAWN_CONFIG.MIN_SPAWN_DISTANCE,
      ENEMY_SPAWN_CONFIG.MAX_SPAWN_DISTANCE,
    )
    const spawnPos = new THREE.Vector3(
      this.playerPosition.x + Math.cos(angle) * distance,
      0,
      this.playerPosition.z + Math.sin(angle) * distance,
    )

    // Pick enemy type based on player level and difficulty
    const enemyType = this.pickEnemyType()
    const isElite = randChance(this.difficultyMultipliers.enemyHealth > 1.5 ? 0.1 : 0.05)

    // Create enemy
    const enemy = this.createEnemyOfType(enemyType, spawnPos, isElite)
    if (enemy) {
      this.addEnemy(enemy)
    }
  }

  /**
   * Pick an enemy type based on game state
   */
  private pickEnemyType(): EnemyType {
    // Weighted random selection
    const types: EnemyType[] = [
      EnemyType.GRUNT,
      EnemyType.GRUNT,
      EnemyType.GRUNT,
      EnemyType.RUNNER,
      EnemyType.RUNNER,
      EnemyType.FLYER,
      EnemyType.FLYER,
      EnemyType.SHOOTER,
      EnemyType.SHOOTER,
      EnemyType.TANK,
    ]
    return types[Math.floor(Math.random() * types.length)]
  }

  /**
   * Create an enemy of a specific type
   */
  private createEnemyOfType(
    type: EnemyType,
    position: THREE.Vector3,
    isElite: boolean,
  ): Enemy | null {
    let enemy: Enemy | null = null

    switch (type) {
      case EnemyType.GRUNT:
        enemy = new GroundEnemy(position, isElite)
        break
      case EnemyType.RUNNER:
        enemy = new FastEnemy(position, isElite)
        break
      case EnemyType.FLYER:
        enemy = new FlyingEnemy(position, isElite)
        break
      case EnemyType.SHOOTER:
        enemy = new ShooterEnemy(position, isElite)
        break
      case EnemyType.TANK:
        enemy = new TankEnemy(position, isElite)
        break
      case EnemyType.BOSS:
        enemy = new BossEnemy(position)
        break
    }

    // Apply difficulty scaling
    if (enemy) {
      const def = enemy.getDefinition()
      def.health = Math.floor(def.health * this.difficultyMultipliers.enemyHealth)
      def.damage = Math.floor(def.damage * this.difficultyMultipliers.enemyDamage)
      def.speed *= this.difficultyMultipliers.enemySpeed
    }

    return enemy
  }

  /**
   * Add an enemy to the manager
   */
  addEnemy(enemy: Enemy): void {
    this.enemies.set(enemy.id, enemy)
    this.enemyGroup.add(enemy.mesh)

    eventBus.emit(
      GameEventType.ENEMY_SPAWNED,
      {
        enemyId: enemy.id,
        type: enemy.definition.type,
        position: enemy.mesh.position.toArray(),
        isElite: enemy.isElite,
        isBoss: enemy.isBoss,
      },
      'EnemyManager',
    )
  }

  /**
   * Remove an enemy from the manager
   */
  removeEnemy(id: string): void {
    const enemy = this.enemies.get(id)
    if (enemy) {
      this.enemyGroup.remove(enemy.mesh)
      enemy.dispose()
      this.enemies.delete(id)
    }
  }

  /**
   * Spawn the boss
   */
  private spawnBoss(): void {
    if (this.bossSpawned) return

    const angle = Math.random() * Math.PI * 2
    const distance = 30
    const spawnPos = new THREE.Vector3(
      this.playerPosition.x + Math.cos(angle) * distance,
      0,
      this.playerPosition.z + Math.sin(angle) * distance,
    )

    this.boss = new BossEnemy(spawnPos)
    this.enemyGroup.add(this.boss.mesh)
    this.bossSpawned = true

    eventBus.emit(
      GameEventType.ENEMY_SPAWNED,
      {
        enemyId: this.boss.id,
        type: 'boss',
        name: BOSS_DEFINITION.name,
        position: spawnPos.toArray(),
        isBoss: true,
      },
      'EnemyManager',
    )

    eventBus.emit(
      GameEventType.NOTIFICATION,
      {
        type: 'boss_spawn',
        message: `${BOSS_DEFINITION.name} has appeared!`,
        name: BOSS_DEFINITION.name,
      },
      'EnemyManager',
    )
  }

  /**
   * Handle enemy death
   */
  private onEnemyDeath(enemyId: string, experience: number, gold: number): void {
    this.killCount++

    // Emit rewards
    eventBus.emit(
      GameEventType.PLAYER_KILL,
      {
        enemyId,
        experience,
        gold,
        killCount: this.killCount,
      },
      'EnemyManager',
    )
  }

  /**
   * Get all active enemies
   */
  getAllEnemies(): Enemy[] {
    return Array.from(this.enemies.values())
  }

  /**
   * Get enemies within a range of a position
   */
  getEnemiesInRange(position: THREE.Vector3, range: number): Enemy[] {
    const result: Enemy[] = []
    const rangeSq = range * range
    this.enemies.forEach((enemy) => {
      if (!enemy.isAlive) return
      const dx = enemy.mesh.position.x - position.x
      const dy = enemy.mesh.position.y - position.y
      const dz = enemy.mesh.position.z - position.z
      if (dx * dx + dy * dy + dz * dz <= rangeSq) {
        result.push(enemy)
      }
    })

    if (this.boss && this.boss.isAlive) {
      const dx = this.boss.mesh.position.x - position.x
      const dy = this.boss.mesh.position.y - position.y
      const dz = this.boss.mesh.position.z - position.z
      if (dx * dx + dy * dy + dz * dz <= rangeSq) {
        result.push(this.boss)
      }
    }

    return result
  }

  /**
   * Get enemies in a cone (for breath attacks, etc.)
   */
  getEnemiesInCone(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    coneAngleDeg: number,
  ): Enemy[] {
    const result: Enemy[] = []
    const coneAngle = THREE.MathUtils.degToRad(coneAngleDeg)
    const cosConeAngle = Math.cos(coneAngle)
    const rangeSq = range * range

    const horizontalDir = new THREE.Vector3(direction.x, 0, direction.z).normalize()

    this.enemies.forEach((enemy) => {
      if (!enemy.isAlive) return
      const toEnemy = new THREE.Vector3(
        enemy.mesh.position.x - origin.x,
        0,
        enemy.mesh.position.z - origin.z,
      )
      const distSq = toEnemy.lengthSq()
      if (distSq > rangeSq) return

      toEnemy.normalize()
      const dot = toEnemy.dot(horizontalDir)
      if (dot >= cosConeAngle) {
        result.push(enemy)
      }
    })

    return result
  }

  /**
   * Get enemies in a box
   */
  getEnemiesInBox(box: THREE.Box3): Enemy[] {
    const result: Enemy[] = []
    this.enemies.forEach((enemy) => {
      if (!enemy.isAlive) return
      if (box.containsPoint(enemy.mesh.position)) {
        result.push(enemy)
      }
    })

    if (this.boss && this.boss.isAlive && box.containsPoint(this.boss.mesh.position)) {
      result.push(this.boss)
    }

    return result
  }

  /**
   * Get the closest enemy to a position
   */
  getClosestEnemy(position: THREE.Vector3, maxRange: number = Infinity): Enemy | null {
    let closest: Enemy | null = null
    let closestDistSq = maxRange * maxRange

    this.enemies.forEach((enemy) => {
      if (!enemy.isAlive) return
      const dx = enemy.mesh.position.x - position.x
      const dy = enemy.mesh.position.y - position.y
      const dz = enemy.mesh.position.z - position.z
      const distSq = dx * dx + dy * dy + dz * dz
      if (distSq < closestDistSq) {
        closestDistSq = distSq
        closest = enemy
      }
    })

    if (this.boss && this.boss.isAlive) {
      const dx = this.boss.mesh.position.x - position.x
      const dy = this.boss.mesh.position.y - position.y
      const dz = this.boss.mesh.position.z - position.z
      const distSq = dx * dx + dy * dy + dz * dz
      if (distSq < closestDistSq) {
        closest = this.boss
      }
    }

    return closest
  }

  /**
   * Get the current boss
   */
  getBoss(): BossEnemy | null {
    return this.boss
  }

  /**
   * Get the kill count
   */
  getKillCount(): number {
    return this.killCount
  }

  /**
   * Get the number of active enemies
   */
  getEnemyCount(): number {
    return this.enemies.size + (this.boss ? 1 : 0)
  }

  /**
   * Get all enemy meshes (for collision detection)
   */
  getEnemyMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = []
    this.enemies.forEach((enemy) => {
      if (enemy.isAlive) {
        meshes.push(enemy.mesh)
      }
    })
    if (this.boss && this.boss.isAlive) {
      meshes.push(this.boss.mesh)
    }
    return meshes
  }

  /**
   * Apply damage to all enemies in a radius
   */
  damageEnemiesInRadius(
    position: THREE.Vector3,
    radius: number,
    damage: number,
    damageType: DamageType = DamageType.PHYSICAL,
    source?: string,
  ): number {
    const enemies = this.getEnemiesInRange(position, radius)
    let hitCount = 0
    enemies.forEach((enemy) => {
      const dist = enemy.mesh.position.distanceTo(position)
      const falloff = 1 - (dist / radius) * 0.5 // 50% falloff at edge
      enemy.takeDamage(damage * falloff, damageType, source)
      hitCount++
    })
    return hitCount
  }

  /**
   * Apply damage to enemies in a cone
   */
  damageEnemiesInCone(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    coneAngleDeg: number,
    damage: number,
    damageType: DamageType = DamageType.PHYSICAL,
    source?: string,
  ): number {
    const enemies = this.getEnemiesInCone(origin, direction, range, coneAngleDeg)
    let hitCount = 0
    enemies.forEach((enemy) => {
      enemy.takeDamage(damage, damageType, source)
      hitCount++
    })
    return hitCount
  }

  /**
   * Apply damage to enemies in a box
   */
  damageEnemiesInBox(
    box: THREE.Box3,
    damage: number,
    damageType: DamageType = DamageType.PHYSICAL,
    source?: string,
  ): number {
    const enemies = this.getEnemiesInBox(box)
    let hitCount = 0
    enemies.forEach((enemy) => {
      enemy.takeDamage(damage, damageType, source)
      hitCount++
    })
    return hitCount
  }

  /**
   * Apply knockback to enemies in a radius
   */
  knockbackEnemiesInRadius(
    position: THREE.Vector3,
    radius: number,
    force: number,
  ): void {
    const enemies = this.getEnemiesInRange(position, radius)
    enemies.forEach((enemy) => {
      const dir = enemy.mesh.position.clone().sub(position).normalize()
      dir.y = 0.5
      enemy.applyKnockback(dir.multiplyScalar(force))
    })
  }

  /**
   * Apply a status effect to enemies in a radius
   */
  applyStatusToEnemiesInRadius(
    position: THREE.Vector3,
    radius: number,
    effect: any,
  ): void {
    const enemies = this.getEnemiesInRange(position, radius)
    enemies.forEach((enemy) => {
      enemy.applyStatusEffect(effect)
    })
  }

  /**
   * Clear all enemies
   */
  clearAll(): void {
    this.enemies.forEach((_, id) => this.removeEnemy(id))
    if (this.boss) {
      this.enemyGroup.remove(this.boss.mesh)
      this.boss.dispose()
      this.boss = null
    }
    this.bossSpawned = false
    this.killCount = 0
  }

  /**
   * Reset the manager
   */
  reset(): void {
    this.clearAll()
    this.spawnTimer = 0
  }

  /**
   * Update the configuration
   */
  updateConfig(config: Partial<EnemySpawnConfig>): void {
    this.config = { ...this.config, ...config }
    if (config.difficulty) {
      this.difficultyMultipliers = DIFFICULTY_MULTIPLIERS[config.difficulty]
    }
  }

  /**
   * Get the enemy group
   */
  getEnemyGroup(): THREE.Group {
    return this.enemyGroup
  }

  /**
   * Get config
   */
  getConfig(): EnemySpawnConfig {
    return { ...this.config }
  }
}
