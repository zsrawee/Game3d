// ===================================================================
// Time Manager - Frame-rate independent time tracking
// ===================================================================
// Provides delta time, scaled time, and various time-related utilities
// to all game systems. Supports time scaling for slow-mo effects.
// ===================================================================

export class TimeManager {
  private lastTime: number = 0
  private currentTime: number = 0
  private deltaTime: number = 0
  private unscaledDeltaTime: number = 0
  private totalTime: number = 0
  private unscaledTotalTime: number = 0
  private timeScale: number = 1
  private maxDeltaTime: number = 0.1
  private frameCount: number = 0
  private fps: number = 60
  private fpsAccumulator: number = 0
  private fpsFrameCount: number = 0
  private fpsUpdateInterval: number = 0.5
  private paused: boolean = false
  private static _instance: TimeManager | null = null

  // Time-related callbacks
  private timers: Map<string, TimerData> = new Map()
  private nextTimerId: number = 0

  constructor() {
    this.lastTime = performance.now() / 1000
    this.currentTime = this.lastTime
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): TimeManager {
    if (!TimeManager._instance) {
      TimeManager._instance = new TimeManager()
    }
    return TimeManager._instance
  }

  /**
   * Update the time manager - called once per frame
   */
  update(): void {
    const now = performance.now() / 1000
    this.unscaledDeltaTime = Math.min(now - this.lastTime, this.maxDeltaTime)
    this.lastTime = now
    this.currentTime = now
    this.unscaledTotalTime += this.unscaledDeltaTime

    if (!this.paused) {
      this.deltaTime = this.unscaledDeltaTime * this.timeScale
      this.totalTime += this.deltaTime
      this.frameCount++

      // FPS calculation
      this.fpsAccumulator += this.unscaledDeltaTime
      this.fpsFrameCount++
      if (this.fpsAccumulator >= this.fpsUpdateInterval) {
        this.fps = Math.round(this.fpsFrameCount / this.fpsAccumulator)
        this.fpsAccumulator = 0
        this.fpsFrameCount = 0
      }

      // Update timers
      this.updateTimers(this.deltaTime)
    } else {
      this.deltaTime = 0
    }
  }

  /**
   * Set the global time scale (1 = normal, 0.5 = slow motion, 0 = paused)
   */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0, scale)
  }

  /**
   * Get the current time scale
   */
  getTimeScale(): number {
    return this.timeScale
  }

  /**
   * Get the delta time for this frame (scaled)
   */
  getDeltaTime(): number {
    return this.deltaTime
  }

  /**
   * Get the unscaled delta time (ignores time scale and pause)
   */
  getUnscaledDeltaTime(): number {
    return this.unscaledDeltaTime
  }

  /**
   * Get total elapsed time (scaled)
   */
  getTotalTime(): number {
    return this.totalTime
  }

  /**
   * Get total elapsed time (unscaled)
   */
  getUnscaledTotalTime(): number {
    return this.unscaledTotalTime
  }

  /**
   * Get the current FPS
   */
  getFPS(): number {
    return this.fps
  }

  /**
   * Get the total frame count
   */
  getFrameCount(): number {
    return this.frameCount
  }

  /**
   * Pause the game time
   */
  pause(): void {
    this.paused = true
  }

  /**
   * Resume the game time
   */
  resume(): void {
    this.paused = false
  }

  /**
   * Check if the game is paused
   */
  isPaused(): boolean {
    return this.paused
  }

  /**
   * Toggle pause state
   */
  togglePause(): void {
    this.paused = !this.paused
  }

  /**
   * Set up a timer that fires after a given delay
   * @returns A timer ID that can be used to cancel the timer
   */
  setTimer(callback: () => void, delay: number, repeat: boolean = false): number {
    const id = this.nextTimerId++
    this.timers.set(id.toString(), {
      callback,
      remainingTime: delay,
      initialDelay: delay,
      repeat,
      active: true,
    })
    return id
  }

  /**
   * Cancel a timer by ID
   */
  clearTimer(id: number): void {
    this.timers.delete(id.toString())
  }

  /**
   * Clear all timers
   */
  clearAllTimers(): void {
    this.timers.clear()
  }

  /**
   * Update all active timers
   */
  private updateTimers(dt: number): void {
    this.timers.forEach((timer, id) => {
      if (!timer.active) return
      timer.remainingTime -= dt
      if (timer.remainingTime <= 0) {
        try {
          timer.callback()
        } catch (error) {
          console.error('[TimeManager] Timer callback error:', error)
        }
        if (timer.repeat) {
          timer.remainingTime = timer.initialDelay
        } else {
          this.timers.delete(id)
        }
      }
    })
  }

  /**
   * Get the number of active timers
   */
  getActiveTimerCount(): number {
    return this.timers.size
  }

  /**
   * Reset the time manager (useful for new game sessions)
   */
  reset(): void {
    this.totalTime = 0
    this.unscaledTotalTime = 0
    this.frameCount = 0
    this.deltaTime = 0
    this.unscaledDeltaTime = 0
    this.timeScale = 1
    this.paused = false
    this.timers.clear()
    this.lastTime = performance.now() / 1000
    this.currentTime = this.lastTime
  }

  /**
   * Format a time value (in seconds) as a readable string
   */
  static formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  /**
   * Format time as MM:SS or HH:MM:SS
   */
  static formatClock(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
}

interface TimerData {
  callback: () => void
  remainingTime: number
  initialDelay: number
  repeat: boolean
  active: boolean
}

// Global singleton
export const timeManager = new TimeManager()
