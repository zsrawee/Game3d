// ===================================================================
// Input Manager - Unified input handling for touch and keyboard
// ===================================================================
// Coordinates input from multiple sources (touch, keyboard, mouse)
// and exposes a unified state to game systems. Designed primarily
// for mobile touch input with keyboard/mouse as desktop fallback.
// ===================================================================

import { TouchData, JoystickState } from '../types'

export class InputManager {
  private touches: Map<number, TouchData> = new Map()
  private keys: Set<string> = new Set()
  private keysPressed: Set<string> = new Set()
  private keysReleased: Set<string> = new Set()
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 }
  private mouseDelta: { x: number; y: number } = { x: 0, y: 0 }
  private mouseButtons: Set<number> = new Set()
  private mouseButtonsPressed: Set<number> = new Set()
  private mouseButtonsReleased: Set<number> = new Set()
  private wheelDelta: number = 0

  private joystick: JoystickState = {
    active: false,
    position: { x: 0, y: 0 },
    direction: { x: 0, y: 0 },
    magnitude: 0,
    angle: 0,
  }

  private actionButtons: Map<string, boolean> = new Map()
  private actionButtonsPressed: Map<string, boolean> = new Map()
  private actionButtonsReleased: Map<string, boolean> = new Map()

  private isTouchDevice: boolean = false
  private inputElement: HTMLElement | null = null
  private enabled: boolean = true

  // Bound event handlers (for proper removal)
  private boundTouchStart: (e: TouchEvent) => void
  private boundTouchMove: (e: TouchEvent) => void
  private boundTouchEnd: (e: TouchEvent) => void
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundKeyUp: (e: KeyboardEvent) => void
  private boundMouseDown: (e: MouseEvent) => void
  private boundMouseMove: (e: MouseEvent) => void
  private boundMouseUp: (e: MouseEvent) => void
  private boundWheel: (e: WheelEvent) => void
  private boundContextMenu: (e: Event) => void

  constructor() {
    // Check for window (SSR safe)
    if (typeof window !== 'undefined') {
      this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    } else {
      this.isTouchDevice = false
    }
    this.boundTouchStart = this.onTouchStart.bind(this)
    this.boundTouchMove = this.onTouchMove.bind(this)
    this.boundTouchEnd = this.onTouchEnd.bind(this)
    this.boundKeyDown = this.onKeyDown.bind(this)
    this.boundKeyUp = this.onKeyUp.bind(this)
    this.boundMouseDown = this.onMouseDown.bind(this)
    this.boundMouseMove = this.onMouseMove.bind(this)
    this.boundMouseUp = this.onMouseUp.bind(this)
    this.boundWheel = this.onWheel.bind(this)
    this.boundContextMenu = (e) => e.preventDefault()
  }

  /**
   * Attach input listeners to an element
   */
  attach(element: HTMLElement): void {
    this.inputElement = element
    element.addEventListener('touchstart', this.boundTouchStart, { passive: false })
    element.addEventListener('touchmove', this.boundTouchMove, { passive: false })
    element.addEventListener('touchend', this.boundTouchEnd, { passive: false })
    element.addEventListener('touchcancel', this.boundTouchEnd, { passive: false })

    window.addEventListener('keydown', this.boundKeyDown)
    window.addEventListener('keyup', this.boundKeyUp)

    element.addEventListener('mousedown', this.boundMouseDown)
    element.addEventListener('mousemove', this.boundMouseMove)
    element.addEventListener('mouseup', this.boundMouseUp)
    element.addEventListener('wheel', this.boundWheel, { passive: false })
    element.addEventListener('contextmenu', this.boundContextMenu)
  }

  /**
   * Detach all input listeners
   */
  detach(): void {
    if (!this.inputElement) return
    const el = this.inputElement
    el.removeEventListener('touchstart', this.boundTouchStart)
    el.removeEventListener('touchmove', this.boundTouchMove)
    el.removeEventListener('touchend', this.boundTouchEnd)

    window.removeEventListener('keydown', this.boundKeyDown)
    window.removeEventListener('keyup', this.boundKeyUp)

    el.removeEventListener('mousedown', this.boundMouseDown)
    el.removeEventListener('mousemove', this.boundMouseMove)
    el.removeEventListener('mouseup', this.boundMouseUp)
    el.removeEventListener('wheel', this.boundWheel)
    el.removeEventListener('contextmenu', this.boundContextMenu)

    this.inputElement = null
  }

  /**
   * Enable or disable input
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.clearAllInput()
    }
  }

  /**
   * Check if input is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Check if this is a touch device
   */
  isMobile(): boolean {
    return this.isTouchDevice
  }

  // -----------------------------------------------------------------
  // Touch event handlers
  // -----------------------------------------------------------------

  private onTouchStart(e: TouchEvent): void {
    if (!this.enabled) return
    e.preventDefault()

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      const touchData: TouchData = {
        id: touch.identifier,
        position: { x: touch.clientX, y: touch.clientY },
        startPosition: { x: touch.clientX, y: touch.clientY },
        delta: { x: 0, y: 0 },
        startTime: Date.now(),
        duration: 0,
        phase: 'start',
        target: touch.target as HTMLElement,
      }
      this.touches.set(touch.identifier, touchData)
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.enabled) return
    e.preventDefault()

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      const existing = this.touches.get(touch.identifier)
      if (existing) {
        existing.delta = {
          x: touch.clientX - existing.position.x,
          y: touch.clientY - existing.position.y,
        }
        existing.position = { x: touch.clientX, y: touch.clientY }
        existing.duration = (Date.now() - existing.startTime) / 1000
        existing.phase = 'move'
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (!this.enabled) return
    e.preventDefault()

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      const existing = this.touches.get(touch.identifier)
      if (existing) {
        existing.phase = 'end'
        existing.duration = (Date.now() - existing.startTime) / 1000
        // Remove after a brief delay to allow end-of-touch checks
        setTimeout(() => this.touches.delete(touch.identifier), 50)
      }
    }
  }

  // -----------------------------------------------------------------
  // Keyboard event handlers
  // -----------------------------------------------------------------

  private onKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return
    const key = e.key.toLowerCase()
    if (!this.keys.has(key)) {
      this.keysPressed.add(key)
    }
    this.keys.add(key)

    // Prevent default for game-related keys
    const preventKeys = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ']
    if (preventKeys.includes(key)) {
      e.preventDefault()
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    if (!this.enabled) return
    const key = e.key.toLowerCase()
    this.keys.delete(key)
    this.keysReleased.add(key)
  }

  // -----------------------------------------------------------------
  // Mouse event handlers
  // -----------------------------------------------------------------

  private onMouseDown(e: MouseEvent): void {
    if (!this.enabled) return
    if (!this.mouseButtons.has(e.button)) {
      this.mouseButtonsPressed.add(e.button)
    }
    this.mouseButtons.add(e.button)
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.enabled || !this.inputElement) return
    const rect = this.inputElement.getBoundingClientRect()
    const newX = e.clientX - rect.left
    const newY = e.clientY - rect.top
    this.mouseDelta = {
      x: newX - this.mousePosition.x,
      y: newY - this.mousePosition.y,
    }
    this.mousePosition = { x: newX, y: newY }
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.enabled) return
    this.mouseButtons.delete(e.button)
    this.mouseButtonsReleased.add(e.button)
  }

  private onWheel(e: WheelEvent): void {
    if (!this.enabled) return
    e.preventDefault()
    this.wheelDelta = e.deltaY
  }

  // -----------------------------------------------------------------
  // Joystick control
  // -----------------------------------------------------------------

  /**
   * Update the virtual joystick state (called by TouchControls UI)
   */
  updateJoystick(state: Partial<JoystickState>): void {
    Object.assign(this.joystick, state)
  }

  /**
   * Get the current joystick state
   */
  getJoystick(): JoystickState {
    return { ...this.joystick }
  }

  /**
   * Check if the joystick is active
   */
  isJoystickActive(): boolean {
    return this.joystick.active
  }

  /**
   * Get the joystick direction (normalized -1 to 1)
   */
  getJoystickDirection(): { x: number; y: number } {
    return { ...this.joystick.direction }
  }

  /**
   * Get the joystick magnitude (0 to 1)
   */
  getJoystickMagnitude(): number {
    return this.joystick.magnitude
  }

  // -----------------------------------------------------------------
  // Action button control
  // -----------------------------------------------------------------

  /**
   * Set the state of an action button (called by UI buttons)
   */
  setActionButton(name: string, pressed: boolean): void {
    if (pressed && !this.actionButtons.get(name)) {
      this.actionButtonsPressed.set(name, true)
    } else if (!pressed && this.actionButtons.get(name)) {
      this.actionButtonsReleased.set(name, true)
    }
    this.actionButtons.set(name, pressed)
  }

  /**
   * Check if an action button is currently held
   */
  getActionButton(name: string): boolean {
    return this.actionButtons.get(name) || false
  }

  /**
   * Check if an action button was pressed this frame
   */
  wasActionButtonPressed(name: string): boolean {
    return this.actionButtonsPressed.get(name) || false
  }

  /**
   * Check if an action button was released this frame
   */
  wasActionButtonReleased(name: string): boolean {
    return this.actionButtonsReleased.get(name) || false
  }

  // -----------------------------------------------------------------
  // Keyboard query
  // -----------------------------------------------------------------

  /**
   * Check if a key is currently held
   */
  getKey(key: string): boolean {
    return this.keys.has(key.toLowerCase())
  }

  /**
   * Check if a key was pressed this frame
   */
  wasKeyPressed(key: string): boolean {
    return this.keysPressed.has(key.toLowerCase())
  }

  /**
   * Check if a key was released this frame
   */
  wasKeyReleased(key: string): boolean {
    return this.keysReleased.has(key.toLowerCase())
  }

  /**
   * Get all currently held keys
   */
  getHeldKeys(): string[] {
    return Array.from(this.keys)
  }

  // -----------------------------------------------------------------
  // Mouse query
  // -----------------------------------------------------------------

  /**
   * Get the mouse position relative to the input element
   */
  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition }
  }

  /**
   * Get the mouse delta for this frame
   */
  getMouseDelta(): { x: number; y: number } {
    return { ...this.mouseDelta }
  }

  /**
   * Check if a mouse button is held (0=left, 1=middle, 2=right)
   */
  getMouseButton(button: number): boolean {
    return this.mouseButtons.has(button)
  }

  /**
   * Check if a mouse button was pressed this frame
   */
  wasMouseButtonPressed(button: number): boolean {
    return this.mouseButtonsPressed.has(button)
  }

  /**
   * Check if a mouse button was released this frame
   */
  wasMouseButtonReleased(button: number): boolean {
    return this.mouseButtonsReleased.has(button)
  }

  /**
   * Get the wheel delta for this frame
   */
  getWheelDelta(): number {
    return this.wheelDelta
  }

  // -----------------------------------------------------------------
  // Touch query
  // -----------------------------------------------------------------

  /**
   * Get all active touches
   */
  getTouches(): TouchData[] {
    return Array.from(this.touches.values())
  }

  /**
   * Get a specific touch by ID
   */
  getTouch(id: number): TouchData | undefined {
    return this.touches.get(id)
  }

  /**
   * Get the number of active touches
   */
  getTouchCount(): number {
    return this.touches.size
  }

  /**
   * Check if any touch is active
   */
  hasTouch(): boolean {
    return this.touches.size > 0
  }

  // -----------------------------------------------------------------
  // Frame update (called at end of frame to clear per-frame state)
  // -----------------------------------------------------------------

  /**
   * Clear per-frame input state (call at the end of each frame)
   */
  lateUpdate(): void {
    this.keysPressed.clear()
    this.keysReleased.clear()
    this.mouseButtonsPressed.clear()
    this.mouseButtonsReleased.clear()
    this.actionButtonsPressed.clear()
    this.actionButtonsReleased.clear()
    this.mouseDelta = { x: 0, y: 0 }
    this.wheelDelta = 0
  }

  /**
   * Clear all input state (for pause/disable)
   */
  clearAllInput(): void {
    this.touches.clear()
    this.keys.clear()
    this.keysPressed.clear()
    this.keysReleased.clear()
    this.mouseButtons.clear()
    this.mouseButtonsPressed.clear()
    this.mouseButtonsReleased.clear()
    this.actionButtons.clear()
    this.actionButtonsPressed.clear()
    this.actionButtonsReleased.clear()
    this.joystick = {
      active: false,
      position: { x: 0, y: 0 },
      direction: { x: 0, y: 0 },
      magnitude: 0,
      angle: 0,
    }
    this.mouseDelta = { x: 0, y: 0 }
    this.wheelDelta = 0
  }

  /**
   * Get the input element
   */
  getElement(): HTMLElement | null {
    return this.inputElement
  }

  /**
   * Check if the user is using touch input
   */
  isUsingTouch(): boolean {
    return this.touches.size > 0
  }

  /**
   * Simulate an action button press (for testing or scripted events)
   */
  simulateActionButton(name: string, pressed: boolean): void {
    this.setActionButton(name, pressed)
  }

  /**
   * Simulate a key press (for testing or scripted events)
   */
  simulateKey(key: string, pressed: boolean): void {
    if (pressed) {
      if (!this.keys.has(key.toLowerCase())) {
        this.keysPressed.add(key.toLowerCase())
      }
      this.keys.add(key.toLowerCase())
    } else {
      this.keys.delete(key.toLowerCase())
      this.keysReleased.add(key.toLowerCase())
    }
  }
}

// Global singleton
export const inputManager = new InputManager()
