// ===================================================================
// Player Controller - Movement, physics, and player input handling
// ===================================================================
// Handles player character movement including walking, running,
// jumping, dashing, gravity, collision detection, and animation
// state transitions. Reads input from the InputManager and applies
// it to the player mesh in the 3D world.
// ===================================================================

import * as THREE from 'three'
import { InputManager } from '../input/InputManager'
import { CameraController } from '../engine/CameraController'
import { PlayerStats } from './PlayerStats'
import {
  AnimationState,
  CombatStance,
} from '../types'
import {
  PLAYER_DEFAULT_HEIGHT,
  PLAYER_DEFAULT_RADIUS,
  PLAYER_GRAVITY,
  PLAYER_DEFAULT_SPEED,
  PLAYER_SPRINT_MULTIPLIER,
  PLAYER_JUMP_FORCE,
  PLAYER_DASH_DISTANCE,
  PLAYER_DASH_COOLDOWN,
  PLAYER_DASH_DURATION,
  PLAYER_DASH_INVINCIBILITY,
  PLAYER_AIR_CONTROL,
  PLAYER_ROTATION_SPEED,
  PLAYER_GROUND_CHECK_DISTANCE,
  PLAYER_KNOCKBACK_RESISTANCE,
} from '../config/GameConfig'
import { clamp, dampAngle, lerp } from '../utils/MathUtils'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'

export interface PlayerControllerConfig {
  speed: number
  sprintMultiplier: number
  jumpForce: number
  gravity: number
  dashDistance: number
  dashCooldown: number
  dashDuration: number
  dashInvincibility: number
  airControl: number
  rotationSpeed: number
  groundCheckDistance: number
  knockbackResistance: number
  height: number
  radius: number
}

export const DEFAULT_PLAYER_CONTROLLER_CONFIG: PlayerControllerConfig = {
  speed: PLAYER_DEFAULT_SPEED,
  sprintMultiplier: PLAYER_SPRINT_MULTIPLIER,
  jumpForce: PLAYER_JUMP_FORCE,
  gravity: PLAYER_GRAVITY,
  dashDistance: PLAYER_DASH_DISTANCE,
  dashCooldown: PLAYER_DASH_COOLDOWN,
  dashDuration: PLAYER_DASH_DURATION,
  dashInvincibility: PLAYER_DASH_INVINCIBILITY,
  airControl: PLAYER_AIR_CONTROL,
  rotationSpeed: PLAYER_ROTATION_SPEED,
  groundCheckDistance: PLAYER_GROUND_CHECK_DISTANCE,
  knockbackResistance: PLAYER_KNOCKBACK_RESISTANCE,
  height: PLAYER_DEFAULT_HEIGHT,
  radius: PLAYER_DEFAULT_RADIUS,
}

export class PlayerController {
  public mesh: THREE.Group
  public stats: PlayerStats
  public velocity: THREE.Vector3 = new THREE.Vector3()
  public facing: THREE.Vector3 = new THREE.Vector3(0, 0, -1)
  public isGrounded: boolean = true
  public isSprinting: boolean = false
  public isDashing: boolean = false
  public isInvincible: boolean = false
  public isAttacking: boolean = false
  public isCasting: boolean = false
  public canMove: boolean = true
  public canJump: boolean = true
  public canDash: boolean = true
  public canAttack: boolean = true
  public animationState: AnimationState = AnimationState.IDLE
  public combatStance: CombatStance = CombatStance.BALANCED

  private inputManager: InputManager
  private cameraController: CameraController
  private config: PlayerControllerConfig
  private groundCheckRay: THREE.Raycaster = new THREE.Raycaster()
  private groundTargets: THREE.Object3D[] = []
  private collisionTargets: THREE.Object3D[] = []

  private dashTimer: number = 0
  private dashCooldownTimer: number = 0
  private dashDirection: THREE.Vector3 = new THREE.Vector3()
  private invincibilityTimer: number = 0
  private attackTimer: number = 0
  private comboCount: number = 0
  private comboTimer: number = 0
  private lastJumpTime: number = 0
  private coyoteTime: number = 0.15
  private coyoteTimer: number = 0
  private jumpBufferTime: number = 0.15
  private jumpBufferTimer: number = 0
  private currentRotation: number = 0
  private targetRotation: number = 0
  private attackHitbox: THREE.Box3 = new THREE.Box3()
  private knockbackVelocity: THREE.Vector3 = new THREE.Vector3()
  private knockbackTimer: number = 0
  private stunTimer: number = 0

  // Animation state
  private bodyMesh: THREE.Mesh | null = null
  private leftArm: THREE.Mesh | null = null
  private rightArm: THREE.Mesh | null = null
  private leftLeg: THREE.Mesh | null = null
  private rightLeg: THREE.Mesh | null = null
  private animationTime: number = 0
  private attackAnimProgress: number = 0

  constructor(
    inputManager: InputManager,
    cameraController: CameraController,
    stats: PlayerStats,
    config: PlayerControllerConfig = DEFAULT_PLAYER_CONTROLLER_CONFIG,
  ) {
    this.inputManager = inputManager
    this.cameraController = cameraController
    this.stats = stats
    this.config = { ...config }

    // Create player mesh
    this.mesh = this.createPlayerMesh()
  }

  /**
   * Create the player visual mesh (a simple humanoid character)
   */
  private createPlayerMesh(): THREE.Group {
    const group = new THREE.Group()
    group.name = 'player'

    // Body (torso)
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.2, 0.5)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      roughness: 0.6,
      metalness: 0.1,
    })
    this.bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial)
    this.bodyMesh.position.y = 1.0
    this.bodyMesh.castShadow = true
    this.bodyMesh.receiveShadow = true
    group.add(this.bodyMesh)

    // Head
    const headGeometry = new THREE.SphereGeometry(0.35, 16, 12)
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xfdd9b5,
      roughness: 0.7,
    })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.y = 1.95
    head.castShadow = true
    head.name = 'head'
    group.add(head)

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 6)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.12, 1.98, 0.3)
    group.add(leftEye)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.12, 1.98, 0.3)
    group.add(rightEye)

    // Arms
    const armGeometry = new THREE.BoxGeometry(0.25, 0.9, 0.25)
    const armMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a90e2,
      roughness: 0.6,
    })

    this.leftArm = new THREE.Mesh(armGeometry, armMaterial)
    this.leftArm.position.set(-0.55, 1.05, 0)
    this.leftArm.castShadow = true
    this.leftArm.name = 'leftArm'
    // Offset pivot so arm rotates from shoulder
    this.leftArm.geometry.translate(0, -0.45, 0)
    this.leftArm.position.y = 1.5
    group.add(this.leftArm)

    this.rightArm = new THREE.Mesh(armGeometry, armMaterial)
    this.rightArm.position.set(0.55, 1.05, 0)
    this.rightArm.castShadow = true
    this.rightArm.name = 'rightArm'
    this.rightArm.geometry.translate(0, -0.45, 0)
    this.rightArm.position.y = 1.5
    group.add(this.rightArm)

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.3, 0.85, 0.3)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a3a5a,
      roughness: 0.7,
    })

    this.leftLeg = new THREE.Mesh(legGeometry, legMaterial)
    this.leftLeg.position.set(-0.22, 0.42, 0)
    this.leftLeg.castShadow = true
    this.leftLeg.name = 'leftLeg'
    this.leftLeg.geometry.translate(0, -0.42, 0)
    this.leftLeg.position.y = 0.85
    group.add(this.leftLeg)

    this.rightLeg = new THREE.Mesh(legGeometry, legMaterial)
    this.rightLeg.position.set(0.22, 0.42, 0)
    this.rightLeg.castShadow = true
    this.rightLeg.name = 'rightLeg'
    this.rightLeg.geometry.translate(0, -0.42, 0)
    this.rightLeg.position.y = 0.85
    group.add(this.rightLeg)

    // Cape (optional decoration)
    const capeGeometry = new THREE.PlaneGeometry(0.9, 1.2)
    const capeMaterial = new THREE.MeshStandardMaterial({
      color: 0xc04040,
      side: THREE.DoubleSide,
      roughness: 0.8,
    })
    const cape = new THREE.Mesh(capeGeometry, capeMaterial)
    cape.position.set(0, 1.0, -0.3)
    cape.rotation.x = 0.1
    cape.name = 'cape'
    cape.castShadow = true
    group.add(cape)

    // Store user data
    group.userData.controller = this
    group.userData.forward = new THREE.Vector3(0, 0, -1)

    return group
  }

  /**
   * Set the player position
   */
  setPosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z)
  }

  /**
   * Get the player position
   */
  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone()
  }

  /**
   * Set the ground targets for ground detection
   */
  setGroundTargets(targets: THREE.Object3D[]): void {
    this.groundTargets = targets
  }

  /**
   * Set collision targets
   */
  setCollisionTargets(targets: THREE.Object3D[]): void {
    this.collisionTargets = targets
  }

  /**
   * Update the player controller
   */
  update(deltaTime: number): void {
    if (this.stats.getIsDead()) {
      this.animationState = AnimationState.DEATH
      this.updateAnimations(deltaTime)
      return
    }

    // Update timers
    this.updateTimers(deltaTime)

    // Apply knockback
    if (this.knockbackTimer > 0) {
      this.applyKnockback(deltaTime)
    } else if (this.stunTimer > 0) {
      // Stunned - can't act
      this.animationState = AnimationState.DAMAGED
    } else {
      // Process input
      this.handleInput(deltaTime)
    }

    // Apply gravity
    this.applyGravity(deltaTime)

    // Apply movement
    this.applyMovement(deltaTime)

    // Ground check
    this.checkGrounded()

    // Update facing direction
    this.updateFacing(deltaTime)

    // Update animations
    this.updateAnimations(deltaTime)

    // Update combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime
      if (this.comboTimer <= 0) {
        this.comboCount = 0
      }
    }
  }

  /**
   * Update all timers
   */
  private updateTimers(deltaTime: number): void {
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= deltaTime
      if (this.dashCooldownTimer <= 0) {
        this.canDash = true
      }
    }

    if (this.invincibilityTimer > 0) {
      this.invincibilityTimer -= deltaTime
      if (this.invincibilityTimer <= 0) {
        this.isInvincible = false
      }
    }

    if (this.attackTimer > 0) {
      this.attackTimer -= deltaTime
      if (this.attackTimer <= 0) {
        this.isAttacking = false
        this.canAttack = true
      }
    }

    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= deltaTime
    }

    if (this.stunTimer > 0) {
      this.stunTimer -= deltaTime
    }

    if (this.isDashing) {
      this.dashTimer -= deltaTime
      if (this.dashTimer <= 0) {
        this.isDashing = false
      }
    }

    if (this.coyoteTimer > 0) {
      this.coyoteTimer -= deltaTime
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer -= deltaTime
      if (this.jumpBufferTimer <= 0 && this.isGrounded) {
        this.jump()
      }
    }
  }

  /**
   * Handle player input
   */
  private handleInput(deltaTime: number): void {
    if (!this.canMove || this.isDashing) return

    // Get input direction from joystick or keyboard
    const inputDir = this.getInputDirection()
    const isMoving = inputDir.lengthSq() > 0.01

    // Check for sprint
    this.isSprinting = this.inputManager.getKey('shift') && isMoving

    // Calculate movement speed
    const speed = this.stats.getStats().speed
    const sprintMultiplier = this.isSprinting ? this.config.sprintMultiplier : 1
    const moveSpeed = speed * sprintMultiplier

    // Calculate movement direction relative to camera
    const moveDir = this.calculateMovementDirection(inputDir)

    // Apply movement
    if (isMoving && !this.isAttacking) {
      this.velocity.x = moveDir.x * moveSpeed
      this.velocity.z = moveDir.z * moveSpeed

      // Update target rotation to face movement direction
      if (moveDir.lengthSq() > 0.01) {
        this.targetRotation = Math.atan2(moveDir.x, moveDir.z)
      }

      // Update animation state
      if (this.isGrounded) {
        this.animationState = this.isSprinting ? AnimationState.RUNNING : AnimationState.WALKING
      }
    } else {
      // Decelerate when no input
      this.velocity.x *= 0.85
      this.velocity.z *= 0.85

      if (this.isGrounded && !this.isAttacking) {
        this.animationState = AnimationState.IDLE
      }
    }

    // Handle jump
    if (this.inputManager.wasActionButtonPressed('jump') || this.inputManager.wasKeyPressed(' ')) {
      if (this.isGrounded || this.coyoteTimer > 0) {
        this.jump()
      } else {
        // Buffer the jump
        this.jumpBufferTimer = this.jumpBufferTime
      }
    }

    // Handle dash
    if (this.inputManager.wasActionButtonPressed('dash') || this.inputManager.wasKeyPressed('q')) {
      this.tryDash(moveDir)
    }

    // Handle attack
    if (this.inputManager.wasActionButtonPressed('attack') || this.inputManager.wasKeyPressed('f')) {
      this.tryAttack()
    }

    // Handle special ability
    if (this.inputManager.wasActionButtonPressed('special') || this.inputManager.wasKeyPressed('e')) {
      this.trySpecialAbility()
    }
  }

  /**
   * Get input direction from joystick or keyboard
   */
  private getInputDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3()

    // Joystick input
    if (this.inputManager.isJoystickActive()) {
      const joystick = this.inputManager.getJoystick()
      dir.x = joystick.direction.x
      dir.z = joystick.direction.y
    }

    // Keyboard input (additive with joystick)
    if (this.inputManager.getKey('w') || this.inputManager.getKey('arrowup')) {
      dir.z -= 1
    }
    if (this.inputManager.getKey('s') || this.inputManager.getKey('arrowdown')) {
      dir.z += 1
    }
    if (this.inputManager.getKey('a') || this.inputManager.getKey('arrowleft')) {
      dir.x -= 1
    }
    if (this.inputManager.getKey('d') || this.inputManager.getKey('arrowright')) {
      dir.x += 1
    }

    // Normalize
    if (dir.lengthSq() > 1) {
      dir.normalize()
    }

    return dir
  }

  /**
   * Calculate movement direction relative to camera
   */
  private calculateMovementDirection(inputDir: THREE.Vector3): THREE.Vector3 {
    if (inputDir.lengthSq() < 0.01) return new THREE.Vector3()

    const cameraForward = this.cameraController.getForwardDirection()
    const cameraRight = this.cameraController.getRightDirection()

    const moveDir = new THREE.Vector3()
    moveDir.addScaledVector(cameraForward, -inputDir.z)
    moveDir.addScaledVector(cameraRight, inputDir.x)
    moveDir.y = 0

    if (moveDir.lengthSq() > 0.01) {
      moveDir.normalize()
    }

    return moveDir
  }

  /**
   * Make the player jump
   */
  private jump(): void {
    if (!this.canJump || !this.isGrounded) return

    this.velocity.y = this.config.jumpForce
    this.isGrounded = false
    this.animationState = AnimationState.JUMPING
    this.coyoteTimer = 0
    this.jumpBufferTimer = 0
    this.lastJumpTime = performance.now() / 1000

    eventBus.emit(
      GameEventType.ABILITY_USED,
      { ability: 'jump', position: this.mesh.position.toArray() },
      'PlayerController',
    )
  }

  /**
   * Try to perform a dash
   */
  private tryDash(direction: THREE.Vector3): void {
    if (!this.canDash || this.dashCooldownTimer > 0) return

    // Use stamina
    const staminaCost = 25
    if (!this.stats.useStamina(staminaCost)) return

    // Determine dash direction
    if (direction.lengthSq() < 0.01) {
      // Dash forward if no direction input
      direction.copy(this.facing)
    }

    this.dashDirection.copy(direction)
    this.isDashing = true
    this.isInvincible = true
    this.canDash = false
    this.dashTimer = this.config.dashDuration
    this.dashCooldownTimer = this.config.dashCooldown
    this.invincibilityTimer = this.config.dashInvincibility
    this.animationState = AnimationState.DASHING

    eventBus.emit(
      GameEventType.ABILITY_USED,
      {
        ability: 'dash',
        direction: direction.toArray(),
        position: this.mesh.position.toArray(),
      },
      'PlayerController',
    )
  }

  /**
   * Try to perform an attack
   */
  private tryAttack(): void {
    if (!this.canAttack || this.isAttacking) return

    this.isAttacking = true
    this.canAttack = false
    this.attackTimer = 0.4 // Attack animation duration
    this.attackAnimProgress = 0
    this.comboCount = (this.comboCount + 1) % 4
    this.comboTimer = 1.0
    this.animationState = AnimationState.ATTACKING

    eventBus.emit(
      GameEventType.WEAPON_FIRED,
      {
        type: 'melee',
        combo: this.comboCount,
        position: this.mesh.position.toArray(),
      },
      'PlayerController',
    )
  }

  /**
   * Try to use the special ability
   */
  private trySpecialAbility(): void {
    if (!this.canAttack || this.isAttacking) return

    const manaCost = 30
    if (!this.stats.useMana(manaCost)) return

    this.isCasting = true
    this.isAttacking = true
    this.canAttack = false
    this.attackTimer = 0.6
    this.attackAnimProgress = 0
    this.animationState = AnimationState.CASTING

    eventBus.emit(
      GameEventType.ABILITY_USED,
      {
        ability: 'special',
        position: this.mesh.position.toArray(),
        manaCost,
      },
      'PlayerController',
    )
  }

  /**
   * Apply gravity to the player
   */
  private applyGravity(deltaTime: number): void {
    if (this.isGrounded && this.velocity.y <= 0) {
      this.velocity.y = 0
      return
    }

    this.velocity.y += this.config.gravity * deltaTime

    // Clamp fall speed
    if (this.velocity.y < -30) {
      this.velocity.y = -30
    }

    if (!this.isGrounded && this.velocity.y < 0) {
      this.animationState = AnimationState.FALLING
    }
  }

  /**
   * Apply movement and handle collisions
   */
  private applyMovement(deltaTime: number): void {
    let moveX: number
    let moveY: number
    let moveZ: number

    if (this.isDashing) {
      // Dash movement
      const dashSpeed = this.config.dashDistance / this.config.dashDuration
      moveX = this.dashDirection.x * dashSpeed * deltaTime
      moveY = 0
      moveZ = this.dashDirection.z * dashSpeed * deltaTime
    } else {
      moveX = this.velocity.x * deltaTime
      moveY = this.velocity.y * deltaTime
      moveZ = this.velocity.z * deltaTime
    }

    // Apply knockback
    if (this.knockbackTimer > 0) {
      const knockbackFactor = this.knockbackTimer / 0.2 // Total knockback duration
      moveX += this.knockbackVelocity.x * knockbackFactor * deltaTime
      moveY += this.knockbackVelocity.y * knockbackFactor * deltaTime
      moveZ += this.knockbackVelocity.z * knockbackFactor * deltaTime
    }

    // Try moving on each axis separately (for wall sliding)
    this.tryMove(moveX, 0, 0)
    this.tryMove(0, moveY, 0)
    this.tryMove(0, 0, moveZ)

    // World border clamp
    this.clampToWorldBounds()
  }

  /**
   * Try to move the player by a delta, checking for collisions
   */
  private tryMove(dx: number, dy: number, dz: number): void {
    const oldPos = this.mesh.position.clone()
    this.mesh.position.x += dx
    this.mesh.position.y += dy
    this.mesh.position.z += dz

    // Check ground collision (don't fall through floor)
    if (dy < 0 && this.mesh.position.y < 0) {
      this.mesh.position.y = 0
      this.velocity.y = 0
      if (!this.isGrounded) {
        this.onLand()
      }
      this.isGrounded = true
    }

    // Check object collisions (basic AABB)
    if (this.collisionTargets.length > 0) {
      const playerBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(this.mesh.position.x, this.mesh.position.y + 1, this.mesh.position.z),
        new THREE.Vector3(this.config.radius * 2, this.config.height, this.config.radius * 2),
      )

      for (const target of this.collisionTargets) {
        const targetBox = new THREE.Box3().setFromObject(target)
        if (playerBox.intersectsBox(targetBox)) {
          // Revert this axis movement
          this.mesh.position.copy(oldPos)
          return
        }
      }
    }
  }

  /**
   * Called when the player lands on the ground
   */
  private onLand(): void {
    this.animationState = AnimationState.LANDING

    // Apply coyote time grace period for next jump
    this.coyoteTimer = this.coyoteTime

    // Reset dash if we were dashing
    if (this.isDashing) {
      this.isDashing = false
    }

    eventBus.emit(
      GameEventType.NOTIFICATION,
      { event: 'landed', position: this.mesh.position.toArray() },
      'PlayerController',
    )
  }

  /**
   * Check if the player is grounded
   */
  private checkGrounded(): void {
    if (this.mesh.position.y <= 0.01) {
      this.isGrounded = true
      return
    }

    // Raycast downward
    const origin = new THREE.Vector3(
      this.mesh.position.x,
      this.mesh.position.y + 0.1,
      this.mesh.position.z,
    )
    this.groundCheckRay.set(origin, new THREE.Vector3(0, -1, 0))
    this.groundCheckRay.far = this.config.groundCheckDistance + 0.1

    if (this.groundTargets.length > 0) {
      const intersects = this.groundCheckRay.intersectObjects(this.groundTargets, true)
      if (intersects.length > 0 && intersects[0].distance <= this.config.groundCheckDistance + 0.1) {
        if (!this.isGrounded && this.velocity.y <= 0) {
          this.onLand()
        }
        this.isGrounded = true
        this.mesh.position.y = intersects[0].point.y
        this.velocity.y = 0
        return
      }
    }

    // Was grounded but no longer
    if (this.isGrounded && this.velocity.y > 0.01) {
      this.isGrounded = false
      this.coyoteTimer = this.coyoteTime
    } else if (this.isGrounded) {
      this.isGrounded = false
      this.coyoteTimer = this.coyoteTime
    }
  }

  /**
   * Update the player's facing direction
   */
  private updateFacing(deltaTime: number): void {
    // Smooth rotation
    this.currentRotation = dampAngle(
      this.currentRotation,
      this.targetRotation,
      this.config.rotationSpeed,
      deltaTime,
    )
    this.mesh.rotation.y = this.currentRotation

    // Update facing vector
    this.facing.set(
      Math.sin(this.currentRotation),
      0,
      Math.cos(this.currentRotation),
    )

    // Update the user data forward direction for camera reset
    this.mesh.userData.forward = this.facing.clone()
  }

  /**
   * Update player animations based on state
   */
  private updateAnimations(deltaTime: number): void {
    this.animationTime += deltaTime

    if (!this.leftArm || !this.rightArm || !this.leftLeg || !this.rightLeg) return

    switch (this.animationState) {
      case AnimationState.IDLE:
        // Subtle breathing
        const breath = Math.sin(this.animationTime * 2) * 0.05
        if (this.bodyMesh) this.bodyMesh.position.y = 1.0 + breath
        this.leftArm.rotation.x = 0
        this.rightArm.rotation.x = 0
        this.leftLeg.rotation.x = 0
        this.rightLeg.rotation.x = 0
        break

      case AnimationState.WALKING:
        const walkCycle = this.animationTime * 8
        this.leftArm.rotation.x = Math.sin(walkCycle) * 0.5
        this.rightArm.rotation.x = -Math.sin(walkCycle) * 0.5
        this.leftLeg.rotation.x = -Math.sin(walkCycle) * 0.5
        this.rightLeg.rotation.x = Math.sin(walkCycle) * 0.5
        break

      case AnimationState.RUNNING:
        const runCycle = this.animationTime * 14
        this.leftArm.rotation.x = Math.sin(runCycle) * 0.8
        this.rightArm.rotation.x = -Math.sin(runCycle) * 0.8
        this.leftLeg.rotation.x = -Math.sin(runCycle) * 0.9
        this.rightLeg.rotation.x = Math.sin(runCycle) * 0.9
        break

      case AnimationState.JUMPING:
        this.leftArm.rotation.x = -0.8
        this.rightArm.rotation.x = -0.8
        this.leftLeg.rotation.x = 0.3
        this.rightLeg.rotation.x = 0.3
        break

      case AnimationState.FALLING:
        this.leftArm.rotation.x = -1.2
        this.rightArm.rotation.x = -1.2
        this.leftLeg.rotation.x = -0.3
        this.rightLeg.rotation.x = -0.3
        break

      case AnimationState.ATTACKING:
        this.attackAnimProgress += deltaTime * 3
        const swingT = clamp(this.attackAnimProgress, 0, 1)
        this.rightArm.rotation.x = lerp(-1.5, 0.5, swingT)
        this.rightArm.rotation.z = lerp(-0.5, 0.3, swingT)
        this.leftArm.rotation.x = 0.2
        break

      case AnimationState.CASTING:
        this.attackAnimProgress += deltaTime * 2
        const castT = clamp(this.attackAnimProgress, 0, 1)
        this.leftArm.rotation.x = lerp(-0.5, -1.5, castT)
        this.rightArm.rotation.x = lerp(-0.5, -1.5, castT)
        this.leftArm.rotation.z = -0.3
        this.rightArm.rotation.z = 0.3
        break

      case AnimationState.DASHING:
        this.leftArm.rotation.x = -1.5
        this.rightArm.rotation.x = -1.5
        this.leftLeg.rotation.x = -0.8
        this.rightLeg.rotation.x = -0.8
        break

      case AnimationState.LANDING:
        this.leftLeg.rotation.x = -0.4
        this.rightLeg.rotation.x = -0.4
        this.leftArm.rotation.x = 0.4
        this.rightArm.rotation.x = 0.4
        break

      case AnimationState.DAMAGED:
        this.leftArm.rotation.x = -0.5
        this.rightArm.rotation.x = -0.5
        if (this.bodyMesh) this.bodyMesh.rotation.z = Math.sin(this.animationTime * 20) * 0.1
        break

      case AnimationState.DEATH:
        this.mesh.rotation.x = lerp(this.mesh.rotation.x, -Math.PI / 2, deltaTime * 3)
        break
    }

    // Reset body rotation if not damaged
    if (this.animationState !== AnimationState.DAMAGED && this.bodyMesh) {
      this.bodyMesh.rotation.z = lerp(this.bodyMesh.rotation.z, 0, deltaTime * 5)
    }
  }

  /**
   * Clamp the player to world bounds
   */
  private clampToWorldBounds(): void {
    const bound = 95
    this.mesh.position.x = clamp(this.mesh.position.x, -bound, bound)
    this.mesh.position.z = clamp(this.mesh.position.z, -bound, bound)
  }

  /**
   * Apply knockback to the player
   */
  applyKnockback(force: THREE.Vector3, duration: number = 0.2): void {
    if (this.isInvincible) return

    const resistance = 1 - this.config.knockbackResistance
    this.knockbackVelocity.copy(force).multiplyScalar(resistance)
    this.knockbackTimer = duration
    this.animationState = AnimationState.DAMAGED
  }

  /**
   * Apply stun to the player
   */
  applyStun(duration: number): void {
    this.stunTimer = duration
    this.animationState = AnimationState.DAMAGED
  }

  /**
   * Update knockback movement
   */
  private applyKnockback(deltaTime: number): void {
    // Knockback is applied in applyMovement
  }

  /**
   * Get the attack hitbox for this frame
   */
  getAttackHitbox(): THREE.Box3 {
    const center = this.mesh.position.clone()
    center.add(this.facing.clone().multiplyScalar(1.5))
    center.y += 1

    this.attackHitbox.setFromCenterAndSize(
      center,
      new THREE.Vector3(2, 2, 2),
    )
    return this.attackHitbox
  }

  /**
   * Check if player is currently attacking and the attack is active
   */
  isAttackActive(): boolean {
    return this.isAttacking && this.attackAnimProgress > 0.2 && this.attackAnimProgress < 0.7
  }

  /**
   * Get combo count
   */
  getComboCount(): number {
    return this.comboCount
  }

  /**
   * Reset the player to a fresh state
   */
  reset(): void {
    this.velocity.set(0, 0, 0)
    this.knockbackVelocity.set(0, 0, 0)
    this.knockbackTimer = 0
    this.stunTimer = 0
    this.dashTimer = 0
    this.dashCooldownTimer = 0
    this.attackTimer = 0
    this.comboCount = 0
    this.comboTimer = 0
    this.isDashing = false
    this.isAttacking = false
    this.isInvincible = false
    this.isSprinting = false
    this.isGrounded = true
    this.canMove = true
    this.canJump = true
    this.canDash = true
    this.canAttack = true
    this.animationState = AnimationState.IDLE
  }

  /**
   * Get player config
   */
  getConfig(): PlayerControllerConfig {
    return { ...this.config }
  }

  /**
   * Update player config
   */
  updateConfig(config: Partial<PlayerControllerConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get dash cooldown progress (0-1, 1 = ready)
   */
  getDashCooldownProgress(): number {
    if (this.dashCooldownTimer <= 0) return 1
    return 1 - this.dashCooldownTimer / this.config.dashCooldown
  }
}
