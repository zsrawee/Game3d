// ===================================================================
// Game Loop - Main loop with fixed update and variable render
// ===================================================================
// Implements a fixed-timestep update loop with interpolation for
// smooth rendering. Handles pause, slow-motion, and per-system
// update ordering.
// ===================================================================

import { TimeManager } from './TimeManager'
import { FIXED_TIMESTEP, MAX_DELTA_TIME, TARGET_FPS } from '../config/GameConfig'

export interface Updateable {
  update(deltaTime: number): void
  fixedUpdate?(fixedDeltaTime: number): void
  lateUpdate?(deltaTime: number): void
}

export interface Renderable {
  render(alpha: number): void
}

export type UpdateOrder =
  | 'input'
  | 'physics'
  | 'gameplay'
  | 'ai'
  | 'animation'
  | 'particles'
  | 'audio'
  | 'camera'
  | 'render'

export class GameLoop {
  private timeManager: TimeManager
  private updateables: Map<UpdateOrder, Updateable[]> = new Map()
  private renderables: Renderable[] = []
  private accumulator: number = 0
  private isRunning: boolean = false
  private isPaused: boolean = false
  private maxFrameTime: number = MAX_DELTA_TIME
  private fixedTimestep: number = FIXED_TIMESTEP
  private targetFps: number = TARGET_FPS
  private frameId: number | null = null
  private lastFrameTime: number = 0
  private onFrameCallback?: (deltaTime: number, fps: number) => void
  private slowMoFactor: number = 1
  private slowMoTimer: number = 0
  private slowMoDuration: number = 0
  private slowMoTargetFactor: number = 1

  constructor(timeManager: TimeManager) {
    this.timeManager = timeManager
    this.initializeOrders()
  }

  private initializeOrders(): void {
    const orders: UpdateOrder[] = [
      'input',
      'physics',
      'gameplay',
      'ai',
      'animation',
      'particles',
      'audio',
      'camera',
      'render',
    ]
    orders.forEach((order) => {
      this.updateables.set(order, [])
    })
  }

  /**
   * Register an updateable system
   */
  register(updateable: Updateable, order: UpdateOrder = 'gameplay'): void {
    this.updateables.get(order)!.push(updateable)
  }

  /**
   * Unregister an updateable system
   */
  unregister(updateable: Updateable, order?: UpdateOrder): void {
    if (order) {
      const list = this.updateables.get(order)
      if (list) {
        const idx = list.indexOf(updateable)
        if (idx >= 0) list.splice(idx, 1)
      }
    } else {
      this.updateables.forEach((list) => {
        const idx = list.indexOf(updateable)
        if (idx >= 0) list.splice(idx, 1)
      })
    }
  }

  /**
   * Register a renderable system
   */
  registerRenderable(renderable: Renderable): void {
    this.renderables.push(renderable)
  }

  /**
   * Unregister a renderable system
   */
  unregisterRenderable(renderable: Renderable): void {
    const idx = this.renderables.indexOf(renderable)
    if (idx >= 0) this.renderables.splice(idx, 1)
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) return
    this.isRunning = true
    this.isPaused = false
    this.lastFrameTime = performance.now() / 1000
    this.tick()
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    this.isRunning = false
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId)
      this.frameId = null
    }
  }

  /**
   * Pause the game loop
   */
  pause(): void {
    this.isPaused = true
  }

  /**
   * Resume the game loop
   */
  resume(): void {
    if (!this.isPaused) return
    this.isPaused = false
    this.lastFrameTime = performance.now() / 1000
  }

  /**
   * Check if the loop is running
   */
  isGameRunning(): boolean {
    return this.isRunning
  }

  /**
   * Check if the loop is paused
   */
  isGamePaused(): boolean {
    return this.isPaused
  }

  /**
   * Set the fixed timestep (seconds per physics update)
   */
  setFixedTimestep(timestep: number): void {
    this.fixedTimestep = timestep
  }

  /**
   * Set the maximum frame time (prevents spiral of death)
   */
  setMaxFrameTime(maxTime: number): void {
    this.maxFrameTime = maxTime
  }

  /**
   * Set the target FPS (for frame rate limiting)
   */
  setTargetFps(fps: number): void {
    this.targetFps = fps
  }

  /**
   * Set a callback that fires every frame
   */
  onFrame(callback: (deltaTime: number, fps: number) => void): void {
    this.onFrameCallback = callback
  }

  /**
   * Trigger a slow-motion effect
   */
  triggerSlowMo(factor: number, duration: number): void {
    this.slowMoFactor = factor
    this.slowMoTargetFactor = factor
    this.slowMoDuration = duration
    this.slowMoTimer = duration
  }

  /**
   * Reset the slow-motion effect
   */
  resetSlowMo(): void {
    this.slowMoFactor = 1
    this.slowMoTargetFactor = 1
    this.slowMoTimer = 0
  }

  /**
   * Main tick function - called every animation frame
   */
  private tick = (): void => {
    if (!this.isRunning) return

    const now = performance.now() / 1000
    let frameTime = now - this.lastFrameTime
    this.lastFrameTime = now

    // Clamp frame time to prevent spiral of death
    if (frameTime > this.maxFrameTime) {
      frameTime = this.maxFrameTime
    }

    // Update slow motion
    this.updateSlowMo(frameTime)

    // Apply slow motion factor
    const scaledFrameTime = frameTime * this.slowMoFactor
    this.timeManager.update()

    if (!this.isPaused) {
      // Accumulate time for fixed updates
      this.accumulator += scaledFrameTime

      // Run fixed updates at the fixed timestep
      let fixedSteps = 0
      const maxFixedSteps = 5 // Prevent spiral of death

      while (this.accumulator >= this.fixedTimestep && fixedSteps < maxFixedSteps) {
        this.runFixedUpdates(this.fixedTimestep)
        this.accumulator -= this.fixedTimestep
        fixedSteps++
      }

      // If we hit max steps, drop the remaining accumulator
      if (fixedSteps >= maxFixedSteps) {
        this.accumulator = 0
      }

      // Run variable updates
      this.runUpdates(scaledFrameTime)

      // Run late updates
      this.runLateUpdates(scaledFrameTime)
    }

    // Calculate interpolation alpha for rendering
    const alpha = this.accumulator / this.fixedTimestep

    // Render
    this.runRenders(alpha)

    // Fire frame callback
    if (this.onFrameCallback) {
      this.onFrameCallback(scaledFrameTime, this.timeManager.getFPS())
    }

    // Schedule next frame
    this.frameId = requestAnimationFrame(this.tick)
  }

  /**
   * Update slow-motion state
   */
  private updateSlowMo(frameTime: number): void {
    if (this.slowMoTimer > 0) {
      this.slowMoTimer -= frameTime
      if (this.slowMoTimer <= 0) {
        // Smoothly return to normal speed
        this.slowMoFactor = 1
        this.slowMoTimer = 0
      } else if (this.slowMoTimer < this.slowMoDuration * 0.3) {
        // Last 30% - blend back to normal
        const t = 1 - this.slowMoTimer / (this.slowMoDuration * 0.3)
        this.slowMoFactor = this.slowMoTargetFactor + (1 - this.slowMoTargetFactor) * t
      }
    }
  }

  /**
   * Run all fixed updates in order
   */
  private runFixedUpdates(dt: number): void {
    this.updateables.forEach((list) => {
      list.forEach((updateable) => {
        if (updateable.fixedUpdate) {
          try {
            updateable.fixedUpdate(dt)
          } catch (error) {
            console.error('[GameLoop] Fixed update error:', error)
          }
        }
      })
    })
  }

  /**
   * Run all variable updates in order
   */
  private runUpdates(dt: number): void {
    this.updateables.forEach((list) => {
      list.forEach((updateable) => {
        try {
          updateable.update(dt)
        } catch (error) {
          console.error('[GameLoop] Update error:', error)
        }
      })
    })
  }

  /**
   * Run all late updates in order
   */
  private runLateUpdates(dt: number): void {
    this.updateables.forEach((list) => {
      list.forEach((updateable) => {
        if (updateable.lateUpdate) {
          try {
            updateable.lateUpdate(dt)
          } catch (error) {
            console.error('[GameLoop] Late update error:', error)
          }
        }
      })
    })
  }

  /**
   * Run all renderers
   */
  private runRenders(alpha: number): void {
    this.renderables.forEach((renderable) => {
      try {
        renderable.render(alpha)
      } catch (error) {
        console.error('[GameLoop] Render error:', error)
      }
    })
  }

  /**
   * Get the number of registered updateables
   */
  getUpdateableCount(): number {
    let count = 0
    this.updateables.forEach((list) => {
      count += list.length
    })
    return count
  }

  /**
   * Get the number of registered renderables
   */
  getRenderableCount(): number {
    return this.renderables.length
  }

  /**
   * Clear all registered systems
   */
  clear(): void {
    this.updateables.forEach((list) => list.splice(0, list.length))
    this.renderables.splice(0, this.renderables.length)
  }

  /**
   * Get the current fixed timestep
   */
  getFixedTimestep(): number {
    return this.fixedTimestep
  }

  /**
   * Get the current slow-mo factor
   */
  getSlowMoFactor(): number {
    return this.slowMoFactor
  }
}
