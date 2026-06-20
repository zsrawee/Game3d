// ===================================================================
// Shooter Enemy - Ranged enemy that attacks from distance
// ===================================================================
// A ranged attacker that keeps its distance from the player and
// fires projectiles. Will retreat if the player gets too close.
// ===================================================================

import * as THREE from 'three'
import { Enemy } from './Enemy'
import { EnemyDefinition, EnemyBehavior, EnemyType, DamageType } from '../types'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'

export const SHOOTER_ENEMY_DEFINITION: EnemyDefinition = {
  id: 'archer',
  name: 'Dark Archer',
  type: EnemyType.SHOOTER,
  health: 60,
  damage: 15,
  defense: 3,
  speed: 3,
  attackRange: 20,
  detectionRange: 25,
  attackCooldown: 1.8,
  experienceReward: 35,
  goldReward: 18,
  itemDropChance: 0.3,
  possibleDrops: ['arrow', 'bow_string', 'health_potion', 'gold_coin'],
  behavior: EnemyBehavior.PATROL,
  abilities: [],
  weaknesses: [],
  resistances: [],
  immunities: [],
  scale: 1,
  color: 0x2a4a3a,
  isElite: false,
  isBoss: false,
}

export class ShooterEnemy extends Enemy {
  private preferredDistance: number = 12
  private projectileSpeed: number = 18
  private aimTime: number = 0
  private isAiming: boolean = false

  constructor(position: THREE.Vector3, isElite: boolean = false) {
    super(SHOOTER_ENEMY_DEFINITION, position, isElite)
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group()
    const scale = this.definition.scale

    // Body (robed figure)
    const bodyGeometry = new THREE.ConeGeometry(0.4 * scale, 1.6 * scale, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.definition.color,
      roughness: 0.7,
      metalness: 0.1,
    })
    this.bodyMaterial = bodyMaterial
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 0.8 * scale
    body.castShadow = true
    body.name = 'body'
    group.add(body)

    // Hood
    const hoodGeometry = new THREE.ConeGeometry(0.35 * scale, 0.6 * scale, 8)
    const hoodMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a2a1a,
      roughness: 0.8,
    })
    const hood = new THREE.Mesh(hoodGeometry, hoodMaterial)
    hood.position.y = 1.7 * scale
    hood.castShadow = true
    hood.name = 'hood'
    group.add(hood)

    // Glowing eyes under hood
    const eyeGeometry = new THREE.SphereGeometry(0.05 * scale, 6, 4)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff80 })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.1 * scale, 1.65 * scale, 0.2 * scale)
    group.add(leftEye)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.1 * scale, 1.65 * scale, 0.2 * scale)
    group.add(rightEye)

    // Bow (held in left arm)
    const bowGeometry = new THREE.TorusGeometry(0.4 * scale, 0.04 * scale, 6, 12, Math.PI)
    const bowMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3a1a,
      roughness: 0.6,
    })
    const bow = new THREE.Mesh(bowGeometry, bowMaterial)
    bow.position.set(0.5 * scale, 1.0 * scale, 0.2 * scale)
    bow.rotation.z = Math.PI / 2
    bow.name = 'bow'
    group.add(bow)

    // Bow string
    const stringGeometry = new THREE.BufferGeometry()
    const stringPositions = new Float32Array([
      0.5 * scale, 1.4 * scale, 0.2 * scale,
      0.5 * scale, 0.6 * scale, 0.2 * scale,
    ])
    stringGeometry.setAttribute('position', new THREE.BufferAttribute(stringPositions, 3))
    const stringMaterial = new THREE.LineBasicMaterial({ color: 0xeeeeee })
    const bowString = new THREE.Line(stringGeometry, stringMaterial)
    group.add(bowString)

    // Right arm (drawn back when aiming)
    const armGeometry = new THREE.BoxGeometry(0.15 * scale, 0.6 * scale, 0.15 * scale)
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a2a,
      roughness: 0.7,
    })
    const rightArm = new THREE.Mesh(armGeometry, armMaterial)
    rightArm.position.set(0.4 * scale, 1.0 * scale, 0)
    rightArm.castShadow = true
    rightArm.name = 'rightArm'
    group.add(rightArm)

    group.userData.rightArm = rightArm
    group.userData.bow = bow
    group.userData.bowString = bowString

    this.healthBar = this.createHealthBar()
    group.add(this.healthBar)

    return group
  }

  updateAI(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (!this.isAlive) return

    const distToPlayer = this.distanceToPlayer(playerPosition)

    // Face the player
    const dx = playerPosition.x - this.mesh.position.x
    const dz = playerPosition.z - this.mesh.position.z
    this.smoothRotateTo(Math.atan2(dx, dz), deltaTime)

    if (this.canDetectPlayer(playerPosition)) {
      if (this.isAiming) {
        // Standing still and aiming
        this.velocity.x = 0
        this.velocity.z = 0
        this.aimTime += deltaTime

        if (this.aimTime > 0.8) {
          // Fire projectile
          this.fireProjectile(playerPosition)
          this.isAiming = false
          this.aimTime = 0
        }
      } else {
        // Position relative to player
        if (distToPlayer < this.preferredDistance - 2) {
          // Too close - retreat
          this.setState(EnemyBehavior.FLEE)
          const fleeDir = new THREE.Vector3(-dx, 0, -dz).normalize()
          this.velocity.x = fleeDir.x * this.definition.speed
          this.velocity.z = fleeDir.z * this.definition.speed
        } else if (distToPlayer > this.preferredDistance + 2) {
          // Too far - approach
          this.setState(EnemyBehavior.CHASE)
          this.moveToward(playerPosition, this.definition.speed * 0.7, deltaTime)
        } else {
          // In range - stop and aim
          this.velocity.x = 0
          this.velocity.z = 0

          const now = performance.now() / 1000
          if (now - this.instance.lastAttackTime > this.definition.attackCooldown) {
            this.isAiming = true
            this.aimTime = 0
            this.setState(EnemyBehavior.ATTACK)
          }
        }
      }
    } else {
      // Wander
      this.setState(EnemyBehavior.PATROL)
      this.isAiming = false
      if (Math.random() < 0.01) {
        const angle = Math.random() * Math.PI * 2
        const target = new THREE.Vector3(
          this.spawnPosition.x + Math.cos(angle) * 5,
          this.spawnPosition.y,
          this.spawnPosition.z + Math.sin(angle) * 5,
        )
        this.moveToward(target, this.definition.speed * 0.4, deltaTime)
      } else {
        this.velocity.x *= 0.9
        this.velocity.z *= 0.9
      }
    }

    this.updateAnimations(deltaTime)
  }

  /**
   * Fire a projectile at the player
   */
  private fireProjectile(targetPosition: THREE.Vector3): void {
    const now = performance.now() / 1000
    this.instance.lastAttackTime = now

    // Calculate direction to player
    const dir = new THREE.Vector3(
      targetPosition.x - this.mesh.position.x,
      targetPosition.y + 1 - this.mesh.position.y - 1,
      targetPosition.z - this.mesh.position.z,
    ).normalize()

    eventBus.emit(
      GameEventType.WEAPON_FIRED,
      {
        source: 'enemy',
        enemyId: this.id,
        type: 'projectile',
        damage: this.definition.damage,
        damageType: DamageType.PHYSICAL,
        position: this.mesh.position.toArray(),
        direction: dir.toArray(),
        speed: this.projectileSpeed,
        range: this.definition.attackRange,
        isEnemy: true,
      },
      'ShooterEnemy',
    )
  }

  private updateAnimations(deltaTime: number): void {
    const rightArm = this.mesh.userData.rightArm as THREE.Mesh
    const bow = this.mesh.userData.bow as THREE.Mesh
    const bowString = this.mesh.userData.bowString as THREE.Line

    if (!rightArm) return

    if (this.isAiming) {
      // Draw bow string back
      const aimProgress = Math.min(1, this.aimTime / 0.8)
      rightArm.position.x = 0.4 * this.definition.scale - aimProgress * 0.3 * this.definition.scale
      rightArm.rotation.y = -aimProgress * 0.5

      // Animate bow string
      if (bowString) {
        const positions = bowString.geometry.attributes.position.array as Float32Array
        positions[3] = 0.5 * this.definition.scale - aimProgress * 0.25 * this.definition.scale
        bowString.geometry.attributes.position.needsUpdate = true
      }
    } else {
      // Reset
      rightArm.position.x = 0.4 * this.definition.scale
      rightArm.rotation.y = 0

      if (bowString) {
        const positions = bowString.geometry.attributes.position.array as Float32Array
        positions[3] = 0.5 * this.definition.scale
        bowString.geometry.attributes.position.needsUpdate = true
      }
    }

    // Walking animation
    if (this.getState() === EnemyBehavior.CHASE || this.getState() === EnemyBehavior.FLEE) {
      const walkCycle = this.animationTime * 8
      const bobAmount = Math.sin(walkCycle) * 0.1
      if (bow) bow.position.y = 1.0 * this.definition.scale + bobAmount
    }
  }
}
