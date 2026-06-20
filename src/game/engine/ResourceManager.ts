// ===================================================================
// Resource Manager - Asset loading and caching
// ===================================================================
// Manages loading, caching, and disposal of textures, geometries,
// materials, and other Three.js resources. Provides async loading
// with progress tracking and error handling.
// ===================================================================

import * as THREE from 'three'

export interface LoadingProgress {
  loaded: number
  total: number
  url: string
  progress: number
}

export type ProgressCallback = (progress: LoadingProgress) => void
export type LoadCompleteCallback = (resource: any) => void
export type LoadErrorCallback = (error: Error) => void

interface CachedResource {
  data: any
  refCount: number
  lastUsed: number
  url: string
}

export class ResourceManager {
  private textureLoader: THREE.TextureLoader
  private cubeTextureLoader: THREE.CubeTextureLoader
  private loadingManager: THREE.LoadingManager
  private cachedTextures: Map<string, CachedResource> = new Map()
  private cachedGeometries: Map<string, CachedResource> = new Map()
  private cachedMaterials: Map<string, CachedResource> = new Map()
  private cachedModels: Map<string, CachedResource> = new Map()
  private cachedAudio: Map<string, CachedResource> = new Map()
  private pendingLoads: Map<string, Promise<any>> = new Map()
  private totalLoaded: number = 0
  private totalRequested: number = 0
  private maxCacheSize: number = 200
  private progressCallbacks: Set<ProgressCallback> = new Set()

  constructor() {
    this.loadingManager = new THREE.LoadingManager()
    this.textureLoader = new THREE.TextureLoader(this.loadingManager)
    this.cubeTextureLoader = new THREE.CubeTextureLoader(this.loadingManager)

    this.loadingManager.onProgress = (url, loaded, total) => {
      const progress: LoadingProgress = {
        loaded,
        total,
        url,
        progress: total > 0 ? loaded / total : 0,
      }
      this.progressCallbacks.forEach((cb) => cb(progress))
    }

    this.loadingManager.onError = (url) => {
      console.error(`[ResourceManager] Failed to load: ${url}`)
    }
  }

  /**
   * Register a progress callback
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback)
    return () => this.progressCallbacks.delete(callback)
  }

  /**
   * Load a texture from a URL
   */
  loadTexture(url: string): Promise<THREE.Texture> {
    if (this.cachedTextures.has(url)) {
      const cached = this.cachedTextures.get(url)!
      cached.refCount++
      cached.lastUsed = Date.now()
      return Promise.resolve(cached.data as THREE.Texture)
    }

    if (this.pendingLoads.has(url)) {
      return this.pendingLoads.get(url) as Promise<THREE.Texture>
    }

    this.totalRequested++
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          this.cachedTextures.set(url, {
            data: texture,
            refCount: 1,
            lastUsed: Date.now(),
            url,
          })
          this.totalLoaded++
          this.pendingLoads.delete(url)
          this.evictIfNecessary()
          resolve(texture)
        },
        undefined,
        (error) => {
          this.pendingLoads.delete(url)
          reject(error as Error)
        },
      )
    })

    this.pendingLoads.set(url, promise)
    return promise
  }

  /**
   * Load a cube texture from 6 URLs
   */
  loadCubeTexture(urls: string[]): Promise<THREE.CubeTexture> {
    const key = urls.join('|')
    if (this.cachedTextures.has(key)) {
      const cached = this.cachedTextures.get(key)!
      cached.refCount++
      return Promise.resolve(cached.data as THREE.CubeTexture)
    }

    this.totalRequested++
    return new Promise<THREE.CubeTexture>((resolve, reject) => {
      this.cubeTextureLoader.load(
        urls,
        (texture) => {
          this.cachedTextures.set(key, {
            data: texture,
            refCount: 1,
            lastUsed: Date.now(),
            url: key,
          })
          this.totalLoaded++
          resolve(texture)
        },
        undefined,
        (error) => reject(error as Error),
      )
    })
  }

  /**
   * Create a procedural texture (for canvas-based textures)
   */
  createCanvasTexture(
    drawFunction: (ctx: CanvasRenderingContext2D, size: number) => void,
    size: number = 256,
    key?: string,
  ): THREE.CanvasTexture {
    if (key && this.cachedTextures.has(key)) {
      const cached = this.cachedTextures.get(key)!
      cached.refCount++
      return cached.data as THREE.CanvasTexture
    }

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    drawFunction(ctx, size)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace

    if (key) {
      this.cachedTextures.set(key, {
        data: texture,
        refCount: 1,
        lastUsed: Date.now(),
        url: key,
      })
    }

    return texture
  }

  /**
   * Get a cached geometry by name, or create and cache a new one
   */
  getGeometry(name: string, createFn: () => THREE.BufferGeometry): THREE.BufferGeometry {
    if (this.cachedGeometries.has(name)) {
      const cached = this.cachedGeometries.get(name)!
      cached.refCount++
      cached.lastUsed = Date.now()
      return cached.data as THREE.BufferGeometry
    }

    const geometry = createFn()
    this.cachedGeometries.set(name, {
      data: geometry,
      refCount: 1,
      lastUsed: Date.now(),
      url: name,
    })
    return geometry
  }

  /**
   * Get a cached material by name, or create and cache a new one
   */
  getMaterial(name: string, createFn: () => THREE.Material): THREE.Material {
    if (this.cachedMaterials.has(name)) {
      const cached = this.cachedMaterials.get(name)!
      cached.refCount++
      cached.lastUsed = Date.now()
      return cached.data as THREE.Material
    }

    const material = createFn()
    this.cachedMaterials.set(name, {
      data: material,
      refCount: 1,
      lastUsed: Date.now(),
      url: name,
    })
    return material
  }

  /**
   * Load an audio file
   */
  loadAudio(url: string): Promise<HTMLAudioElement> {
    if (this.cachedAudio.has(url)) {
      const cached = this.cachedAudio.get(url)!
      cached.refCount++
      return Promise.resolve(cached.data as HTMLAudioElement)
    }

    this.totalRequested++
    return new Promise((resolve, reject) => {
      const audio = new Audio(url)
      audio.preload = 'auto'
      audio.oncanplaythrough = () => {
        this.cachedAudio.set(url, {
          data: audio,
          refCount: 1,
          lastUsed: Date.now(),
          url,
        })
        this.totalLoaded++
        resolve(audio)
      }
      audio.onerror = () => reject(new Error(`Failed to load audio: ${url}`))
      audio.src = url
    })
  }

  /**
   * Release a reference to a texture
   */
  releaseTexture(url: string): void {
    const cached = this.cachedTextures.get(url)
    if (cached) {
      cached.refCount--
      if (cached.refCount <= 0) {
        cached.data.dispose()
        this.cachedTextures.delete(url)
      }
    }
  }

  /**
   * Release a reference to a geometry
   */
  releaseGeometry(name: string): void {
    const cached = this.cachedGeometries.get(name)
    if (cached) {
      cached.refCount--
      if (cached.refCount <= 0) {
        cached.data.dispose()
        this.cachedGeometries.delete(name)
      }
    }
  }

  /**
   * Release a reference to a material
   */
  releaseMaterial(name: string): void {
    const cached = this.cachedMaterials.get(name)
    if (cached) {
      cached.refCount--
      if (cached.refCount <= 0) {
        cached.data.dispose()
        this.cachedMaterials.delete(name)
      }
    }
  }

  /**
   * Release a reference to an audio resource
   */
  releaseAudio(url: string): void {
    const cached = this.cachedAudio.get(url)
    if (cached) {
      cached.refCount--
      if (cached.refCount <= 0) {
        this.cachedAudio.delete(url)
      }
    }
  }

  /**
   * Get the total loading progress (0-1)
   */
  getLoadingProgress(): number {
    if (this.totalRequested === 0) return 1
    return this.totalLoaded / this.totalRequested
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    textures: number
    geometries: number
    materials: number
    models: number
    audio: number
    totalCached: number
  } {
    return {
      textures: this.cachedTextures.size,
      geometries: this.cachedGeometries.size,
      materials: this.cachedMaterials.size,
      models: this.cachedModels.size,
      audio: this.cachedAudio.size,
      totalCached:
        this.cachedTextures.size +
        this.cachedGeometries.size +
        this.cachedMaterials.size +
        this.cachedModels.size +
        this.cachedAudio.size,
    }
  }

  /**
   * Evict least-recently-used resources if cache exceeds max size
   */
  private evictIfNecessary(): void {
    const total =
      this.cachedTextures.size +
      this.cachedGeometries.size +
      this.cachedMaterials.size

    if (total <= this.maxCacheSize) return

    // Find LRU resources across all caches
    const allResources: Array<{ key: string; cache: Map<string, CachedResource>; lastUsed: number }> = []
    this.cachedTextures.forEach((value, key) => {
      if (value.refCount <= 1) {
        allResources.push({ key, cache: this.cachedTextures, lastUsed: value.lastUsed })
      }
    })
    this.cachedGeometries.forEach((value, key) => {
      if (value.refCount <= 1) {
        allResources.push({ key, cache: this.cachedGeometries, lastUsed: value.lastUsed })
      }
    })
    this.cachedMaterials.forEach((value, key) => {
      if (value.refCount <= 1) {
        allResources.push({ key, cache: this.cachedMaterials, lastUsed: value.lastUsed })
      }
    })

    allResources.sort((a, b) => a.lastUsed - b.lastUsed)

    const toEvict = total - this.maxCacheSize
    for (let i = 0; i < toEvict && i < allResources.length; i++) {
      const { key, cache } = allResources[i]
      const resource = cache.get(key)
      if (resource) {
        if (resource.data && typeof resource.data.dispose === 'function') {
          resource.data.dispose()
        }
        cache.delete(key)
      }
    }
  }

  /**
   * Clear all cached resources
   */
  clearCache(): void {
    this.cachedTextures.forEach((resource) => {
      if (resource.data && typeof resource.data.dispose === 'function') {
        resource.data.dispose()
      }
    })
    this.cachedGeometries.forEach((resource) => {
      if (resource.data && typeof resource.data.dispose === 'function') {
        resource.data.dispose()
      }
    })
    this.cachedMaterials.forEach((resource) => {
      if (resource.data && typeof resource.data.dispose === 'function') {
        resource.data.dispose()
      }
    })

    this.cachedTextures.clear()
    this.cachedGeometries.clear()
    this.cachedMaterials.clear()
    this.cachedModels.clear()
    this.cachedAudio.clear()
    this.pendingLoads.clear()
  }

  /**
   * Dispose of the resource manager
   */
  dispose(): void {
    this.clearCache()
    this.progressCallbacks.clear()
  }

  /**
   * Preload a list of resources
   */
  async preload(urls: string[]): Promise<void> {
    const promises = urls.map((url) => this.loadTexture(url).catch(() => null))
    await Promise.all(promises)
  }
}
