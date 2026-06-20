// ===================================================================
// Tank Enemy - Heavy, slow, high-health enemy
// ===================================================================
// A slow-moving but very durable enemy that absorbs a lot of damage.
// Has high health and defense but low speed. Deals heavy damage.
// ===================================================================

import * as THREE from 'three'
import { Enemy } from './Enemy'
import { EnemyDefinition, EnemyBehavior, EnemyType } from '../types'

export const TANK_ENEMY_DEFINITION: EnemyDefinition = {
  id: 'tank',
  name: 'Stone Golem',
  type: EnemyType.TANK,
  health: 250,
  damage: 25,
  defense: 20,
  speed: 1.5,
  attackRange: 3,
  detectionRange: 12,
  attackCooldown: 2.5,
  experienceReward: 80,
  goldReward: 40,
  itemDropChance: 0.4,
  possibleDrops: ['stone_chunk', 'health_potion', 'gold_coin', 'armor_plate'],
  behavior: EnemyBehavior.PATROL,
  abilities: [],
  weaknesses: [],
  resistances: [],
  immunities: [],
  scale: 1.8,
  color: 0x606060,
  isElite: false,
  isBoss: false,
}

export class TankEnemy extends Enemy {
  private slamCooldown: number = 0
  private isSlamming: boolean = false
  private slamWindup: number = 0

  constructor(position: THREE.Vector3, isElite: boolean = false) {
    super(TANK_ENEMY_DEFINITION, position, isElite)
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group()
    const scale = this.definition.scale

    // Massive body
    const bodyGeometry = new THREE.BoxGeometry(1.5 * scale, 1.8 * scale, 1.0 * scale)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.definition.color,
      roughness: 0.9,
      metalness: 0.1,
    })
    this.bodyMaterial = bodyMaterial
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 1.3 * scale
    body.castShadow = true
    body.receiveShadow = true
    body.name = 'body'
    group.add(body)

    // Head (large)
    const headGeometry = new THREE.BoxGeometry(1.0 * scale, 0.8 * scale, 0.9 * scale)
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.8,
    })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 2.6 * scale
    head.castShadow = true
    head.name = 'head'
    group.add(head)

    // Glowing eyes
    const eyeGeometry = new THREE.BoxGeometry(0.2 * scale, 0.15 * scale, 0.1 * scale)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff4000 })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.25 * scale, 2.65 * scale, 0.45 * scale)
    group.add(leftEye)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.25 * scale, 2.65 * scale, 0.45 * scale)
    group.add(rightEye)

    // Massive arms
    const armGeometry = new THREE.BoxGeometry(0.5 * scale, 1.5 * scale, 0.5 * scale)
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 0.85,
    })

    const leftArm = new THREE.Mesh(armGeometry, armMaterial)
    leftArm.position.set(-1.0 * scale, 1.3 * scale, 0)
    leftArm.castShadow = true
    leftArm.name = 'leftArm'
    group.add(leftArm)

    const rightArm = new THREE.Mesh(armGeometry, armMaterial)
    rightArm.position.set(1.0 * scale, 1.3 * scale, 0)
    rightArm.castShadow = true
    rightArm.name = 'rightArm'
    group.add(rightArm)

    // Stubby legs
    const legGeometry = new THREE.BoxGeometry(0.7 * scale, 0.8 * scale, 0.7 * scale)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a3a3a,
      roughness: 0.9,
    })

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial)
    leftLeg.position.set(-0.4 * scale, 0.4 * scale, 0)
    leftLeg.castShadow = true
    leftLeg.name = 'leftLeg'
    group.add(leftLeg)

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial)
    rightLeg.position.set(0.4 * scale, 0.4 * scale, 0)
    rightLeg.castShadow = true
    rightLeg.name = 'rightLeg'
    group.add(rightLeg)

    // Crystal growths on back
    for (let i = 0; i < 3; i++) {
      const crystalGeometry = new THREE.ConeGeometry(0.2 * scale, 0.6 * scale, 6)
      const crystalMaterial = new THREE.MeshStandardMaterial({
        color: 0xff6020,
        emissive: 0xff4000,
        emissiveIntensity: 0.5,
        roughness: 0.3,
        metalness: 0.5,
      })
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial)
      crystal.position.set(
        (Math.random() - 0.5) * 0.8 * scale,
        (2.5 + i * 0.3) * scale,
        -0.4 * scale,
      )
      crystal.castShadow = true
      group.add(crystal)
    }

    group.userData.leftArm = leftArm
    group.userData.rightArm = rightArm
    group.userData.leftLeg = leftLeg
    group.userData.rightLeg = rightLeg

    this.healthBar = this.createHealthBar()
    this.healthBar.position.y = 3.2 * scale
    this.healthBar.scale.set(3, 0.4, 1)
    group.add(this.healthBar)

    return group
  }

  updateAI(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (!this.isAlive) return

    const distToPlayer = this.distanceToPlayer(playerPosition)

    if (this.isSlamming) {
      // Slam attack windup
      this.slamWindup += deltaTime
      this.velocity.x = 0
      this.velocity.z = 0

      if (this.slamWindup > 1.0) {
        // Execute slam
        if (distToPlayer < 5) {
          this.tryAttack(playerPosition)
        }
        this.isSlamming = false
        this.slamWindup = 0
        this.slamCooldown = 5
      }
    } else if (this.canDetectPlayer(playerPosition)) {
      this.setState(EnemyBehavior.CHASE)
      this.slamCooldown -= deltaTime

      // Face the player
      const dx = playerPosition.x - this.mesh.position.x
      const dz = playerPosition.z - this.mesh.position.z
      this.smoothRotateTo(Math.atan2(dx, dz), deltaTime)

      if (distToPlayer < 4 && this.slamCooldown <= 0) {
        // Start slam attack
        this.isSlamming = true
        this.slamWindup = 0
        this.setState(EnemyBehavior.ATTACK)
      } else if (distToPlayer > this.definition.attackRange) {
        // Move toward player
        this.moveToward(playerPosition, this.definition.speed, deltaTime)
      } else {
        // In range, attack normally
        this.setState(EnemyBehavior.ATTACK)
        this.tryAttack(playerPosition)
      }
    } else {
      // Patrol slowly
      this.setState(EnemyBehavior.PATROL)
      if (Math.random() < 0.005) {
        const angle = Math.random() * Math.PI * 2
        const target = new THREE.Vector3(
          this.spawnPosition.x + Math.cos(angle) * 5,
          this.spawnPosition.y,
          this.spawnPosition.z + Math.sin(angle) * 5,
        )
        this.moveToward(target, this.definition.speed * 0.3, deltaTime)
      } else {
        this.velocity.x *= 0.9
        this.velocity.z *= 0.9
      }
    }

    this.updateAnimations(deltaTime)
  }

  private updateAnimations(deltaTime: number): void {
    const leftArm = this.mesh.userData.leftArm as THREE.Mesh
    const rightArm = this.mesh.userData.rightArm as THREE.Mesh
    const leftLeg = this.mesh.userData.leftLeg as THREE.Mesh
    const rightLeg = this.mesh.userData.rightLeg as THREE.Mesh

    if (!leftArm || !rightArm) return

    if (this.isSlamming) {
      // Wind up arms above head
      const windupProgress = Math.min(1, this.slamWindup / 1.0)
      leftArm.rotation.x = -Math.PI * windupProgress
      rightArm.rotation.x = -Math.PI * windupProgress
    } else {
      switch (this.getState()) {
        case EnemyBehavior.CHASE:
          const walkCycle = this.animationTime * 3
          leftArm.rotation.x = Math.sin(walkCycle) * 0.2
          rightArm.rotation.x = -Math.sin(walkCycle) * 0.2
          leftLeg.rotation.x = -Math.sin(walkCycle) * 0.2
          rightLeg.rotation.x = Math.sin(walkCycle) * 0.2
          break

        case EnemyBehavior.ATTACK:
          leftArm.rotation.x = -0.5
          rightArm.rotation.x = -0.5
          break

        case EnemyBehavior.PATROL:
        case EnemyBehavior.IDLE:
          leftArm.rotation.x = 0
          rightArm.rotation.x = 0
          // Subtle bobbing
          const bob = Math.sin(this.animationTime * 1.5) * 0.05
          leftLeg.rotation.x = bob
          rightLeg.rotation.x = -bob
          break
      }
    }
  }

  protected applyKnockback(force: THREE.Vector3, duration: number = 0.2): void {
    // Tanks are highly resistant to knockback
    const reducedForce = force.clone().multiplyScalar(0.2)
    super.applyKnockback(reducedForce, duration * 0.5)
  }
}
