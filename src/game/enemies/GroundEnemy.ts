// ===================================================================
// Ground Enemy - Basic patrolling melee enemy
// ===================================================================
// A simple ground-based enemy that patrols an area and attacks
// the player when in range. Serves as the basic enemy type.
// ===================================================================

import * as THREE from 'three'
import { Enemy } from './Enemy'
import { EnemyDefinition, EnemyBehavior, EnemyType } from '../types'
import { ENEMY_SPAWN_CONFIG } from '../config/GameConfig'

export const GROUND_ENEMY_DEFINITION: EnemyDefinition = {
  id: 'grunt',
  name: 'Grunt',
  type: EnemyType.GRUNT,
  health: 80,
  damage: 12,
  defense: 5,
  speed: 3,
  attackRange: 2.5,
  detectionRange: 15,
  attackCooldown: 1.5,
  experienceReward: 25,
  goldReward: 10,
  itemDropChance: 0.2,
  possibleDrops: ['health_potion', 'gold_coin', 'rusty_dagger'],
  behavior: EnemyBehavior.PATROL,
  abilities: [],
  weaknesses: [],
  resistances: [],
  immunities: [],
  scale: 1,
  color: 0x8b4513,
  isElite: false,
  isBoss: false,
}

export class GroundEnemy extends Enemy {
  private patrolTimer: number = 0
  private patrolWaitTime: number = 2
  private isWaiting: boolean = false
  private attackWindup: number = 0

  constructor(position: THREE.Vector3, isElite: boolean = false) {
    super(GROUND_ENEMY_DEFINITION, position, isElite)
  }

  /**
   * Create the visual mesh for the ground enemy
   */
  protected createMesh(): THREE.Group {
    const group = new THREE.Group()
    const scale = this.definition.scale

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.8 * scale, 1.2 * scale, 0.5 * scale)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.definition.color,
      roughness: 0.7,
      metalness: 0.1,
    })
    this.bodyMaterial = bodyMaterial
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 1.0 * scale
    body.castShadow = true
    body.receiveShadow = true
    body.name = 'body'
    group.add(body)

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3 * scale, 12, 10)
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      roughness: 0.8,
    })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 1.9 * scale
    head.castShadow = true
    head.name = 'head'
    group.add(head)

    // Eyes (red glowing)
    const eyeGeometry = new THREE.SphereGeometry(0.06 * scale, 6, 4)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff2020 })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.1 * scale, 1.95 * scale, 0.25 * scale)
    group.add(leftEye)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.1 * scale, 1.95 * scale, 0.25 * scale)
    group.add(rightEye)

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.2 * scale, 0.8 * scale, 0.2 * scale)
    const armMaterial = new THREE.MeshStandardMaterial({
      color: this.definition.color,
      roughness: 0.7,
    })

    const leftArm = new THREE.Mesh(armGeometry, armMaterial)
    leftArm.position.set(-0.5 * scale, 1.0 * scale, 0)
    leftArm.castShadow = true
    leftArm.name = 'leftArm'
    group.add(leftArm)

    const rightArm = new THREE.Mesh(armGeometry, armMaterial)
    rightArm.position.set(0.5 * scale, 1.0 * scale, 0)
    rightArm.castShadow = true
    rightArm.name = 'rightArm'
    group.add(rightArm)

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.25 * scale, 0.7 * scale, 0.25 * scale)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.8,
    })

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial)
    leftLeg.position.set(-0.2 * scale, 0.35 * scale, 0)
    leftLeg.castShadow = true
    leftLeg.name = 'leftLeg'
    group.add(leftLeg)

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial)
    rightLeg.position.set(0.2 * scale, 0.35 * scale, 0)
    rightLeg.castShadow = true
    rightLeg.name = 'rightLeg'
    group.add(rightLeg)

    // Store references for animation
    group.userData.leftArm = leftArm
    group.userData.rightArm = rightArm
    group.userData.leftLeg = leftLeg
    group.userData.rightLeg = rightLeg
    group.userData.body = body

    // Add health bar
    this.healthBar = this.createHealthBar()
    group.add(this.healthBar)

    return group
  }

  /**
   * Update AI behavior
   */
  updateAI(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (!this.isAlive) return

    const distToPlayer = this.distanceToPlayer(playerPosition)
    const now = performance.now() / 1000

    if (this.canDetectPlayer(playerPosition) && distToPlayer < this.definition.detectionRange) {
      // Player detected - switch to chase mode
      this.setState(EnemyBehavior.CHASE)

      if (this.canAttackPlayer(playerPosition)) {
        // In attack range - attack
        this.setState(EnemyBehavior.ATTACK)
        this.velocity.x = 0
        this.velocity.z = 0

        // Face the player
        const dx = playerPosition.x - this.mesh.position.x
        const dz = playerPosition.z - this.mesh.position.z
        this.smoothRotateTo(Math.atan2(dx, dz), deltaTime)

        // Attack if cooldown is ready
        if (now - this.instance.lastAttackTime > this.definition.attackCooldown) {
          this.attackWindup += deltaTime
          if (this.attackWindup > 0.5) {
            this.tryAttack(playerPosition)
            this.attackWindup = 0
          }
        }
      } else {
        // Move toward player
        this.moveToward(playerPosition, this.definition.speed, deltaTime)
        this.attackWindup = 0
      }
    } else {
      // Player not detected - patrol
      this.setState(EnemyBehavior.PATROL)
      this.patrolBehavior(deltaTime)
      this.attackWindup = 0
    }

    // Update animations
    this.updateAnimations(deltaTime)
  }

  /**
   * Patrol behavior - move between random points
   */
  private patrolBehavior(deltaTime: number): void {
    this.patrolTimer += deltaTime

    if (this.isWaiting) {
      this.velocity.x = 0
      this.velocity.z = 0
      if (this.patrolTimer > this.patrolWaitTime) {
        this.isWaiting = false
        this.patrolTimer = 0
        this.patrolWaitTime = 2 + Math.random() * 3
      }
    } else {
      // Pick a random point near spawn
      if (this.patrolTimer === 0 || this.velocity.lengthSq() < 0.01) {
        const angle = Math.random() * Math.PI * 2
        const dist = 3 + Math.random() * 7
        const target = new THREE.Vector3(
          this.spawnPosition.x + Math.cos(angle) * dist,
          this.spawnPosition.y,
          this.spawnPosition.z + Math.sin(angle) * dist,
        )
        this.moveToward(target, this.definition.speed * 0.5, deltaTime)

        // Check if reached
        if (this.distanceToPlayer(target) < 1) {
          this.isWaiting = true
          this.patrolTimer = 0
        }
      }

      // Randomly wait
      if (Math.random() < 0.005) {
        this.isWaiting = true
        this.patrolTimer = 0
      }
    }
  }

  /**
   * Update animations based on state
   */
  private updateAnimations(deltaTime: number): void {
    const leftArm = this.mesh.userData.leftArm as THREE.Mesh
    const rightArm = this.mesh.userData.rightArm as THREE.Mesh
    const leftLeg = this.mesh.userData.leftLeg as THREE.Mesh
    const rightLeg = this.mesh.userData.rightLeg as THREE.Mesh

    if (!leftArm || !rightArm) return

    switch (this.getState()) {
      case EnemyBehavior.IDLE:
      case EnemyBehavior.PATROL:
        if (this.isWaiting) {
          // Idle breathing
          leftArm.rotation.x = Math.sin(this.animationTime * 2) * 0.05
          rightArm.rotation.x = -Math.sin(this.animationTime * 2) * 0.05
        } else {
          // Walking
          const walkCycle = this.animationTime * 6
          leftArm.rotation.x = Math.sin(walkCycle) * 0.4
          rightArm.rotation.x = -Math.sin(walkCycle) * 0.4
          leftLeg.rotation.x = -Math.sin(walkCycle) * 0.4
          rightLeg.rotation.x = Math.sin(walkCycle) * 0.4
        }
        break

      case EnemyBehavior.CHASE:
        const runCycle = this.animationTime * 10
        leftArm.rotation.x = Math.sin(runCycle) * 0.6
        rightArm.rotation.x = -Math.sin(runCycle) * 0.6
        leftLeg.rotation.x = -Math.sin(runCycle) * 0.6
        rightLeg.rotation.x = Math.sin(runCycle) * 0.6
        break

      case EnemyBehavior.ATTACK:
        // Wind up and swing
        const attackProgress = this.attackWindup / 0.5
        rightArm.rotation.x = -Math.sin(attackProgress * Math.PI) * 1.5
        rightArm.rotation.z = Math.sin(attackProgress * Math.PI) * 0.5
        break

      case EnemyBehavior.STUNNED:
        leftArm.rotation.x = -0.5
        rightArm.rotation.x = -0.5
        break

      case EnemyBehavior.DEAD:
        // Already handled by death animation
        break
    }
  }
}
