// ===================================================================
// Game Engine - Central engine that ties all systems together
// ===================================================================
// The GameEngine is the top-level entry point that owns and manages
// all engine subsystems: renderer, scene manager, camera, time,
// resources, input, and the game loop. Game-specific systems (player,
// enemies, world, etc.) register with the engine on initialization.
// ===================================================================

import * as THREE from 'three'
import { Renderer, QualityPreset } from './Renderer'
import { SceneManager } from './SceneManager'
import { CameraController, DEFAULT_CAMERA_CONFIG } from './CameraController'
import { TimeManager } from './TimeManager'
import { GameLoop, Updateable, UpdateOrder } from './GameLoop'
import { ResourceManager } from './ResourceManager'
import { EventBus, eventBus } from './EventBus'
import { GameState, GameEventType } from '../types'
import { DEFAULT_GAME_CONFIG } from '../config/GameConfig'
import { BiomeType } from '../types'

export class GameEngine {
  public renderer: Renderer
  public sceneManager: SceneManager
  public cameraController: CameraController
  public timeManager: TimeManager
  public gameLoop: GameLoop
  public resourceManager: ResourceManager
  public eventBus: EventBus
  public container: HTMLElement | null = null

  private state: GameState = GameState.BOOTING
  private isInitialized: boolean = false
  private quality: QualityPreset
  private stats: { fps: number; drawCalls: number; triangles: number; vertices: number } = {
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
  }
  private statsUpdateTimer: number = 0
  private onStateChange?: (state: GameState) => void
  private resizeHandler: () => void

  constructor(quality?: QualityPreset) {
    this.quality = quality || Renderer.detectQuality()
    this.eventBus = eventBus
    this.timeManager = new TimeManager()

    // Create renderer
    this.renderer = new Renderer(
      {
        antialias: this.quality !== 'low',
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        stencil: false,
        depth: true,
      },
      this.quality,
    )

    // Create scene manager
    this.sceneManager = new SceneManager()

    // Create camera controller
    this.cameraController = new CameraController(
      this.renderer.getAspectRatio(),
      DEFAULT_CAMERA_CONFIG,
    )

    // Create game loop
    this.gameLoop = new GameLoop(this.timeManager)

    // Create resource manager
    this.resourceManager = new ResourceManager()

    // Set up resize handler
    this.resizeHandler = () => this.handleResize()

    // Register engine itself for stats updates
    this.gameLoop.onFrame((dt, fps) => {
      this.stats.fps = fps
      this.statsUpdateTimer += dt
      if (this.statsUpdateTimer >= 0.5) {
        this.updateStats()
        this.statsUpdateTimer = 0
      }
    })
  }

  /**
   * Initialize the engine and attach to a container element
   */
  initialize(container: HTMLElement): void {
    if (this.isInitialized) {
      console.warn('[GameEngine] Already initialized')
      return
    }

    this.container = container
    this.renderer.attachTo(container)
    window.addEventListener('resize', this.resizeHandler)

    // Set up the default scene
    this.setupDefaultScene()

    this.isInitialized = true
    this.setState(GameState.MAIN_MENU)

    // Start the game loop
    this.gameLoop.start()

    console.info('[GameEngine] Initialized with quality:', this.quality)
  }

  /**
   * Set up the default scene contents
   */
  private setupDefaultScene(): void {
    // Apply default biome (forest)
    this.sceneManager.applyBiome(BiomeType.FOREST)

    // Add a basic ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 32, 32)
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a5f3a,
      roughness: 0.9,
      metalness: 0.0,
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    ground.name = 'ground'
    this.sceneManager.setGroundMesh(ground)

    // Register the renderer for rendering
    this.gameLoop.registerRenderable({
      render: (alpha: number) => {
        this.renderer.render(this.sceneManager.scene, this.cameraController.camera)
      },
    })

    // Register the scene manager for updates
    this.gameLoop.register(
      {
        update: (dt: number) => {
          this.sceneManager.update(dt)
        },
      },
      'render',
    )

    // Register the camera controller for updates
    this.gameLoop.register(
      {
        update: (dt: number) => {
          this.cameraController.update()
        },
      },
      'camera',
    )
  }

  /**
   * Set the current game state
   */
  setState(state: GameState): void {
    if (this.state === state) return
    const oldState = this.state
    this.state = state
    console.info(`[GameEngine] State: ${oldState} -> ${state}`)
    this.eventBus.emit(GameEventType.NOTIFICATION, { state, oldState }, 'GameEngine')
    if (this.onStateChange) {
      this.onStateChange(state)
    }
  }

  /**
   * Get the current game state
   */
  getState(): GameState {
    return this.state
  }

  /**
   * Set a callback for state changes
   */
  onStateChangeHandler(callback: (state: GameState) => void): void {
    this.onStateChange = callback
  }

  /**
   * Register an updateable system
   */
  registerSystem(updateable: Updateable, order: UpdateOrder = 'gameplay'): void {
    this.gameLoop.register(updateable, order)
  }

  /**
   * Unregister an updateable system
   */
  unregisterSystem(updateable: Updateable, order?: UpdateOrder): void {
    this.gameLoop.unregister(updateable, order)
  }

  /**
   * Pause the game
   */
  pause(): void {
    this.gameLoop.pause()
    this.timeManager.pause()
    this.setState(GameState.PAUSED)
    this.eventBus.emit(GameEventType.GAME_PAUSED, {}, 'GameEngine')
  }

  /**
   * Resume the game
   */
  resume(): void {
    this.gameLoop.resume()
    this.timeManager.resume()
    this.setState(GameState.PLAYING)
    this.eventBus.emit(GameEventType.GAME_RESUMED, {}, 'GameEngine')
  }

  /**
   * Check if the game is paused
   */
  isPaused(): boolean {
    return this.gameLoop.isGamePaused()
  }

  /**
   * Trigger a slow-motion effect
   */
  triggerSlowMo(factor: number, duration: number): void {
    this.gameLoop.triggerSlowMo(factor, duration)
    this.timeManager.setTimeScale(factor)
  }

  /**
   * Reset slow-motion
   */
  resetSlowMo(): void {
    this.gameLoop.resetSlowMo()
    this.timeManager.setTimeScale(1)
  }

  /**
   * Handle window/container resize
   */
  private handleResize(): void {
    this.renderer.resize()
    this.cameraController.setAspectRatio(this.renderer.getAspectRatio())
  }

  /**
   * Update the stats
   */
  private updateStats(): void {
    const info = this.renderer.getInfo()
    this.stats.drawCalls = info.render.calls
    this.stats.triangles = info.render.triangles
    this.stats.vertices = info.render.vertices + info.render.points + info.render.lines
  }

  /**
   * Get the current stats
   */
  getStats(): { fps: number; drawCalls: number; triangles: number; vertices: number } {
    return { ...this.stats }
  }

  /**
   * Get the current quality preset
   */
  getQuality(): QualityPreset {
    return this.quality
  }

  /**
   * Change the quality preset
   */
  setQuality(quality: QualityPreset): void {
    this.quality = quality
    this.renderer.applyQualityPreset(quality)
    console.info('[GameEngine] Quality set to:', quality)
  }

  /**
   * Get the current game configuration
   */
  getConfig(): typeof DEFAULT_GAME_CONFIG {
    return DEFAULT_GAME_CONFIG
  }

  /**
   * Take a screenshot of the current frame
   */
  takeScreenshot(): string {
    this.renderer.render(this.sceneManager.scene, this.cameraController.camera)
    return this.renderer.three.domElement.toDataURL('image/png')
  }

  /**
   * Get the main scene
   */
  getScene(): THREE.Scene {
    return this.sceneManager.scene
  }

  /**
   * Get the main camera
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.cameraController.camera
  }

  /**
   * Dispose of all resources and clean up
   */
  dispose(): void {
    this.gameLoop.stop()
    window.removeEventListener('resize', this.resizeHandler)
    this.sceneManager.dispose()
    this.resourceManager.dispose()
    this.renderer.dispose()
    this.eventBus.clear()
    this.isInitialized = false
    console.info('[GameEngine] Disposed')
  }
}

// Global game engine singleton (lazily created)
let gameEngineInstance: GameEngine | null = null

export function getGameEngine(): GameEngine {
  if (!gameEngineInstance) {
    throw new Error('GameEngine not initialized. Call createGameEngine() first.')
  }
  return gameEngineInstance
}

export function createGameEngine(quality?: QualityPreset): GameEngine {
  if (gameEngineInstance) {
    console.warn('[GameEngine] Instance already exists, returning existing one')
    return gameEngineInstance
  }
  gameEngineInstance = new GameEngine(quality)
  return gameEngineInstance
}

export function disposeGameEngine(): void {
  if (gameEngineInstance) {
    gameEngineInstance.dispose()
    gameEngineInstance = null
  }
}
