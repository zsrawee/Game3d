// ===================================================================
// Renderer - Three.js WebGL renderer wrapper
// ===================================================================
// Configures and manages the WebGL renderer, handles window resizing,
// pixel ratio, and provides quality presets for mobile vs desktop.
// ===================================================================

import * as THREE from 'three'
import { CAMERA_FAR, CAMERA_NEAR, CAMERA_FOV } from '../config/GameConfig'

export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra'

export interface RendererConfig {
  canvas?: HTMLCanvasElement
  antialias: boolean
  alpha: boolean
  powerPreference: 'default' | 'high-performance' | 'low-power'
  preserveDrawingBuffer: boolean
  stencil: boolean
  depth: boolean
}

export class Renderer {
  public three: THREE.WebGLRenderer
  public canvas: HTMLCanvasElement
  private pixelRatio: number = 1
  private quality: QualityPreset = 'medium'
  private renderScale: number = 1
  private shadowMapSize: number = 1024
  private resizeObserver: ResizeObserver | null = null
  private container: HTMLElement | null = null
  private width: number = 0
  private height: number = 0
  private maxAnisotropy: number = 1

  constructor(config: RendererConfig, quality: QualityPreset = 'medium') {
    this.three = new THREE.WebGLRenderer({
      canvas: config.canvas,
      antialias: config.antialias,
      alpha: config.alpha,
      powerPreference: config.powerPreference,
      preserveDrawingBuffer: config.preserveDrawingBuffer,
      stencil: config.stencil,
      depth: config.depth,
      failIfMajorPerformanceCaveat: false,
    })

    this.canvas = this.three.domElement
    this.quality = quality
    this.maxAnisotropy = this.three.capabilities.getMaxAnisotropy()
    this.applyQualityPreset(quality)

    // Set up default color space and tone mapping
    this.three.outputColorSpace = THREE.SRGBColorSpace
    this.three.toneMapping = THREE.ACESFilmicToneMapping
    this.three.toneMappingExposure = 1.0

    // Default shadow settings
    this.three.shadowMap.enabled = true
    this.three.shadowMap.type = THREE.PCFSoftShadowMap

    // Make canvas responsive
    this.canvas.style.display = 'block'
    this.canvas.style.width = '100%'
    this.canvas.style.height = '100%'
    this.canvas.style.touchAction = 'none'
  }

  /**
   * Attach the renderer to a container element
   */
  attachTo(container: HTMLElement): void {
    this.container = container
    container.appendChild(this.canvas)
    this.setupResizeHandling()
    this.resize()
  }

  /**
   * Set up automatic resize handling
   */
  private setupResizeHandling(): void {
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', () => this.resize())
      return
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.resize()
    })
    this.resizeObserver.observe(this.container!)
  }

  /**
   * Apply a quality preset
   */
  applyQualityPreset(quality: QualityPreset): void {
    this.quality = quality
    switch (quality) {
      case 'low':
        this.renderScale = 0.6
        this.shadowMapSize = 512
        this.three.shadowMap.enabled = false
        this.three.shadowMap.type = THREE.BasicShadowMap
        this.pixelRatio = Math.min(window.devicePixelRatio, 1.0)
        this.three.toneMappingExposure = 1.0
        break
      case 'medium':
        this.renderScale = 0.8
        this.shadowMapSize = 1024
        this.three.shadowMap.enabled = true
        this.three.shadowMap.type = THREE.PCFShadowMap
        this.pixelRatio = Math.min(window.devicePixelRatio, 1.5)
        this.three.toneMappingExposure = 1.0
        break
      case 'high':
        this.renderScale = 1.0
        this.shadowMapSize = 2048
        this.three.shadowMap.enabled = true
        this.three.shadowMap.type = THREE.PCFSoftShadowMap
        this.pixelRatio = Math.min(window.devicePixelRatio, 2.0)
        this.three.toneMappingExposure = 1.1
        break
      case 'ultra':
        this.renderScale = 1.0
        this.shadowMapSize = 4096
        this.three.shadowMap.enabled = true
        this.three.shadowMap.type = THREE.VSMShadowMap
        this.pixelRatio = Math.min(window.devicePixelRatio, 2.0)
        this.three.toneMappingExposure = 1.15
        break
    }
    this.three.setPixelRatio(this.pixelRatio)
  }

  /**
   * Get the current quality preset
   */
  getQuality(): QualityPreset {
    return this.quality
  }

  /**
   * Set the render scale (0-1, lower = faster but blurrier)
   */
  setRenderScale(scale: number): void {
    this.renderScale = Math.max(0.25, Math.min(2.0, scale))
    this.resize()
  }

  /**
   * Get the current render scale
   */
  getRenderScale(): number {
    return this.renderScale
  }

  /**
   * Set the tone mapping exposure
   */
  setExposure(exposure: number): void {
    this.three.toneMappingExposure = exposure
  }

  /**
   * Set the tone mapping mode
   */
  setToneMapping(mode: THREE.ToneMapping): void {
    this.three.toneMapping = mode
  }

  /**
   * Enable or disable shadows
   */
  setShadowsEnabled(enabled: boolean): void {
    this.three.shadowMap.enabled = enabled
    this.three.shadowMap.needsUpdate = true
  }

  /**
   * Set the shadow map type
   */
  setShadowType(type: THREE.ShadowMapType): void {
    this.three.shadowMap.type = type
    this.three.shadowMap.needsUpdate = true
  }

  /**
   * Resize the renderer to match its container
   */
  resize(): void {
    if (!this.container) return
    const rect = this.container.getBoundingClientRect()
    this.width = rect.width
    this.height = rect.height
    const scaledWidth = Math.floor(this.width * this.renderScale)
    const scaledHeight = Math.floor(this.height * this.renderScale)
    this.three.setSize(scaledWidth, scaledHeight, false)
  }

  /**
   * Get the current viewport size
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height }
  }

  /**
   * Get the aspect ratio
   */
  getAspectRatio(): number {
    if (this.height === 0) return 1
    return this.width / this.height
  }

  /**
   * Get the pixel ratio
   */
  getPixelRatio(): number {
    return this.pixelRatio
  }

  /**
   * Get the max anisotropy supported
   */
  getMaxAnisotropy(): number {
    return this.maxAnisotropy
  }

  /**
   * Create a perspective camera with default settings
   */
  createCamera(fov: number = CAMERA_FOV): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      fov,
      this.getAspectRatio(),
      CAMERA_NEAR,
      CAMERA_FAR,
    )
    return camera
  }

  /**
   * Render a scene with a camera
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.three.render(scene, camera)
  }

  /**
   * Set the clear color and alpha
   */
  setClearColor(color: THREE.ColorRepresentation, alpha: number = 1): void {
    this.three.setClearColor(color, alpha)
  }

  /**
   * Set the viewport
   */
  setViewport(x: number, y: number, width: number, height: number): void {
    this.three.setViewport(x, y, width, height)
  }

  /**
   * Set the scissor test
   */
  setScissorTest(enabled: boolean): void {
    this.three.setScissorTest(enabled)
  }

  /**
   * Force a texture to use the max anisotropy
   */
  applyMaxAnisotropy(texture: THREE.Texture): void {
    texture.anisotropy = this.maxAnisotropy
  }

  /**
   * Get the underlying WebGL renderer
   */
  getWebGLRenderer(): THREE.WebGLRenderer {
    return this.three
  }

  /**
   * Get WebGL info for debugging
   */
  getInfo(): { memory: any; render: any } {
    return {
      memory: this.three.info.memory,
      render: this.three.info.render,
    }
  }

  /**
   * Auto-detect best quality preset based on device
   */
  static detectQuality(): QualityPreset {
    if (typeof navigator === 'undefined') return 'medium'

    // Check for mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )

    // Check hardware concurrency
    const cores = navigator.hardwareConcurrency || 4

    // Check device memory
    const memory = (navigator as any).deviceMemory || 4

    if (isMobile) {
      if (cores >= 8 && memory >= 4) return 'high'
      if (cores >= 4 && memory >= 2) return 'medium'
      return 'low'
    } else {
      if (cores >= 12 && memory >= 8) return 'ultra'
      if (cores >= 8 && memory >= 4) return 'high'
      return 'medium'
    }
  }

  /**
   * Clean up the renderer and free resources
   */
  dispose(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    this.three.dispose()
    this.three.forceContextLoss()
  }
}
