// ===================================================================
// Collectible Manager - Manages collectible items in the world
// ===================================================================
// Spawns, tracks, and handles pickup of collectible items (gold,
// potions, materials, etc.) scattered throughout the world.
// ===================================================================

import * as THREE from 'three'
import { Collectible, Item, ItemCategory, Rarity } from '../types'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import { horizontalDistance } from '../utils/MathUtils'
import { generateId } from '../utils/MathUtils'
import { RARITY_COLORS, WORLD_CONFIG } from '../config/GameConfig'

export class CollectibleManager {
  public scene: THREE.Scene
  public collectibles: Map<string, Collectible> = new Map()
  private meshes: Map<string, THREE.Object3D> = new Map()
  private collectibleGroup: THREE.Group
  private playerPosition: THREE.Vector3 = new THREE.Vector3()
  private pickupRadius: number = 1.5

  constructor(scene: THREE.Scene) {
    this.scene = scene
    this.collectibleGroup = new THREE.Group()
    this.collectibleGroup.name = 'collectibles'
    this.scene.add(this.collectibleGroup)
  }

  /**
   * Set the player position
   */
  setPlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position)
  }

  /**
   * Spawn a collectible at a position
   */
  spawnCollectible(
    itemId: string,
    position: THREE.Vector3,
    quantity: number = 1,
    rarity: Rarity = Rarity.COMMON,
  ): string {
    const id = generateId('collect_')
    const collectible: Collectible = {
      id,
      itemId,
      position: position.clone(),
      rotation: new THREE.Euler(0, Math.random() * Math.PI * 2, 0),
      quantity,
      bobHeight: 0.3,
      bobSpeed: 2 + Math.random(),
      rotationSpeed: 1 + Math.random(),
      glowColor: RARITY_COLORS[rarity],
      pickupRadius: this.pickupRadius,
      respawnTime: 0,
      spawnTime: performance.now() / 1000,
      isCollected: false,
    }

    // Create mesh
    const mesh = this.createCollectibleMesh(itemId, rarity)
    mesh.position.copy(position)
    mesh.position.y += 0.5
    mesh.userData.collectibleId = id
    mesh.userData.itemId = itemId
    mesh.userData.quantity = quantity

    this.collectibles.set(id, collectible)
    this.meshes.set(id, mesh)
    this.collectibleGroup.add(mesh)

    return id
  }

  /**
   * Create a visual mesh for a collectible
   */
  private createCollectibleMesh(itemId: string, rarity: Rarity): THREE.Group {
    const group = new THREE.Group()
    const color = RARITY_COLORS[rarity]

    // Create item-specific visual
    let itemMesh: THREE.Mesh

    if (itemId.includes('gold') || itemId.includes('coin')) {
      // Gold coin
      const geo = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.2,
      })
      itemMesh = new THREE.Mesh(geo, mat)
      itemMesh.rotation.x = Math.PI / 2
    } else if (itemId.includes('health') || itemId.includes('potion')) {
      // Health potion
      const geo = new THREE.SphereGeometry(0.2, 8, 6)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff2040,
        emissive: 0xff0040,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
      })
      itemMesh = new THREE.Mesh(geo, mat)
    } else if (itemId.includes('mana')) {
      // Mana potion
      const geo = new THREE.SphereGeometry(0.2, 8, 6)
      const mat = new THREE.MeshStandardMaterial({
        color: 0x2060ff,
        emissive: 0x0040ff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.8,
      })
      itemMesh = new THREE.Mesh(geo, mat)
    } else if (itemId.includes('gem') || itemId.includes('crystal')) {
      // Gem/crystal
      const geo = new THREE.OctahedronGeometry(0.25, 0)
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        roughness: 0.1,
        metalness: 0.3,
        transparent: true,
        opacity: 0.9,
      })
      itemMesh = new THREE.Mesh(geo, mat)
    } else if (itemId.includes('key')) {
      // Key item
      const geo = new THREE.TorusGeometry(0.15, 0.05, 6, 8)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.9,
        roughness: 0.2,
      })
      itemMesh = new THREE.Mesh(geo, mat)
    } else if (itemId.includes('scroll')) {
      // Scroll
      const geo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 8)
      const mat = new THREE.MeshStandardMaterial({
        color: 0xeeeedd,
        roughness: 0.8,
      })
      itemMesh = new THREE.Mesh(geo, mat)
      itemMesh.rotation.z = Math.PI / 2
    } else {
      // Default chest/box
      const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4)
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.5,
        roughness: 0.4,
      })
      itemMesh = new THREE.Mesh(geo, mat)
    }

    itemMesh.castShadow = true
    group.add(itemMesh)

    // Add glow ring on the ground
    const ringGeo = new THREE.RingGeometry(0.4, 0.6, 16)
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -0.5
    group.add(ring)

    // Add point light
    const light = new THREE.PointLight(color, 0.5, 3)
    light.position.y = 0
    group.add(light)

    // Store the inner mesh for rotation animation
    group.userData.itemMesh = itemMesh
    group.userData.ring = ring
    group.userData.light = light

    return group
  }

  /**
   * Spawn random collectibles around the world
   */
  spawnRandomCollectibles(count: number = 30): void {
    const items = [
      { id: 'gold_coin', rarity: Rarity.COMMON, weight: 50 },
      { id: 'health_potion', rarity: Rarity.COMMON, weight: 20 },
      { id: 'mana_potion', rarity: Rarity.COMMON, weight: 15 },
      { id: 'gem', rarity: Rarity.UNCOMMON, weight: 10 },
      { id: 'rare_gem', rarity: Rarity.RARE, weight: 4 },
      { id: 'epic_treasure', rarity: Rarity.EPIC, weight: 1 },
    ]

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = 10 + Math.random() * 80
      const pos = new THREE.Vector3(
        Math.cos(angle) * dist,
        0,
        Math.sin(angle) * dist,
      )

      // Pick weighted item
      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
      let r = Math.random() * totalWeight
      let picked = items[0]
      for (const item of items) {
        r -= item.weight
        if (r <= 0) {
          picked = item
          break
        }
      }

      const quantity = picked.id === 'gold_coin' ? Math.floor(Math.random() * 50) + 10 : 1
      this.spawnCollectible(picked.id, pos, quantity, picked.rarity)
    }
  }

  /**
   * Spawn drops from a defeated enemy
   */
  spawnEnemyDrops(
    position: THREE.Vector3,
    gold: number,
    drops: string[],
    itemDropChance: number = 0.3,
  ): void {
    // Always drop some gold
    if (gold > 0) {
      const goldPos = position.clone()
      goldPos.x += (Math.random() - 0.5) * 1
      goldPos.z += (Math.random() - 0.5) * 1
      this.spawnCollectible('gold_coin', goldPos, gold, Rarity.COMMON)
    }

    // Drop items based on chance
    drops.forEach((itemId) => {
      if (Math.random() < itemDropChance) {
        const itemPos = position.clone()
        itemPos.x += (Math.random() - 0.5) * 1.5
        itemPos.z += (Math.random() - 0.5) * 1.5
        itemPos.y += 0.5
        const rarity = this.getRarityForItem(itemId)
        this.spawnCollectible(itemId, itemPos, 1, rarity)
      }
    })
  }

  /**
   * Get rarity for an item ID
   */
  private getRarityForItem(itemId: string): Rarity {
    if (itemId.includes('legendary')) return Rarity.LEGENDARY
    if (itemId.includes('epic')) return Rarity.EPIC
    if (itemId.includes('rare')) return Rarity.RARE
    if (itemId.includes('uncommon')) return Rarity.UNCOMMON
    return Rarity.COMMON
  }

  /**
   * Update all collectibles
   */
  update(deltaTime: number): void {
    const toCollect: string[] = []

    this.collectibles.forEach((collectible, id) => {
      if (collectible.isCollected) return

      const mesh = this.meshes.get(id)
      if (!mesh) return

      // Bob up and down
      const time = performance.now() / 1000 - collectible.spawnTime
      mesh.position.y = collectible.position.y + 0.5 + Math.sin(time * collectible.bobSpeed) * collectible.bobHeight

      // Rotate
      const itemMesh = mesh.userData.itemMesh as THREE.Mesh
      if (itemMesh) {
        itemMesh.rotation.y += collectible.rotationSpeed * deltaTime
        itemMesh.rotation.x += collectible.rotationSpeed * 0.5 * deltaTime
      }

      // Pulse the ring
      const ring = mesh.userData.ring as THREE.Mesh
      if (ring) {
        const pulse = 1 + Math.sin(time * 4) * 0.2
        ring.scale.setScalar(pulse)
      }

      // Check for player pickup
      if (horizontalDistance(collectible.position, this.playerPosition) < collectible.pickupRadius) {
        toCollect.push(id)
      }
    })

    // Collect
    toCollect.forEach((id) => this.collectItem(id))
  }

  /**
   * Collect an item
   */
  collectItem(id: string): void {
    const collectible = this.collectibles.get(id)
    if (!collectible || collectible.isCollected) return

    collectible.isCollected = true

    eventBus.emit(
      GameEventType.ITEM_PICKED_UP,
      {
        collectibleId: id,
        itemId: collectible.itemId,
        quantity: collectible.quantity,
        position: collectible.position.toArray(),
      },
      'CollectibleManager',
    )

    // Play pickup animation - scale up then disappear
    const mesh = this.meshes.get(id)
    if (mesh) {
      // Quick scale animation
      const startTime = performance.now()
      const animate = () => {
        const elapsed = (performance.now() - startTime) / 1000
        if (elapsed < 0.3) {
          const t = elapsed / 0.3
          mesh.scale.setScalar(1 + t * 1.5)
          mesh.position.y += 0.1
          mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.Material
              if ('opacity' in mat) {
                ;(mat as any).opacity = 1 - t
                ;(mat as any).transparent = true
              }
            }
          })
          requestAnimationFrame(animate)
        } else {
          this.removeCollectible(id)
        }
      }
      animate()
    }
  }

  /**
   * Remove a collectible
   */
  removeCollectible(id: string): void {
    const mesh = this.meshes.get(id)
    if (mesh) {
      this.collectibleGroup.remove(mesh)
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose())
          } else {
            child.material?.dispose()
          }
        }
      })
      this.meshes.delete(id)
    }
    this.collectibles.delete(id)
  }

  /**
   * Get all collectibles
   */
  getAllCollectibles(): Collectible[] {
    return Array.from(this.collectibles.values())
  }

  /**
   * Get collectibles within a range
   */
  getCollectiblesInRange(position: THREE.Vector3, range: number): Collectible[] {
    return Array.from(this.collectibles.values()).filter(
      (c) => !c.isCollected && horizontalDistance(c.position, position) <= range,
    )
  }

  /**
   * Get all collectible meshes (for collision)
   */
  getCollectibleMeshes(): THREE.Object3D[] {
    return Array.from(this.meshes.values())
  }

  /**
   * Clear all collectibles
   */
  clearAll(): void {
    const ids = Array.from(this.collectibles.keys())
    ids.forEach((id) => this.removeCollectible(id))
  }

  /**
   * Get the collectible group
   */
  getGroup(): THREE.Group {
    return this.collectibleGroup
  }

  /**
   * Get the count of active collectibles
   */
  getCount(): number {
    return this.collectibles.size
  }
}
