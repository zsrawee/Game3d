// ===================================================================
// Event Bus - Global event communication system
// ===================================================================
// A publish/subscribe event system that decouples game subsystems.
// Used for cross-cutting concerns like UI updates when player health
// changes, achievement tracking when enemies die, etc.
// ===================================================================

import { GameEvent, GameEventType, EventListener } from '../types'

type ListenerMap = Map<GameEventType, Set<EventListener>>

export class EventBus {
  private listeners: ListenerMap = new Map()
  private eventQueue: GameEvent[] = []
  private history: GameEvent[] = []
  private maxHistory: number = 100
  private processing: boolean = false
  private logEvents: boolean = false
  private eventCounts: Map<GameEventType, number> = new Map()

  /**
   * Subscribe to a specific event type
   * @returns An unsubscribe function
   */
  on(eventType: GameEventType, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)
    return () => this.off(eventType, listener)
  }

  /**
   * Subscribe to a specific event type, but only fire once
   */
  once(eventType: GameEventType, listener: EventListener): () => void {
    const wrapper: EventListener = (event) => {
      this.off(eventType, wrapper)
      listener(event)
    }
    return this.on(eventType, wrapper)
  }

  /**
   * Unsubscribe from a specific event type
   */
  off(eventType: GameEventType, listener: EventListener): void {
    const set = this.listeners.get(eventType)
    if (set) {
      set.delete(listener)
      if (set.size === 0) {
        this.listeners.delete(eventType)
      }
    }
  }

  /**
   * Emit an event immediately (synchronous)
   */
  emit(eventType: GameEventType, data?: any, source?: string): void {
    const event: GameEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
      source,
    }

    if (this.logEvents) {
      console.log(`[EventBus] ${eventType}`, data)
    }

    // Track event counts for debugging
    this.eventCounts.set(eventType, (this.eventCounts.get(eventType) || 0) + 1)

    // Add to history (circular buffer)
    this.history.push(event)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }

    // Notify listeners
    const set = this.listeners.get(eventType)
    if (set) {
      const listeners = Array.from(set)
      for (const listener of listeners) {
        try {
          listener(event)
        } catch (error) {
          console.error(`[EventBus] Error in listener for ${eventType}:`, error)
        }
      }
    }
  }

  /**
   * Queue an event to be processed on the next update tick
   */
  queue(eventType: GameEventType, data?: any, source?: string): void {
    this.eventQueue.push({
      type: eventType,
      data,
      timestamp: Date.now(),
      source,
    })
  }

  /**
   * Process all queued events - called by the game loop
   */
  processQueue(): void {
    if (this.processing) return
    this.processing = true

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!
      this.emit(event.type, event.data, event.source)
    }

    this.processing = false
  }

  /**
   * Clear all listeners and queued events
   */
  clear(): void {
    this.listeners.clear()
    this.eventQueue = []
  }

  /**
   * Clear listeners for a specific event type
   */
  clearType(eventType: GameEventType): void {
    this.listeners.delete(eventType)
  }

  /**
   * Get event history for debugging
   */
  getHistory(): GameEvent[] {
    return [...this.history]
  }

  /**
   * Get the count of events emitted for a specific type
   */
  getEventCount(eventType: GameEventType): number {
    return this.eventCounts.get(eventType) || 0
  }

  /**
   * Get all event counts for debugging/analytics
   */
  getAllEventCounts(): Record<string, number> {
    const result: Record<string, number> = {}
    this.eventCounts.forEach((count, type) => {
      result[type] = count
    })
    return result
  }

  /**
   * Enable or disable event logging
   */
  setLogging(enabled: boolean): void {
    this.logEvents = enabled
  }

  /**
   * Get the number of unique event types with listeners
   */
  getListenerCount(): number {
    let total = 0
    this.listeners.forEach((set) => {
      total += set.size
    })
    return total
  }

  /**
   * Check if any listeners exist for a given event type
   */
  hasListeners(eventType: GameEventType): boolean {
    const set = this.listeners.get(eventType)
    return set !== undefined && set.size > 0
  }
}

// Global singleton instance
export const eventBus = new EventBus()
