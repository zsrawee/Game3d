// ===================================================================
// Terrain Generator - Procedural terrain mesh generation
// ===================================================================
// Generates the terrain mesh using noise-based height maps. Creates
// natural-looking terrain with hills, valleys, and flat areas.
// ===================================================================

import * as THREE from 'three'
import { BiomeType } from '../types'
import { BIOME_SETTINGS, WORLD_CONFIG } from '../config/GameConfig'
import { SeededRandom, fractalNoise2D } from '../utils/RandomUtils'

export class TerrainGenerator {
  private scene: THREE.Scene
  private terrainMesh: THREE.Mesh | null = null
  private terrainGeometry: THREE.PlaneGeometry | null = null
  private terrainMaterial: THREE.MeshStandardMaterial | null = null
  private heightMap: Float32Array | null = null
  private terrainSize: number
  private terrainSegments: number
  private seed: number
  private biome: BiomeType

  constructor(scene: THREE.Scene, biome: BiomeType = BiomeType.FOREST, seed: number = 0) {
    this.scene = scene
    this.biome = biome
    this.seed = seed || Math.floor(Math.random() * 100000)
    this.terrainSize = WORLD_CONFIG.WORLD_SIZE
    this.terrainSegments = WORLD_CONFIG.WORLD_SEGMENTS
  }

  /**
   * Generate the terrain
   */
  generate(): THREE.Mesh {
    // Dispose existing terrain
    this.dispose()

    // Create geometry
    this.terrainGeometry = new THREE.PlaneGeometry(
      this.terrainSize,
      this.terrainSize,
      this.terrainSegments,
      this.terrainSegments,
    )
    this.terrainGeometry.rotateX(-Math.PI / 2)

    // Generate height map
    this.heightMap = this.generateHeightMap()

    // Apply heights to geometry
    const positions = this.terrainGeometry.attributes.position
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, this.heightMap[i])
    }
    positions.needsUpdate = true
    this.terrainGeometry.computeVertexNormals()

    // Create material
    const biomeSettings = BIOME_SETTINGS[this.biome]
    this.terrainMaterial = new THREE.MeshStandardMaterial({
      color: biomeSettings.groundColor,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: false,
    })

    // Create mesh
    this.terrainMesh = new THREE.Mesh(this.terrainGeometry, this.terrainMaterial)
    this.terrainMesh.name = 'terrain'
    this.terrainMesh.receiveShadow = true
    this.terrainMesh.castShadow = false

    this.scene.add(this.terrainMesh)
    return this.terrainMesh
  }

  /**
   * Generate the height map using fractal noise
   */
  private generateHeightMap(): Float32Array {
    const size = this.terrainSegments + 1
    const heights = new Float32Array(size * size)
    const rng = new SeededRandom(this.seed)

    const noiseSeed = rng.int(0, 100000)
    const scale = 0.015
    const heightScale = this.getHeightScale()

    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const idx = z * size + x

        // Get world coordinates
        const worldX = (x / this.terrainSegments - 0.5) * this.terrainSize
        const worldZ = (z / this.terrainSegments - 0.5) * this.terrainSize

        // Generate fractal noise
        const noise = fractalNoise2D(
          worldX * scale,
          worldZ * scale,
          4,
          0.5,
          2.0,
          noiseSeed,
        )

        // Apply biome-specific modifications
        let height = noise * heightScale

        // Add some larger features
        const largeFeatures = fractalNoise2D(
          worldX * scale * 0.3,
          worldZ * scale * 0.3,
          2,
          0.5,
          2.0,
          noiseSeed + 1,
        )
        height += largeFeatures * heightScale * 0.5

        // Flatten the center area (spawn point)
        const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ)
        if (distFromCenter < 20) {
          const flatness = THREE.MathUtils.clamp((20 - distFromCenter) / 20, 0, 1)
          height *= 1 - flatness * 0.85
        }

        // Smooth edges to create world border
        const edgeDist = this.terrainSize / 2 - Math.max(Math.abs(worldX), Math.abs(worldZ))
        if (edgeDist < 10) {
          const edgeFactor = THREE.MathUtils.clamp(edgeDist / 10, 0, 1)
          height *= edgeFactor
          height -= (1 - edgeFactor) * 5
        }

        // Volcanic biome - add some sharp peaks
        if (this.biome === BiomeType.VOLCANIC && Math.random() < 0.005) {
          height += heightScale * 2
        }

        heights[idx] = height
      }
    }

    return heights
  }

  /**
   * Get the height scale for the current biome
   */
  private getHeightScale(): number {
    switch (this.biome) {
      case BiomeType.FOREST: return 8
      case BiomeType.DESERT: return 5
      case BiomeType.SNOW: return 12
      case BiomeType.VOLCANIC: return 15
      case BiomeType.CRYSTAL: return 10
      case BiomeType.VOID: return 20
      case BiomeType.OCEAN: return 3
      case BiomeType.SKY: return 6
      default: return 8
    }
  }

  /**
   * Get the height at a specific world position
   */
  getHeightAt(x: number, z: number): number {
    if (!this.heightMap || !this.terrainMesh) return 0

    // Convert world position to terrain grid coordinates
    const halfSize = this.terrainSize / 2
    const normalizedX = (x + halfSize) / this.terrainSize
    const normalizedZ = (z + halfSize) / this.terrainSize

    if (normalizedX < 0 || normalizedX > 1 || normalizedZ < 0 || normalizedZ > 1) {
      return 0
    }

    const gridX = normalizedX * this.terrainSegments
    const gridZ = normalizedZ * this.terrainSegments

    const x0 = Math.floor(gridX)
    const z0 = Math.floor(gridZ)
    const x1 = Math.min(x0 + 1, this.terrainSegments)
    const z1 = Math.min(z0 + 1, this.terrainSegments)

    const fx = gridX - x0
    const fz = gridZ - z0

    const size = this.terrainSegments + 1
    const h00 = this.heightMap[z0 * size + x0]
    const h10 = this.heightMap[z0 * size + x1]
    const h01 = this.heightMap[z1 * size + x0]
    const h11 = this.heightMap[z1 * size + x1]

    // Bilinear interpolation
    const h0 = h00 * (1 - fx) + h10 * fx
    const h1 = h01 * (1 - fx) + h11 * fx
    return h0 * (1 - fz) + h1 * fz
  }

  /**
   * Get the normal at a specific world position
   */
  getNormalAt(x: number, z: number): THREE.Vector3 {
    const hL = this.getHeightAt(x - 1, z)
    const hR = this.getHeightAt(x + 1, z)
    const hD = this.getHeightAt(x, z - 1)
    const hU = this.getHeightAt(x, z + 1)

    const normal = new THREE.Vector3(hL - hR, 2, hD - hU).normalize()
    return normal
  }

  /**
   * Change the biome of the terrain
   */
  setBiome(biome: BiomeType): void {
    this.biome = biome
    if (this.terrainMaterial) {
      const biomeSettings = BIOME_SETTINGS[biome]
      this.terrainMaterial.color.setHex(biomeSettings.groundColor)
    }
  }

  /**
   * Get the current biome
   */
  getBiome(): BiomeType {
    return this.biome
  }

  /**
   * Get the terrain mesh
   */
  getMesh(): THREE.Mesh | null {
    return this.terrainMesh
  }

  /**
   * Get the seed
   */
  getSeed(): number {
    return this.seed
  }

  /**
   * Set the seed
   */
  setSeed(seed: number): void {
    this.seed = seed
  }

  /**
   * Get the terrain size
   */
  getSize(): number {
    return this.terrainSize
  }

  /**
   * Add vertex colors based on height for visual variety
   */
  applyVertexColors(): void {
    if (!this.terrainGeometry || !this.heightMap) return

    const positions = this.terrainGeometry.attributes.position
    const colors = new Float32Array(positions.count * 3)
    const biomeSettings = BIOME_SETTINGS[this.biome]

    const baseColor = new THREE.Color(biomeSettings.groundColor)
    const highColor = new THREE.Color(this.getHighColor())
    const lowColor = new THREE.Color(this.getLowColor())

    const maxHeight = this.getHeightScale() * 1.5
    const minHeight = -3

    for (let i = 0; i < positions.count; i++) {
      const height = positions.getY(i)
      const t = THREE.MathUtils.clamp((height - minHeight) / (maxHeight - minHeight), 0, 1)

      const color = new THREE.Color()
      if (t < 0.3) {
        color.lerpColors(lowColor, baseColor, t / 0.3)
      } else if (t < 0.7) {
        color.lerpColors(baseColor, highColor, (t - 0.3) / 0.4)
      } else {
        color.copy(highColor)
      }

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    this.terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    if (this.terrainMaterial) {
      this.terrainMaterial.vertexColors = true
      this.terrainMaterial.needsUpdate = true
    }
  }

  /**
   * Get the color for high terrain
   */
  private getHighColor(): number {
    switch (this.biome) {
      case BiomeType.FOREST: return 0x6a8a5a
      case BiomeType.DESERT: return 0xe8c878
      case BiomeType.SNOW: return 0xffffff
      case BiomeType.VOLCANIC: return 0x4a2010
      case BiomeType.CRYSTAL: return 0xa0c0ff
      case BiomeType.VOID: return 0x2a1040
      case BiomeType.OCEAN: return 0x80c0e0
      case BiomeType.SKY: return 0xc0e0ff
      default: return 0xaaaaaa
    }
  }

  /**
   * Get the color for low terrain
   */
  private getLowColor(): number {
    switch (this.biome) {
      case BiomeType.FOREST: return 0x2a4020
      case BiomeType.DESERT: return 0x8a7040
      case BiomeType.SNOW: return 0xa0b0c0
      case BiomeType.VOLCANIC: return 0x1a0808
      case BiomeType.CRYSTAL: return 0x203060
      case BiomeType.VOID: return 0x0a0510
      case BiomeType.OCEAN: return 0x102030
      case BiomeType.SKY: return 0x6090c0
      default: return 0x444444
    }
  }

  /**
   * Dispose of terrain resources
   */
  dispose(): void {
    if (this.terrainMesh) {
      this.scene.remove(this.terrainMesh)
      this.terrainGeometry?.dispose()
      this.terrainMaterial?.dispose()
      this.terrainMesh = null
      this.terrainGeometry = null
      this.terrainMaterial = null
      this.heightMap = null
    }
  }
}
