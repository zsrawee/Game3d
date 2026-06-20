// ===================================================================
// Camera Controller - Third-person camera with collision
// ===================================================================
// Smooth third-person camera that follows the player with damping,
// collision detection, and adjustable distance/angle. Supports
// both touch (drag to rotate) and auto-follow modes.
// ===================================================================

import * as THREE from 'three'
import { TimeManager } from './TimeManager'
import { clamp, dampAngle, lerp } from '../utils/MathUtils'

export interface CameraConfig {
  distance: number
  height: number
  lookAtHeight: number
  rotationSpeed: number
  minPitch: number
  maxPitch: number
  minDistance: number
  maxDistance: number
  collisionOffset: number
  followLerp: number
  rotationLerp: number
  fov: number
  autoRotate: boolean
  autoRotateSpeed: number
}

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  distance: 8,
  height: 4,
  lookAtHeight: 1.5,
  rotationSpeed: 0.005,
  minPitch: -Math.PI / 4,
  maxPitch: Math.PI / 3,
  minDistance: 3,
  maxDistance: 15,
  collisionOffset: 0.3,
  followLerp: 8,
  rotationLerp: 10,
  fov: 60,
  autoRotate: false,
  autoRotateSpeed: 0.5,
}

export class CameraController {
  public camera: THREE.PerspectiveCamera
  public target: THREE.Object3D | null = null
  public config: CameraConfig

  private yaw: number = 0
  private pitch: number = 0.3
  private targetYaw: number = 0
  private targetPitch: number = 0.3
  private currentDistance: number = 8
  private targetDistance: number = 8
  private currentPosition: THREE.Vector3 = new THREE.Vector3()
  private currentLookAt: THREE.Vector3 = new THREE.Vector3()
  private desiredPosition: THREE.Vector3 = new THREE.Vector3()
  private desiredLookAt: THREE.Vector3 = new THREE.Vector3()
  private isDragging: boolean = false
  private lastDragX: number = 0
  private lastDragY: number = 0
  private collisionTargets: THREE.Object3D[] = []
  private raycaster: THREE.Raycaster = new THREE.Raycaster()
  private shakeIntensity: number = 0
  private shakeDuration: number = 0
  private shakeTimer: number = 0
  private shakeOffset: THREE.Vector3 = new THREE.Vector3()
  private timeManager: TimeManager
  private lockedToTarget: boolean = false
  private lockTarget: THREE.Object3D | null = null
  private fovOverride: number | null = null
  private targetFov: number

  constructor(aspect: number, config: CameraConfig = DEFAULT_CAMERA_CONFIG) {
    this.config = { ...config }
    this.camera = new THREE.PerspectiveCamera(
      config.fov,
      aspect,
      0.1,
      1000,
    )
    this.camera.position.set(0, 10, 10)
    this.camera.lookAt(0, 0, 0)
    this.targetDistance = config.distance
    this.currentDistance = config.distance
    this.targetFov = config.fov
    this.timeManager = TimeManager.getInstance()
  }

  /**
   * Set the target object for the camera to follow
   */
  setTarget(target: THREE.Object3D): void {
    this.target = target
    // Initialize position behind target
    if (target.position) {
      const targetPos = target.position.clone()
      const offset = new THREE.Vector3(0, this.config.height, this.config.distance)
      this.currentPosition.copy(targetPos).add(offset)
      this.currentLookAt.copy(targetPos).add(new THREE.Vector3(0, this.config.lookAtHeight, 0))
    }
  }

  /**
   * Set the yaw angle (horizontal rotation) in radians
   */
  setYaw(yaw: number): void {
    this.targetYaw = yaw
  }

  /**
   * Set the pitch angle (vertical rotation) in radians
   */
  setPitch(pitch: number): void {
    this.targetPitch = clamp(pitch, this.config.minPitch, this.config.maxPitch)
  }

  /**
   * Adjust the yaw angle by a delta
   */
  adjustYaw(delta: number): void {
    this.targetYaw += delta
  }

  /**
   * Adjust the pitch angle by a delta
   */
  adjustPitch(delta: number): void {
    this.targetPitch = clamp(
      this.targetPitch + delta,
      this.config.minPitch,
      this.config.maxPitch,
    )
  }

  /**
   * Set the camera distance from target
   */
  setDistance(distance: number): void {
    this.targetDistance = clamp(distance, this.config.minDistance, this.config.maxDistance)
  }

  /**
   * Adjust the camera distance by a delta (zoom)
   */
  adjustDistance(delta: number): void {
    this.setDistance(this.targetDistance + delta)
  }

  /**
   * Start camera drag rotation
   */
  startDrag(x: number, y: number): void {
    this.isDragging = true
    this.lastDragX = x
    this.lastDragY = y
  }

  /**
   * Update camera drag rotation
   */
  updateDrag(x: number, y: number): void {
    if (!this.isDragging) return
    const deltaX = x - this.lastDragX
    const deltaY = y - this.lastDragY
    this.adjustYaw(-deltaX * this.config.rotationSpeed)
    this.adjustPitch(-deltaY * this.config.rotationSpeed)
    this.lastDragX = x
    this.lastDragY = y
  }

  /**
   * End camera drag rotation
   */
  endDrag(): void {
    this.isDragging = false
  }

  /**
   * Set the list of objects to test for camera collision
   */
  setCollisionTargets(objects: THREE.Object3D[]): void {
    this.collisionTargets = objects
  }

  /**
   * Add a single collision target
   */
  addCollisionTarget(object: THREE.Object3D): void {
    this.collisionTargets.push(object)
  }

  /**
   * Clear all collision targets
   */
  clearCollisionTargets(): void {
    this.collisionTargets = []
  }

  /**
   * Apply screen shake to the camera
   */
  shake(intensity: number, duration: number): void {
    if (intensity > this.shakeIntensity) {
      this.shakeIntensity = intensity
      this.shakeDuration = duration
      this.shakeTimer = duration
    }
  }

  /**
   * Lock the camera to face a specific target
   */
  lockTo(target: THREE.Object3D): void {
    this.lockedToTarget = true
    this.lockTarget = target
  }

  /**
   * Unlock the camera
   */
  unlock(): void {
    this.lockedToTarget = false
    this.lockTarget = null
  }

  /**
   * Set a field-of-view override (e.g., for zoom/scope effects)
   */
  setFovOverride(fov: number | null): void {
    this.fovOverride = fov
    this.targetFov = fov ?? this.config.fov
  }

  /**
   * Update the camera position and rotation
   */
  update(): void {
    if (!this.target) return

    const dt = this.timeManager.getDeltaTime()
    const targetPos = this.target.position

    // Smooth yaw/pitch
    this.yaw = dampAngle(this.yaw, this.targetYaw, this.config.rotationLerp, dt)
    this.pitch = dampAngle(this.pitch, this.targetPitch, this.config.rotationLerp, dt)
    this.currentDistance = lerp(
      this.currentDistance,
      this.targetDistance,
      1 - Math.exp(-this.config.followLerp * dt),
    )

    // Auto-rotate if enabled
    if (this.config.autoRotate && !this.isDragging) {
      this.targetYaw += this.config.autoRotateSpeed * dt
    }

    // Handle target lock - rotate to face the lock target
    if (this.lockedToTarget && this.lockTarget) {
      const direction = this.lockTarget.position.clone().sub(targetPos)
      this.targetYaw = Math.atan2(direction.x, direction.z)
    }

    // Calculate desired camera position based on spherical coordinates
    const cosPitch = Math.cos(this.pitch)
    const sinPitch = Math.sin(this.pitch)
    const cosYaw = Math.cos(this.yaw)
    const sinYaw = Math.sin(this.yaw)

    const horizontalDist = this.currentDistance * cosPitch
    const verticalDist = this.currentDistance * sinPitch + this.config.height

    this.desiredPosition.set(
      targetPos.x - horizontalDist * sinYaw,
      targetPos.y + verticalDist,
      targetPos.z - horizontalDist * cosYaw,
    )

    this.desiredLookAt.set(
      targetPos.x,
      targetPos.y + this.config.lookAtHeight,
      targetPos.z,
    )

    // Camera collision detection
    const finalPosition = this.checkCollision(targetPos, this.desiredPosition)

    // Smooth position
    const positionLerp = 1 - Math.exp(-this.config.followLerp * dt)
    this.currentPosition.lerp(finalPosition, positionLerp)
    this.currentLookAt.lerp(this.desiredLookAt, positionLerp)

    // Update shake
    this.updateShake(dt)

    // Apply position with shake offset
    this.camera.position.copy(this.currentPosition).add(this.shakeOffset)
    this.camera.lookAt(this.currentLookAt)

    // Smooth FOV
    if (Math.abs(this.camera.fov - this.targetFov) > 0.1) {
      this.camera.fov = lerp(
        this.camera.fov,
        this.targetFov,
        1 - Math.exp(-5 * dt),
      )
      this.camera.updateProjectionMatrix()
    }
  }

  /**
   * Check for camera collision and adjust position if needed
   */
  private checkCollision(
    targetPos: THREE.Vector3,
    desiredPos: THREE.Vector3,
  ): THREE.Vector3 {
    if (this.collisionTargets.length === 0) {
      return desiredPos
    }

    const direction = desiredPos.clone().sub(targetPos)
    const distance = direction.length()
    direction.normalize()

    this.raycaster.set(targetPos, direction)
    this.raycaster.far = distance + this.config.collisionOffset

    const intersects = this.raycaster.intersectObjects(this.collisionTargets, true)

    if (intersects.length > 0 && intersects[0].distance < distance) {
      const hitPoint = intersects[0].point
      const adjustedDistance = intersects[0].distance - this.config.collisionOffset
      return targetPos.clone().add(direction.multiplyScalar(Math.max(this.config.minDistance, adjustedDistance)))
    }

    return desiredPos
  }

  /**
   * Update screen shake
   */
  private updateShake(dt: number): void {
    if (this.shakeTimer > 0) {
      this.shakeTimer -= dt
      const t = Math.max(0, this.shakeTimer / this.shakeDuration)
      const intensity = this.shakeIntensity * t * t
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * intensity,
        (Math.random() - 0.5) * 2 * intensity,
        (Math.random() - 0.5) * 2 * intensity,
      )
      if (this.shakeTimer <= 0) {
        this.shakeOffset.set(0, 0, 0)
        this.shakeIntensity = 0
      }
    }
  }

  /**
   * Get the camera's forward direction (horizontal only)
   */
  getForwardDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    dir.y = 0
    return dir.normalize()
  }

  /**
   * Get the camera's right direction (horizontal only)
   */
  getRightDirection(): THREE.Vector3 {
    const forward = this.getForwardDirection()
    return new THREE.Vector3(forward.z, 0, -forward.x)
  }

  /**
   * Get the current yaw angle
   */
  getYaw(): number {
    return this.yaw
  }

  /**
   * Get the current pitch angle
   */
  getPitch(): number {
    return this.pitch
  }

  /**
   * Get the current camera distance
   */
  getDistance(): number {
    return this.currentDistance
  }

  /**
   * Snap the camera instantly to its desired position (no smoothing)
   */
  snapToTarget(): void {
    if (!this.target) return
    this.yaw = this.targetYaw
    this.pitch = this.targetPitch
    this.currentDistance = this.targetDistance
    this.update()
  }

  /**
   * Reset the camera to its default position behind the target
   */
  resetView(): void {
    if (!this.target) return
    const direction = this.target.userData.forward as THREE.Vector3 | undefined
    if (direction) {
      this.targetYaw = Math.atan2(direction.x, direction.z)
    } else {
      this.targetYaw = 0
    }
    this.targetPitch = 0.3
    this.targetDistance = this.config.distance
  }

  /**
   * Set the camera aspect ratio
   */
  setAspectRatio(aspect: number): void {
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()
  }

  /**
   * Get the camera aspect ratio
   */
  getAspectRatio(): number {
    return this.camera.aspect
  }

  /**
   * Update the configuration
   */
  updateConfig(config: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get the current config
   */
  getConfig(): CameraConfig {
    return { ...this.config }
  }

  /**
   * Convert a screen point to a world ray
   */
  screenToWorldRay(screenX: number, screenY: number): THREE.Ray {
    const ndc = new THREE.Vector2(screenX, screenY)
    this.raycaster.setFromCamera(ndc, this.camera)
    return new THREE.Ray(this.raycaster.ray.origin, this.raycaster.ray.direction)
  }

  /**
   * Check if camera is currently being dragged
   */
  isCameraDragging(): boolean {
    return this.isDragging
  }
}
