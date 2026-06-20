// ===================================================================
// Fast Enemy - Quick, aggressive chaser enemy
// ===================================================================
// A fast-moving enemy that rushes the player and deals rapid damage.
// Low health but high speed and damage output.
// ===================================================================

import * as THREE from 'three'
import { Enemy } from './Enemy'
import { EnemyDefinition, EnemyBehavior, EnemyType } from '../types'

export const FAST_ENEMY_DEFINITION: EnemyDefinition = {
  id: 'runner',
  name: 'Shadow Runner',
  type: EnemyType.RUNNER,
  health: 45,
  damage: 18,
  defense: 2,
  speed: 7,
  attackRange: 2,
  detectionRange: 20,
  attackCooldown: 0.8,
  experienceReward: 30,
  goldReward: 15,
  itemDropChance: 0.25,
  possibleDrops: ['speed_elixir', 'gold_coin', 'dagger'],
  behavior: EnemyBehavior.CHASE,
  abilities: [],
  weaknesses: [],
  resistances: [],
  immunities: [],
  scale: 0.9,
  color: 0x1a1a2a,
  isElite: false,
  isBoss: false,
}

export class FastEnemy extends Enemy {
  private lungeCooldown: number = 0
  private isLunging: boolean = false
  private lungeTimer: number = 0
  private lungeDirection: THREE.Vector3 = new THREE.Vector3()

  constructor(position: THREE.Vector3, isElite: boolean = false) {
    super(FAST_ENEMY_DEFINITION, position, isElite)
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group()
    const scale = this.definition.scale

    // Sleek body
    const bodyGeometry = new THREE.CapsuleGeometry(0.3 * scale, 0.8 * scale, 4, 8)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.definition.color,
      roughness: 0.3,
      metalness: 0.4,
      emissive: 0x400080,
      emissiveIntensity: 0.3,
    })
    this.bodyMaterial = bodyMaterial
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 1.0 * scale
    body.castShadow = true
    body.name = 'body'
    group.add(body)

    // Head (smaller, more aerodynamic)
    const headGeometry = new THREE.ConeGeometry(0.25 * scale, 0.5 * scale, 8)
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2a,
      roughness: 0.4,
      metalness: 0.5,
      emissive: 0x8000ff,
      emissiveIntensity: 0.5,
    })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 1.8 * scale
    head.rotation.x = Math.PI / 2
    head.castShadow = true
    head.name = 'head'
    group.add(head)

    // Glowing eyes
    const eyeGeometry = new THREE.SphereGeometry(0.08 * scale, 8, 6)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff00ff })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.1 * scale, 1.7 * scale, 0.25 * scale)
    group.add(leftEye)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.1 * scale, 1.7 * scale, 0.25 * scale)
    group.add(rightEye)

    // Arms (thin, claw-like)
    const armGeometry = new THREE.BoxGeometry(0.15 * scale, 0.7 * scale, 0.15 * scale)
    const armMaterial = new THREE.MeshStandardMaterial({
      color: this.definition.color,
      roughness: 0.4,
      metalness: 0.3,
    })

    const leftArm = new THREE.Mesh(armGeometry, armMaterial)
    leftArm.position.set(-0.35 * scale, 1.0 * scale, 0)
    leftArm.castShadow = true
    leftArm.name = 'leftArm'
    group.add(leftArm)

    const rightArm = new THREE.Mesh(armGeometry, armMaterial)
    rightArm.position.set(0.35 * scale, 1.0 * scale, 0)
    rightArm.castShadow = true
    rightArm.name = 'rightArm'
    group.add(rightArm)

    // Legs (thin)
    const legGeometry = new THREE.BoxGeometry(0.18 * scale, 0.7 * scale, 0.18 * scale)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a1a,
      roughness: 0.5,
      metalness: 0.3,
    })

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial)
    leftLeg.position.set(-0.15 * scale, 0.35 * scale, 0)
    leftLeg.castShadow = true
    leftLeg.name = 'leftLeg'
    group.add(leftLeg)

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial)
    rightLeg.position.set(0.15 * scale, 0.35 * scale, 0)
    rightLeg.castShadow = true
    rightLeg.name = 'rightLeg'
    group.add(rightLeg)

    // Trail effect (a plane behind)
    const trailGeometry = new THREE.PlaneGeometry(0.6 * scale, 1.2 * scale)
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })
    const trail = new THREE.Mesh(trailGeometry, trailMaterial)
    trail.position.set(0, 1 * scale, 0.4 * scale)
    trail.name = 'trail'
    group.add(trail)

    group.userData.leftArm = leftArm
    group.userData.rightArm = rightArm
    group.userData.leftLeg = leftLeg
    group.userData.rightLeg = rightLeg
    group.userData.trail = trail

    this.healthBar = this.createHealthBar()
    group.add(this.healthBar)

    return group
  }

  updateAI(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (!this.isAlive) return

    const distToPlayer = this.distanceToPlayer(playerPosition)

    if (this.isLunging) {
      // Lunge attack - move quickly in a straight line
      this.lungeTimer += deltaTime
      const lungeSpeed = 15
      this.velocity.x = this.lungeDirection.x * lungeSpeed
      this.velocity.z = this.lungeDirection.z * lungeSpeed

      // End lunge
      if (this.lungeTimer > 0.4 || distToPlayer < 1.5) {
        this.isLunging = false
        this.lungeTimer = 0
        this.lungeCooldown = 2 + Math.random()

        if (distToPlayer < 2.5) {
          this.tryAttack(playerPosition)
        }
      }
    } else if (this.canDetectPlayer(playerPosition)) {
      // Chase the player
      this.setState(EnemyBehavior.CHASE)
      this.lungeCooldown -= deltaTime

      // Always face the player
      const dx = playerPosition.x - this.mesh.position.x
      const dz = playerPosition.z - this.mesh.position.z
      this.smoothRotateTo(Math.atan2(dx, dz), deltaTime)

      if (distToPlayer > 3 && this.lungeCooldown <= 0) {
        // Lunge toward player
        this.isLunging = true
        this.lungeTimer = 0
        const dir = new THREE.Vector3(dx, 0, dz).normalize()
        this.lungeDirection.copy(dir)
      } else if (distToPlayer > this.definition.attackRange) {
        // Move toward player normally
        this.moveToward(playerPosition, this.definition.speed, deltaTime)
      } else {
        // In attack range
        this.setState(EnemyBehavior.ATTACK)
        this.velocity.x = 0
        this.velocity.z = 0
        this.tryAttack(playerPosition)
      }
    } else {
      // Wander
      this.setState(EnemyBehavior.PATROL)
      if (Math.random() < 0.02) {
        const angle = Math.random() * Math.PI * 2
        const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
        this.velocity.x = dir.x * this.definition.speed * 0.5
        this.velocity.z = dir.z * this.definition.speed * 0.5
      }
    }

    this.updateAnimations(deltaTime)
  }

  private updateAnimations(deltaTime: number): void {
    const leftArm = this.mesh.userData.leftArm as THREE.Mesh
    const rightArm = this.mesh.userData.rightArm as THREE.Mesh
    const leftLeg = this.mesh.userData.leftLeg as THREE.Mesh
    const rightLeg = this.mesh.userData.rightLeg as THREE.Mesh
    const trail = this.mesh.userData.trail as THREE.Mesh

    if (!leftArm || !rightArm) return

    if (this.isLunging) {
      // Lunge pose
      leftArm.rotation.x = -1.5
      rightArm.rotation.x = -1.5
      leftLeg.rotation.x = -0.5
      rightLeg.rotation.x = 0.5

      // Show trail
      if (trail) {
        trail.visible = true
        ;(trail.material as THREE.MeshBasicMaterial).opacity = 0.5
      }
    } else {
      // Hide trail
      if (trail) {
        trail.visible = false
      }

      switch (this.getState()) {
        case EnemyBehavior.CHASE:
          const runCycle = this.animationTime * 16
          leftArm.rotation.x = Math.sin(runCycle) * 0.8
          rightArm.rotation.x = -Math.sin(runCycle) * 0.8
          leftLeg.rotation.x = -Math.sin(runCycle) * 0.8
          rightLeg.rotation.x = Math.sin(runCycle) * 0.8
          break

        case EnemyBehavior.ATTACK:
          leftArm.rotation.x = -1
          rightArm.rotation.x = -1
          break

        case EnemyBehavior.PATROL:
        case EnemyBehavior.IDLE:
          const cycle = this.animationTime * 8
          leftArm.rotation.x = Math.sin(cycle) * 0.3
          rightArm.rotation.x = -Math.sin(cycle) * 0.3
          leftLeg.rotation.x = -Math.sin(cycle) * 0.3
          rightLeg.rotation.x = Math.sin(cycle) * 0.3
          break
      }
    }
  }
}
