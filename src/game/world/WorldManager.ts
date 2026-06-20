// ===================================================================
// World Manager - Manages the game world and all its systems
// ===================================================================
// Top-level coordinator for the game world: terrain, environment
// objects, collectibles, and biome transitions. Provides a unified
// interface for the rest of the game to interact with the world.
// ===================================================================

import * as THREE from 'three'
import { BiomeType, WorldDefinition } from '../types'
import { TerrainGenerator } from './TerrainGenerator'
import { EnvironmentObjects } from './EnvironmentObjects'
import { CollectibleManager } from './CollectibleManager'
import { SceneManager } from '../engine/SceneManager'
import { WORLD_CONFIG, BIOME_SETTINGS } from '../config/GameConfig'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'

export class WorldManager {
  public scene: THREE.Scene
  public sceneManager: SceneManager
  public terrain: TerrainGenerator
  public environment: EnvironmentObjects
  public collectibles: CollectibleManager

  private currentBiome: BiomeType = BiomeType.FOREST
  private worldSeed: number
  private worldDefinition: WorldDefinition | null = null
  private worldSize: number = WORLD_CONFIG.WORLD_SIZE
  private worldBorder: number = WORLD_CONFIG.WORLD_BORDER_HARD
  private worldBorderWarning: number = WORLD_CONFIG.WORLD_BORDER_WARNING

  constructor(scene: THREE.Scene, sceneManager: SceneManager, seed: number = 0) {
    this.scene = scene
    this.sceneManager = sceneManager
    this.worldSeed = seed || Math.floor(Math.random() * 100000)
    this.terrain = new TerrainGenerator(scene, this.currentBiome, this.worldSeed)
    this.environment = new EnvironmentObjects(scene, this.currentBiome, this.worldSeed)
    this.collectibles = new CollectibleManager(scene)
  }

  /**
   * Initialize the world
   */
  initialize(biome: BiomeType = BiomeType.FOREST): void {
    this.currentBiome = biome
    this.generateWorld()
  }

  /**
   * Generate the world
   */
  generateWorld(): void {
    // Generate terrain
    this.terrain.setBiome(this.currentBiome)
    this.terrain.generate()
    this.terrain.applyVertexColors()

    // Apply biome to scene
    this.sceneManager.applyBiome(this.currentBiome)

    // Generate environment objects
    this.environment = new EnvironmentObjects(this.scene, this.currentBiome, this.worldSeed)
    this.environment.generate(WORLD_CONFIG.OBSTACLE_COUNT)

    // Spawn collectibles
    this.collectibles.spawnRandomCollectibles(WORLD_CONFIG.COLLECTIBLE_COUNT)

    eventBus.emit(
      GameEventType.LEVEL_LOADED,
      {
        biome: this.currentBiome,
        seed: this.worldSeed,
        worldSize: this.worldSize,
      },
      'WorldManager',
    )
  }

  /**
   * Change the biome of the world
   */
  changeBiome(biome: BiomeType): void {
    if (this.currentBiome === biome) return

    this.currentBiome = biome
    this.regenerateWorld()
  }

  /**
   * Regenerate the world (new terrain, objects, collectibles)
   */
  regenerateWorld(): void {
    // Clear existing world
    this.terrain.dispose()
    this.environment.dispose()
    this.collectibles.clearAll()

    // Generate new world
    this.generateWorld()
  }

  /**
   * Load a world from a definition
   */
  loadWorld(definition: WorldDefinition): void {
    this.worldDefinition = definition
    this.currentBiome = definition.biome
    this.worldSeed = definition.seed
    this.worldSize = definition.size

    this.regenerateWorld()

    eventBus.emit(
      GameEventType.LEVEL_LOADED,
      {
        worldId: definition.id,
        worldName: definition.name,
        biome: definition.biome,
        seed: definition.seed,
      },
      'WorldManager',
    )
  }

  /**
   * Update the world
   */
  update(deltaTime: number, playerPosition: THREE.Vector3): void {
    this.collectibles.setPlayerPosition(playerPosition)
    this.collectibles.update(deltaTime)

    // Check world border
    this.checkWorldBorder(playerPosition)
  }

  /**
   * Check if player is near or past the world border
   */
  private checkWorldBorder(playerPosition: THREE.Vector3): void {
    const dist = Math.max(
      Math.abs(playerPosition.x),
      Math.abs(playerPosition.z),
    )

    if (dist > this.worldBorder) {
      // Player went out of bounds - emit warning
      eventBus.emit(
        GameEventType.NOTIFICATION,
        {
          type: 'world_border',
          message: 'You have gone too far! Turn back.',
        },
        'WorldManager',
      )
    } else if (dist > this.worldBorderWarning) {
      // Approaching border
      eventBus.emit(
        GameEventType.NOTIFICATION,
        {
          type: 'world_border_warning',
          message: 'Approaching world border',
          distance: this.worldBorder - dist,
        },
        'WorldManager',
      )
    }
  }

  /**
   * Get the height of the terrain at a position
   */
  getHeightAt(x: number, z: number): number {
    return this.terrain.getHeightAt(x, z)
  }

  /**
   * Get the normal of the terrain at a position
   */
  getNormalAt(x: number, z: number): THREE.Vector3 {
    return this.terrain.getNormalAt(x, z)
  }

  /**
   * Get all collision objects (environment)
   */
  getCollisionObjects(): THREE.Object3D[] {
    return this.environment.getObjects()
  }

  /**
   * Get ground objects (for raycasting)
   */
  getGroundObjects(): THREE.Object3D[] {
    const terrainMesh = this.terrain.getMesh()
    return terrainMesh ? [terrainMesh] : []
  }

  /**
   * Get the current biome
   */
  getCurrentBiome(): BiomeType {
    return this.currentBiome
  }

  /**
   * Get the world seed
   */
  getSeed(): number {
    return this.worldSeed
  }

  /**
   * Set the world seed
   */
  setSeed(seed: number): void {
    this.worldSeed = seed
  }

  /**
   * Get the world size
   */
  getWorldSize(): number {
    return this.worldSize
  }

  /**
   * Get the world border
   */
  getWorldBorder(): number {
    return this.worldBorder
  }

  /**
   * Get the collectible manager
   */
  getCollectibleManager(): CollectibleManager {
    return this.collectibles
  }

  /**
   * Get the terrain generator
   */
  getTerrain(): TerrainGenerator {
    return this.terrain
  }

  /**
   * Get the environment objects manager
   */
  getEnvironment(): EnvironmentObjects {
    return this.environment
  }

  /**
   * Spawn a collectible at a position
   */
  spawnCollectible(
    itemId: string,
    position: THREE.Vector3,
    quantity: number = 1,
    rarity: any = 0,
  ): string {
    return this.collectibles.spawnCollectible(itemId, position, quantity, rarity)
  }

  /**
   * Spawn enemy drops
   */
  spawnEnemyDrops(
    position: THREE.Vector3,
    gold: number,
    drops: string[],
    itemDropChance: number = 0.3,
  ): void {
    this.collectibles.spawnEnemyDrops(position, gold, drops, itemDropChance)
  }

  /**
   * Get the world definition
   */
  getWorldDefinition(): WorldDefinition | null {
    return this.worldDefinition
  }

  /**
   * Set the time of day
   */
  setTimeOfDay(time: number): void {
    this.sceneManager.setTimeOfDay(time)
  }

  /**
   * Get all renderable objects in the world
   */
  getAllObjects(): THREE.Object3D[] {
    return [
      ...this.environment.getObjects(),
      ...this.collectibles.getCollectibleMeshes(),
    ]
  }

  /**
   * Get biome settings
   */
  getBiomeSettings() {
    return BIOME_SETTINGS[this.currentBiome]
  }

  /**
   * Dispose of the world
   */
  dispose(): void {
    this.terrain.dispose()
    this.environment.dispose()
    this.collectibles.clearAll()
  }

  /**
   * Reset the world
   */
  reset(): void {
    this.regenerateWorld()
  }

  /**
   * Get a random spawn position that's not too close to obstacles
   */
  getRandomSpawnPosition(minDistFromCenter: number = 20, maxDistFromCenter: number = 70): THREE.Vector3 {
    let attempts = 0
    while (attempts < 20) {
      const angle = Math.random() * Math.PI * 2
      const dist = minDistFromCenter + Math.random() * (maxDistFromCenter - minDistFromCenter)
      const pos = new THREE.Vector3(
        Math.cos(angle) * dist,
        0,
        Math.sin(angle) * dist,
      )

      // Adjust Y to terrain height
      pos.y = this.getHeightAt(pos.x, pos.z)

      // Check distance from obstacles
      let valid = true
      const obstacles = this.getCollisionObjects()
      for (const obstacle of obstacles) {
        if (pos.distanceTo(obstacle.position) < 2) {
          valid = false
          break
        }
      }

      if (valid) return pos
      attempts++
    }

    // Fallback - return a default position
    return new THREE.Vector3(0, 0, 20)
  }
}
