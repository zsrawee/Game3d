// ===================================================================
// Flying Enemy - Airborne enemy that dives at the player
// ===================================================================
// A flying enemy that hovers in the air and dives to attack the
// player. Ignores gravity and can move freely in 3D space.
// ===================================================================

import * as THREE from 'three'
import { Enemy } from './Enemy'
import { EnemyDefinition, EnemyBehavior, EnemyType } from '../types'

export const FLYING_ENEMY_DEFINITION: EnemyDefinition = {
  id: 'bat',
  name: 'Cave Bat',
  type: EnemyType.FLYER,
  health: 50,
  damage: 8,
  defense: 2,
  speed: 5,
  attackRange: 2,
  detectionRange: 18,
  attackCooldown: 1.0,
  experienceReward: 20,
  goldReward: 8,
  itemDropChance: 0.15,
  possibleDrops: ['bat_wing', 'health_potion'],
  behavior: EnemyBehavior.PATROL,
  abilities: [],
  weaknesses: [],
  resistances: [],
  immunities: [],
  scale: 0.7,
  color: 0x4a2a4a,
  isElite: false,
  isBoss: false,
}

export class FlyingEnemy extends Enemy {
  private hoverHeight: number = 5
  private hoverPhase: number = Math.random() * Math.PI * 2
  private diveCooldown: number = 0
  private isDiving: boolean = false
  private diveTimer: number = 0
  private originalY: number = 0

  constructor(position: THREE.Vector3, isElite: boolean = false) {
    super(FLYING_ENEMY_DEFINITION, position, isElite)
    this.hoverHeight = 4 + Math.random() * 4
    this.mesh.position.y = this.hoverHeight
    this.originalY = this.hoverHeight
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group()
    const scale = this.definition.scale

    // Body (small sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.35 * scale, 12, 10)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.definition.color,
      roughness: 0.6,
      metalness: 0.1,
    })
    this.bodyMaterial = bodyMaterial
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.castShadow = true
    body.name = 'body'
    group.add(body)

    // Wings (animated planes)
    const wingGeometry = new THREE.PlaneGeometry(0.8 * scale, 0.4 * scale)
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a1a2a,
      side: THREE.DoubleSide,
      roughness: 0.5,
    })

    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial)
    leftWing.position.x = -0.5 * scale
    leftWing.name = 'leftWing'
    group.add(leftWing)

    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial)
    rightWing.position.x = 0.5 * scale
    rightWing.name = 'rightWing'
    group.add(rightWing)

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05 * scale, 6, 4)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff8000 })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.12 * scale, 0.05 * scale, 0.3 * scale)
    group.add(leftEye)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.12 * scale, 0.05 * scale, 0.3 * scale)
    group.add(rightEye)

    // Fangs
    const fangGeometry = new THREE.ConeGeometry(0.04 * scale, 0.15 * scale, 4)
    const fangMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const leftFang = new THREE.Mesh(fangGeometry, fangMaterial)
    leftFang.position.set(-0.08 * scale, -0.15 * scale, 0.25 * scale)
    leftFang.rotation.x = Math.PI
    group.add(leftFang)
    const rightFang = new THREE.Mesh(fangGeometry, fangMaterial)
    rightFang.position.set(0.08 * scale, -0.15 * scale, 0.25 * scale)
    rightFang.rotation.x = Math.PI
    group.add(rightFang)

    group.userData.leftWing = leftWing
    group.userData.rightWing = rightWing

    this.healthBar = this.createHealthBar()
    this.healthBar.position.y = 0.8
    group.add(this.healthBar)

    return group
  }

  updateAI(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (!this.isAlive) return

    const distToPlayer = this.distanceToPlayer(playerPosition)

    // Disable gravity for flying enemies
    this.velocity.y = 0

    if (this.canDetectPlayer(playerPosition)) {
      if (this.isDiving) {
        // Diving attack
        this.diveTimer += deltaTime
        this.setState(EnemyBehavior.ATTACK)

        // Move directly at player
        const dir = playerPosition.clone().sub(this.mesh.position).normalize()
        const diveSpeed = 12
        this.velocity.x = dir.x * diveSpeed
        this.velocity.y = dir.y * diveSpeed
        this.velocity.z = dir.z * diveSpeed

        // End dive
        if (this.diveTimer > 1.5 || distToPlayer < 1) {
          this.isDiving = false
          this.diveTimer = 0
          this.diveCooldown = 3

          if (distToPlayer < 2.5) {
            this.tryAttack(playerPosition)
          }
        }
      } else {
        // Hovering and chasing
        this.setState(EnemyBehavior.CHASE)
        this.diveCooldown -= deltaTime

        // Move toward player horizontally while maintaining height
        const targetX = playerPosition.x
        const targetZ = playerPosition.z
        const targetY = playerPosition.y + this.hoverHeight

        const dx = targetX - this.mesh.position.x
        const dy = targetY - this.mesh.position.y
        const dz = targetZ - this.mesh.position.z
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist > 0.01) {
          this.velocity.x = (dx / dist) * this.definition.speed
          this.velocity.y = (dy / dist) * this.definition.speed * 0.5
          this.velocity.z = (dz / dist) * this.definition.speed
        }

        // Face the player
        this.smoothRotateTo(Math.atan2(dx, dz), deltaTime)

        // Start dive if close enough and cooldown ready
        if (distToPlayer < 8 && this.diveCooldown <= 0) {
          this.isDiving = true
          this.diveTimer = 0
        }
      }
    } else {
      // Idle hovering
      this.setState(EnemyBehavior.IDLE)
      this.hoverPhase += deltaTime * 2
      this.velocity.x = Math.sin(this.hoverPhase) * 0.5
      this.velocity.z = Math.cos(this.hoverPhase * 0.7) * 0.5

      // Maintain hover height
      const targetY = this.originalY + Math.sin(this.hoverPhase * 1.5) * 0.5
      this.velocity.y = (targetY - this.mesh.position.y) * 2
    }

    // Wing flapping animation
    this.updateWingAnimation()
  }

  private updateWingAnimation(): void {
    const leftWing = this.mesh.userData.leftWing as THREE.Mesh
    const rightWing = this.mesh.userData.rightWing as THREE.Mesh
    if (!leftWing || !rightWing) return

    const flapSpeed = this.isDiving ? 25 : 12
    const flapAmount = this.isDiving ? 1.2 : 0.7
    leftWing.rotation.z = Math.sin(this.animationTime * flapSpeed) * flapAmount
    rightWing.rotation.z = -Math.sin(this.animationTime * flapSpeed) * flapAmount
  }

  protected applyGravity(deltaTime: number): void {
    // Override - flying enemies don't use gravity
  }

  protected applyMovement(deltaTime: number): void {
    // Custom movement - no ground collision
    this.mesh.position.x += this.velocity.x * deltaTime
    this.mesh.position.y += this.velocity.y * deltaTime
    this.mesh.position.z += this.velocity.z * deltaTime

    // Keep above ground
    if (this.mesh.position.y < 0.5) {
      this.mesh.position.y = 0.5
      this.velocity.y = 0
    }

    // World bounds
    const bound = 95
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -bound, bound)
    this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, -bound, bound)
    this.mesh.position.y = THREE.MathUtils.clamp(this.mesh.position.y, 0.5, 30)
  }
}
