// ===================================================================
// Scene Manager - Three.js scene management
// ===================================================================
// Manages the active scene, lighting, fog, and environment. Provides
// helpers for adding/removing objects and managing scene-level state.
// ===================================================================

import * as THREE from 'three'
import { BiomeType } from '../types'
import { BIOME_SETTINGS } from '../config/GameConfig'

export class SceneManager {
  public scene: THREE.Scene
  public mainLight: THREE.DirectionalLight
  public ambientLight: THREE.AmbientLight
  public hemisphereLight: THREE.HemisphereLight
  public fog: THREE.FogExp2 | null = null
  private objectGroups: Map<string, THREE.Group> = new Map()
  private currentBiome: BiomeType = BiomeType.FOREST
  private skyMesh: THREE.Mesh | null = null
  private sunMesh: THREE.Mesh | null = null
  private groundMesh: THREE.Mesh | null = null
  private lightingRig: THREE.Group

  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87ceeb)

    // Create lighting rig
    this.lightingRig = new THREE.Group()
    this.lightingRig.name = 'lightingRig'
    this.scene.add(this.lightingRig)

    // Main directional light (sun)
    this.mainLight = new THREE.DirectionalLight(0xffffff, 1.2)
    this.mainLight.name = 'sunLight'
    this.mainLight.position.set(50, 80, 30)
    this.mainLight.castShadow = true
    this.mainLight.shadow.mapSize.width = 1024
    this.mainLight.shadow.mapSize.height = 1024
    this.mainLight.shadow.camera.near = 0.5
    this.mainLight.shadow.camera.far = 200
    this.mainLight.shadow.camera.left = -60
    this.mainLight.shadow.camera.right = 60
    this.mainLight.shadow.camera.top = 60
    this.mainLight.shadow.camera.bottom = -60
    this.mainLight.shadow.bias = -0.0005
    this.mainLight.shadow.normalBias = 0.02
    this.lightingRig.add(this.mainLight)

    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    this.ambientLight.name = 'ambientLight'
    this.lightingRig.add(this.ambientLight)

    // Hemisphere light for natural sky/ground lighting
    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5f3a, 0.5)
    this.hemisphereLight.name = 'hemisphereLight'
    this.lightingRig.add(this.hemisphereLight)

    // Create default sky dome
    this.createSkyDome(0x87ceeb)
  }

  /**
   * Create a sky dome with the given color
   */
  private createSkyDome(color: number): void {
    const skyGeometry = new THREE.SphereGeometry(500, 32, 16)
    const skyMaterial = new THREE.MeshBasicMaterial({
      color,
      side: THREE.BackSide,
      fog: false,
    })
    this.skyMesh = new THREE.Mesh(skyGeometry, skyMaterial)
    this.skyMesh.name = 'skyDome'
    this.scene.add(this.skyMesh)
  }

  /**
   * Create a sun visual mesh
   */
  private createSunMesh(): void {
    const sunGeometry = new THREE.SphereGeometry(8, 16, 16)
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff4d8,
      fog: false,
    })
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial)
    this.sunMesh.name = 'sunMesh'
    this.scene.add(this.sunMesh)
  }

  /**
   * Apply a biome to the scene (changes lighting, fog, colors)
   */
  applyBiome(biome: BiomeType): void {
    this.currentBiome = biome
    const settings = BIOME_SETTINGS[biome]

    // Update scene background
    this.scene.background = new THREE.Color(settings.skyColor)

    // Update sky dome color
    if (this.skyMesh) {
      ;(this.skyMesh.material as THREE.MeshBasicMaterial).color.setHex(settings.skyColor)
    }

    // Update fog
    this.scene.fog = new THREE.FogExp2(settings.fogColor, settings.fogDensity)
    this.fog = this.scene.fog as THREE.FogExp2

    // Update lights
    this.mainLight.color.setHex(settings.sunColor)
    this.mainLight.intensity = settings.sunIntensity

    this.ambientLight.color.setHex(settings.ambientColor)
    this.ambientLight.intensity = settings.ambientIntensity

    this.hemisphereLight.color.setHex(settings.skyColor)
    this.hemisphereLight.groundColor.setHex(settings.groundColor)
  }

  /**
   * Set the sun position
   */
  setSunPosition(x: number, y: number, z: number): void {
    this.mainLight.position.set(x, y, z)
    if (this.sunMesh) {
      this.sunMesh.position.set(x, y, z).normalize().multiplyScalar(400)
    }
  }

  /**
   * Set the time of day (0 = midnight, 0.5 = noon, 1 = midnight)
   */
  setTimeOfDay(time: number): void {
    const angle = time * Math.PI * 2 - Math.PI / 2
    const sunHeight = Math.sin(angle)
    const sunHorizontal = Math.cos(angle)
    const sunDistance = 100

    this.setSunPosition(
      sunHorizontal * sunDistance * 0.5,
      Math.max(5, sunHeight * sunDistance),
      sunDistance * 0.3,
    )

    // Adjust light intensity based on sun height
    const dayFactor = Math.max(0, sunHeight)
    this.mainLight.intensity = 0.3 + dayFactor * 1.2
    this.ambientLight.intensity = 0.2 + dayFactor * 0.4

    // Adjust light color based on time of day
    if (sunHeight < 0.2 && sunHeight > -0.2) {
      // Sunrise/sunset - warm orange light
      this.mainLight.color.setHex(0xff8040)
    } else if (sunHeight >= 0.2) {
      // Day - white/yellow light
      this.mainLight.color.setHex(0xfff4d8)
    } else {
      // Night - cool blue moonlight
      this.mainLight.color.setHex(0x6080c0)
      this.mainLight.intensity = 0.2
    }
  }

  /**
   * Get the current biome
   */
  getCurrentBiome(): BiomeType {
    return this.currentBiome
  }

  /**
   * Create or get a named group for organizing objects
   */
  getGroup(name: string): THREE.Group {
    if (!this.objectGroups.has(name)) {
      const group = new THREE.Group()
      group.name = name
      this.scene.add(group)
      this.objectGroups.set(name, group)
    }
    return this.objectGroups.get(name)!
  }

  /**
   * Add an object to a named group
   */
  addToGroup(object: THREE.Object3D, groupName: string): void {
    const group = this.getGroup(groupName)
    group.add(object)
  }

  /**
   * Remove all objects from a named group
   */
  clearGroup(groupName: string): void {
    const group = this.objectGroups.get(groupName)
    if (group) {
      while (group.children.length > 0) {
        const child = group.children[0]
        group.remove(child)
        this.disposeObject(child)
      }
    }
  }

  /**
   * Remove a group entirely
   */
  removeGroup(groupName: string): void {
    const group = this.objectGroups.get(groupName)
    if (group) {
      this.clearGroup(groupName)
      this.scene.remove(group)
      this.objectGroups.delete(groupName)
    }
  }

  /**
   * Add an object directly to the scene
   */
  add(object: THREE.Object3D): void {
    this.scene.add(object)
  }

  /**
   * Remove an object from the scene
   */
  remove(object: THREE.Object3D): void {
    this.scene.remove(object)
  }

  /**
   * Recursively dispose an object and its materials/geometries
   */
  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose()
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose())
          } else {
            child.material.dispose()
          }
        }
      }
    })
  }

  /**
   * Set the ground mesh for the scene
   */
  setGroundMesh(mesh: THREE.Mesh): void {
    if (this.groundMesh) {
      this.scene.remove(this.groundMesh)
      this.disposeObject(this.groundMesh)
    }
    this.groundMesh = mesh
    this.groundMesh.name = 'ground'
    this.scene.add(this.groundMesh)
  }

  /**
   * Get the ground mesh
   */
  getGroundMesh(): THREE.Mesh | null {
    return this.groundMesh
  }

  /**
   * Find objects by name
   */
  findByName(name: string): THREE.Object3D[] {
    const result: THREE.Object3D[] = []
    this.scene.traverse((obj) => {
      if (obj.name === name) {
        result.push(obj)
      }
    })
    return result
  }

  /**
   * Update the scene (called every frame)
   */
  update(deltaTime: number): void {
    // Update sky position to follow camera (so it never appears to move)
    // This is handled automatically because the sky is huge (radius 500)
    // and the camera moves small distances relative to that.
  }

  /**
   * Get the main directional light
   */
  getMainLight(): THREE.DirectionalLight {
    return this.mainLight
  }

  /**
   * Get the ambient light
   */
  getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight
  }

  /**
   * Get the hemisphere light
   */
  getHemisphereLight(): THREE.HemisphereLight {
    return this.hemisphereLight
  }

  /**
   * Set fog density
   */
  setFogDensity(density: number): void {
    if (this.fog) {
      this.fog.density = density
    }
  }

  /**
   * Set fog color
   */
  setFogColor(color: number): void {
    if (this.fog) {
      this.fog.color.setHex(color)
    }
  }

  /**
   * Clear the entire scene (except lights)
   */
  clearScene(): void {
    this.objectGroups.forEach((_, name) => {
      this.removeGroup(name)
    })
    if (this.groundMesh) {
      this.scene.remove(this.groundMesh)
      this.disposeObject(this.groundMesh)
      this.groundMesh = null
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearScene()
    if (this.skyMesh) {
      this.disposeObject(this.skyMesh)
      this.skyMesh = null
    }
    if (this.sunMesh) {
      this.disposeObject(this.sunMesh)
      this.sunMesh = null
    }
  }
}
