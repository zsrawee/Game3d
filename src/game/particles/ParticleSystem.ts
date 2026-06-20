// ===================================================================
// Particle System - Visual particle effects engine
// ===================================================================
// Provides a flexible particle system for creating visual effects:
// explosions, magic effects, hit sparks, ambient particles, etc.
// Supports various emitter shapes, color transitions, and blending.
// ===================================================================

import * as THREE from 'three'
import { ParticleConfig } from '../types'
import { DAMAGE_TYPE_COLORS } from '../config/GameConfig'
import { clamp } from '../utils/MathUtils'
import { generateId } from '../utils/MathUtils'

interface ActiveParticle {
  id: string
  config: ParticleConfig
  positions: Float32Array
  velocities: Float32Array
  ages: Float32Array
  sizes: Float32Array
  colors: Float32Array
  opacities: Float32Array
  rotations: Float32Array
  alive: boolean[]
  aliveCount: number
  geometry: THREE.BufferGeometry
  material: THREE.PointsMaterial
  points: THREE.Points
  age: number
  emissionTimer: number
}

export class ParticleSystem {
  public scene: THREE.Scene
  private particles: Map<string, ActiveParticle> = new Map()
  private particleGroup: THREE.Group
  private maxParticles: number = 5000

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.particleGroup = new THREE.Group()
    this.particleGroup.name = 'particles'
    this.scene.add(this.particleGroup)
  }

  /**
   * Spawn a particle effect
   */
  spawnEffect(config: ParticleConfig): string {
    const id = generateId('particle_')
    const positions = new Float32Array(config.count * 3)
    const velocities = new Float32Array(config.count * 3)
    const ages = new Float32Array(config.count)
    const sizes = new Float32Array(config.count)
    const colors = new Float32Array(config.count * 3)
    const opacities = new Float32Array(config.count)
    const rotations = new Float32Array(config.count)
    const alive = new Array(config.count).fill(false)

    // Initialize particles
    for (let i = 0; i < config.count; i++) {
      this.initializeParticle(i, positions, velocities, ages, sizes, colors, opacities, rotations, alive, config)
    }

    // Create geometry
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // Create material
    const material = new THREE.PointsMaterial({
      size: config.startSize,
      vertexColors: true,
      transparent: true,
      opacity: config.startOpacity,
      blending: config.blending || THREE.AdditiveBlending,
      depthWrite: config.depthWrite ?? false,
      sizeAttenuation: true,
    })

    const points = new THREE.Points(geometry, material)
    points.frustumCulled = false

    this.particleGroup.add(points)

    const particle: ActiveParticle = {
      id,
      config,
      positions,
      velocities,
      ages,
      sizes,
      colors,
      opacities,
      rotations,
      alive,
      aliveCount: config.count,
      geometry,
      material,
      points,
      age: 0,
      emissionTimer: 0,
    }

    this.particles.set(id, particle)
    return id
  }

  /**
   * Initialize a single particle
   */
  private initializeParticle(
    index: number,
    positions: Float32Array,
    velocities: Float32Array,
    ages: Float32Array,
    sizes: Float32Array,
    colors: Float32Array,
    opacities: Float32Array,
    rotations: Float32Array,
    alive: boolean[],
    config: ParticleConfig,
  ): void {
    // Set initial position based on emitter shape
    const pos = this.getEmissionPosition(config)
    positions[index * 3] = pos.x
    positions[index * 3 + 1] = pos.y
    positions[index * 3 + 2] = pos.z

    // Set initial velocity
    velocities[index * 3] = config.velocity.x + (Math.random() - 0.5) * config.velocityVariation.x * 2
    velocities[index * 3 + 1] = config.velocity.y + (Math.random() - 0.5) * config.velocityVariation.y * 2
    velocities[index * 3 + 2] = config.velocity.z + (Math.random() - 0.5) * config.velocityVariation.z * 2

    // Initialize age to a random start so particles don't all disappear at once
    ages[index] = Math.random() * config.lifetime * 0.5
    sizes[index] = config.startSize
    colors[index * 3] = config.startColor.r
    colors[index * 3 + 1] = config.startColor.g
    colors[index * 3 + 2] = config.startColor.b
    opacities[index] = config.startOpacity
    rotations[index] = Math.random() * Math.PI * 2
    alive[index] = true
  }

  /**
   * Get a random position within the emitter shape
   */
  private getEmissionPosition(config: ParticleConfig): THREE.Vector3 {
    const pos = new THREE.Vector3()

    switch (config.emitterShape) {
      case 'point':
        // Just the origin
        break

      case 'sphere':
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const r = Math.cbrt(Math.random()) * config.emitterSize.x
        pos.x = r * Math.sin(phi) * Math.cos(theta)
        pos.y = r * Math.sin(phi) * Math.sin(theta)
        pos.z = r * Math.cos(phi)
        break

      case 'box':
        pos.x = (Math.random() - 0.5) * config.emitterSize.x * 2
        pos.y = (Math.random() - 0.5) * config.emitterSize.y * 2
        pos.z = (Math.random() - 0.5) * config.emitterSize.z * 2
        break

      case 'cone':
        // Cone facing up
        const t = Math.random()
        const angle = Math.random() * Math.PI * 2
        const radius = t * config.emitterSize.x
        pos.x = Math.cos(angle) * radius
        pos.z = Math.sin(angle) * radius
        pos.y = -t * config.emitterSize.y
        break
    }

    return pos
  }

  /**
   * Update all particles
   */
  update(deltaTime: number): void {
    const toRemove: string[] = []

    this.particles.forEach((particle, id) => {
      particle.age += deltaTime

      // Check if expired
      if (!particle.config.loop && particle.age > particle.config.duration + particle.config.lifetime) {
        toRemove.push(id)
        return
      }

      // Update each particle
      for (let i = 0; i < particle.config.count; i++) {
        if (!particle.alive[i]) {
          // Respawn if looping
          if (particle.config.loop && particle.age < particle.config.duration) {
            this.initializeParticle(
              i,
              particle.positions,
              particle.velocities,
              particle.ages,
              particle.sizes,
              particle.colors,
              particle.opacities,
              particle.rotations,
              particle.alive,
              particle.config,
            )
          }
          continue
        }

        // Age the particle
        particle.ages[i] += deltaTime

        if (particle.ages[i] >= particle.config.lifetime) {
          particle.alive[i] = false
          particle.aliveCount--
          // Hide the particle
          particle.positions[i * 3] = 0
          particle.positions[i * 3 + 1] = -1000
          particle.positions[i * 3 + 2] = 0
          continue
        }

        const lifeRatio = particle.ages[i] / particle.config.lifetime

        // Apply acceleration
        particle.velocities[i * 3] += particle.config.acceleration.x * deltaTime
        particle.velocities[i * 3 + 1] += particle.config.acceleration.y * deltaTime
        particle.velocities[i * 3 + 2] += particle.config.acceleration.z * deltaTime

        // Apply velocity
        particle.positions[i * 3] += particle.velocities[i * 3] * deltaTime
        particle.positions[i * 3 + 1] += particle.velocities[i * 3 + 1] * deltaTime
        particle.positions[i * 3 + 2] += particle.velocities[i * 3 + 2] * deltaTime

        // Update size
        particle.sizes[i] = THREE.MathUtils.lerp(particle.config.startSize, particle.config.endSize, lifeRatio)

        // Update color
        particle.colors[i * 3] = THREE.MathUtils.lerp(particle.config.startColor.r, particle.config.endColor.r, lifeRatio)
        particle.colors[i * 3 + 1] = THREE.MathUtils.lerp(particle.config.startColor.g, particle.config.endColor.g, lifeRatio)
        particle.colors[i * 3 + 2] = THREE.MathUtils.lerp(particle.config.startColor.b, particle.config.endColor.b, lifeRatio)

        // Update opacity
        particle.opacities[i] = THREE.MathUtils.lerp(particle.config.startOpacity, particle.config.endOpacity, lifeRatio)

        // Apply rotation
        particle.rotations[i] += particle.config.rotationSpeed * deltaTime
      }

      // Update geometry
      particle.geometry.attributes.position.needsUpdate = true
      particle.geometry.attributes.color.needsUpdate = true
      particle.geometry.attributes.size.needsUpdate = true

      // Update material opacity (use average)
      let avgOpacity = 0
      let aliveCount = 0
      for (let i = 0; i < particle.config.count; i++) {
        if (particle.alive[i]) {
          avgOpacity += particle.opacities[i]
          aliveCount++
        }
      }
      if (aliveCount > 0) {
        particle.material.opacity = avgOpacity / aliveCount
      }
    })

    // Remove expired particles
    toRemove.forEach((id) => this.removeEffect(id))
  }

  /**
   * Remove a particle effect
   */
  removeEffect(id: string): void {
    const particle = this.particles.get(id)
    if (particle) {
      this.particleGroup.remove(particle.points)
      particle.geometry.dispose()
      particle.material.dispose()
      this.particles.delete(id)
    }
  }

  /**
   * Create an explosion effect
   */
  createExplosion(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0xff6020), size: number = 1): string {
    return this.spawnEffect({
      count: Math.floor(50 * size),
      lifetime: 0.8,
      startSize: 0.3 * size,
      endSize: 0,
      startColor: color,
      endColor: new THREE.Color(0x000000),
      startOpacity: 1,
      endOpacity: 0,
      velocity: new THREE.Vector3(0, 0, 0),
      velocityVariation: new THREE.Vector3(10 * size, 10 * size, 10 * size),
      acceleration: new THREE.Vector3(0, -5, 0),
      rotationSpeed: 5,
      rotationVariation: 5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      emitterShape: 'point',
      emitterSize: new THREE.Vector3(0, 0, 0),
      followEmitter: false,
      loop: false,
      duration: 0.1,
      delay: 0,
    })
  }

  /**
   * Create a hit spark effect
   */
  createHitSpark(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0xffffff), direction?: THREE.Vector3): string {
    const dir = direction || new THREE.Vector3(0, 1, 0)
    return this.spawnEffect({
      count: 15,
      lifetime: 0.3,
      startSize: 0.15,
      endSize: 0,
      startColor: color,
      endColor: new THREE.Color(0x000000),
      startOpacity: 1,
      endOpacity: 0,
      velocity: dir.clone().multiplyScalar(8),
      velocityVariation: new THREE.Vector3(3, 3, 3),
      acceleration: new THREE.Vector3(0, -10, 0),
      rotationSpeed: 10,
      rotationVariation: 10,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      emitterShape: 'point',
      emitterSize: new THREE.Vector3(0, 0, 0),
      followEmitter: false,
      loop: false,
      duration: 0.1,
      delay: 0,
    })
  }

  /**
   * Create a magic aura effect
   */
  createMagicAura(position: THREE.Vector3, color: THREE.Color, duration: number = 2): string {
    return this.spawnEffect({
      count: 30,
      lifetime: duration,
      startSize: 0.2,
      endSize: 0.05,
      startColor: color,
      endColor: new THREE.Color(color.r * 0.3, color.g * 0.3, color.b * 0.3),
      startOpacity: 0.8,
      endOpacity: 0,
      velocity: new THREE.Vector3(0, 1, 0),
      velocityVariation: new THREE.Vector3(0.5, 0.5, 0.5),
      acceleration: new THREE.Vector3(0, 0, 0),
      rotationSpeed: 2,
      rotationVariation: 2,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      emitterShape: 'sphere',
      emitterSize: new THREE.Vector3(1, 1, 1),
      followEmitter: false,
      loop: true,
      duration: duration,
      delay: 0,
    })
  }

  /**
   * Create a damage type effect
   */
  createDamageEffect(position: THREE.Vector3, damageType: any): string {
    const color = new THREE.Color(DAMAGE_TYPE_COLORS[damageType] || 0xffffff)
    return this.createExplosion(position, color, 0.6)
  }

  /**
   * Create a dust effect (for landing, etc.)
   */
  createDustCloud(position: THREE.Vector3, size: number = 1): string {
    return this.spawnEffect({
      count: Math.floor(20 * size),
      lifetime: 0.6,
      startSize: 0.2 * size,
      endSize: 0.5 * size,
      startColor: new THREE.Color(0xaaaaaa),
      endColor: new THREE.Color(0x666666),
      startOpacity: 0.6,
      endOpacity: 0,
      velocity: new THREE.Vector3(0, 1, 0),
      velocityVariation: new THREE.Vector3(3 * size, 1 * size, 3 * size),
      acceleration: new THREE.Vector3(0, -3, 0),
      rotationSpeed: 2,
      rotationVariation: 2,
      blending: THREE.NormalBlending,
      depthWrite: false,
      emitterShape: 'circle' as any,
      emitterSize: new THREE.Vector3(1 * size, 0, 1 * size),
      followEmitter: false,
      loop: false,
      duration: 0.1,
      delay: 0,
    })
  }

  /**
   * Create a trail effect (for dashing, etc.)
   */
  createTrail(position: THREE.Vector3, color: THREE.Color): string {
    return this.spawnEffect({
      count: 10,
      lifetime: 0.4,
      startSize: 0.3,
      endSize: 0,
      startColor: color,
      endColor: new THREE.Color(0x000000),
      startOpacity: 0.7,
      endOpacity: 0,
      velocity: new THREE.Vector3(0, 0, 0),
      velocityVariation: new THREE.Vector3(0.2, 0.2, 0.2),
      acceleration: new THREE.Vector3(0, 0, 0),
      rotationSpeed: 1,
      rotationVariation: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      emitterShape: 'point',
      emitterSize: new THREE.Vector3(0, 0, 0),
      followEmitter: false,
      loop: false,
      duration: 0.05,
      delay: 0,
    })
  }

  /**
   * Create ambient particles (floating dust, leaves, etc.)
   */
  createAmbientParticles(): string {
    return this.spawnEffect({
      count: 100,
      lifetime: 10,
      startSize: 0.05,
      endSize: 0.05,
      startColor: new THREE.Color(0xffffff),
      endColor: new THREE.Color(0xaaaaaa),
      startOpacity: 0.4,
      endOpacity: 0,
      velocity: new THREE.Vector3(0.2, 0.5, 0),
      velocityVariation: new THREE.Vector3(0.3, 0.3, 0.3),
      acceleration: new THREE.Vector3(0, 0, 0),
      rotationSpeed: 0.5,
      rotationVariation: 0.5,
      blending: THREE.NormalBlending,
      depthWrite: false,
      emitterShape: 'box',
      emitterSize: new THREE.Vector3(50, 20, 50),
      followEmitter: false,
      loop: true,
      duration: 100,
      delay: 0,
    })
  }

  /**
   * Create a healing effect
   */
  createHealEffect(position: THREE.Vector3): string {
    return this.spawnEffect({
      count: 25,
      lifetime: 1.5,
      startSize: 0.2,
      endSize: 0.1,
      startColor: new THREE.Color(0x40ff80),
      endColor: new THREE.Color(0x80ffc0),
      startOpacity: 1,
      endOpacity: 0,
      velocity: new THREE.Vector3(0, 2, 0),
      velocityVariation: new THREE.Vector3(0.5, 0.5, 0.5),
      acceleration: new THREE.Vector3(0, 1, 0),
      rotationSpeed: 3,
      rotationVariation: 3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      emitterShape: 'sphere',
      emitterSize: new THREE.Vector3(0.5, 0.5, 0.5),
      followEmitter: false,
      loop: false,
      duration: 0.5,
      delay: 0,
    })
  }

  /**
   * Create a level-up effect
   */
  createLevelUpEffect(position: THREE.Vector3): string {
    return this.spawnEffect({
      count: 60,
      lifetime: 2,
      startSize: 0.3,
      endSize: 0.1,
      startColor: new THREE.Color(0xffd700),
      endColor: new THREE.Color(0xffffff),
      startOpacity: 1,
      endOpacity: 0,
      velocity: new THREE.Vector3(0, 5, 0),
      velocityVariation: new THREE.Vector3(2, 1, 2),
      acceleration: new THREE.Vector3(0, -2, 0),
      rotationSpeed: 5,
      rotationVariation: 5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      emitterShape: 'sphere',
      emitterSize: new THREE.Vector3(1, 0.1, 1),
      followEmitter: false,
      loop: false,
      duration: 0.5,
      delay: 0,
    })
  }

  /**
   * Create a death effect for enemies
   */
  createDeathEffect(position: THREE.Vector3, color: THREE.Color = new THREE.Color(0x800000)): string {
    const id1 = this.createExplosion(position, color, 1.2)
    const id2 = this.spawnEffect({
      count: 30,
      lifetime: 1.5,
      startSize: 0.2,
      endSize: 0.6,
      startColor: color,
      endColor: new THREE.Color(0x000000),
      startOpacity: 0.8,
      endOpacity: 0,
      velocity: new THREE.Vector3(0, 1, 0),
      velocityVariation: new THREE.Vector3(2, 2, 2),
      acceleration: new THREE.Vector3(0, -3, 0),
      rotationSpeed: 3,
      rotationVariation: 3,
      blending: THREE.NormalBlending,
      depthWrite: false,
      emitterShape: 'sphere',
      emitterSize: new THREE.Vector3(0.5, 0.5, 0.5),
      followEmitter: false,
      loop: false,
      duration: 0.2,
      delay: 0,
    })
    return id1
  }

  /**
   * Get the number of active effects
   */
  getEffectCount(): number {
    return this.particles.size
  }

  /**
   * Clear all particle effects
   */
  clearAll(): void {
    const ids = Array.from(this.particles.keys())
    ids.forEach((id) => this.removeEffect(id))
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clearAll()
    this.scene.remove(this.particleGroup)
  }
}
