// ===================================================================
// Save Manager - Save and load game state to localStorage
// ===================================================================
// Handles serialization, versioning, and persistence of all game
// state. Supports multiple save slots and auto-save functionality.
// ===================================================================

import { SaveData, QuestSave, GameStatistics, Currencies } from '../types'
import { STORAGE_KEYS, SAVE_VERSION, AUTOSAVE_SLOT } from '../config/GameConfig'
import { Inventory } from '../inventory/Inventory'
import { Player } from '../player/Player'

export class SaveManager {
  private static instance: SaveManager
  private autosaveTimer: number = 0
  private autosaveInterval: number = 60 // seconds
  private isAutosaveEnabled: boolean = true
  private lastSaveTime: number = 0
  private saveInProgress: boolean = false

  private constructor() {}

  /**
   * Get the singleton instance
   */
  static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager()
    }
    return SaveManager.instance
  }

  /**
   * Save the game to a slot
   */
  save(slot: number, data: SaveData): boolean {
    if (this.saveInProgress) return false
    this.saveInProgress = true

    try {
      data.version = SAVE_VERSION
      data.saveTime = Date.now()

      const key = `${STORAGE_KEYS.SAVE_DATA}_slot_${slot}`
      const serialized = JSON.stringify(data)
      localStorage.setItem(key, serialized)

      this.lastSaveTime = Date.now()
      console.info(`[SaveManager] Game saved to slot ${slot}`)
      return true
    } catch (error) {
      console.error('[SaveManager] Save failed:', error)
      return false
    } finally {
      this.saveInProgress = false
    }
  }

  /**
   * Load the game from a slot
   */
  load(slot: number): SaveData | null {
    try {
      const key = `${STORAGE_KEYS.SAVE_DATA}_slot_${slot}`
      const data = localStorage.getItem(key)
      if (!data) return null

      const saveData = JSON.parse(data) as SaveData

      // Version migration if needed
      if (saveData.version !== SAVE_VERSION) {
        const migrated = this.migrateSaveData(saveData)
        if (!migrated) {
          console.warn(`[SaveManager] Save data version mismatch: ${saveData.version} vs ${SAVE_VERSION}`)
          return null
        }
        return migrated
      }

      console.info(`[SaveManager] Game loaded from slot ${slot}`)
      return saveData
    } catch (error) {
      console.error('[SaveManager] Load failed:', error)
      return null
    }
  }

  /**
   * Delete a save slot
   */
  deleteSave(slot: number): boolean {
    try {
      const key = `${STORAGE_KEYS.SAVE_DATA}_slot_${slot}`
      localStorage.removeItem(key)
      console.info(`[SaveManager] Save slot ${slot} deleted`)
      return true
    } catch (error) {
      console.error('[SaveManager] Delete failed:', error)
      return false
    }
  }

  /**
   * Check if a save exists in a slot
   */
  hasSave(slot: number): boolean {
    const key = `${STORAGE_KEYS.SAVE_DATA}_slot_${slot}`
    return localStorage.getItem(key) !== null
  }

  /**
   * Get save info for a slot (without loading full data)
   */
  getSaveInfo(slot: number): { exists: boolean; saveTime: number; level: number; playTime: number; name: string } | null {
    try {
      const key = `${STORAGE_KEYS.SAVE_DATA}_slot_${slot}`
      const data = localStorage.getItem(key)
      if (!data) return null

      const saveData = JSON.parse(data) as SaveData
      return {
        exists: true,
        saveTime: saveData.saveTime,
        level: saveData.player.progression.level,
        playTime: saveData.playTime,
        name: saveData.player.name,
      }
    } catch {
      return null
    }
  }

  /**
   * Get all save slots info
   */
  getAllSaveSlots(): Array<{ slot: number; info: ReturnType<SaveManager['getSaveInfo']> }> {
    const slots = []
    for (let i = 0; i < 5; i++) {
      slots.push({
        slot: i,
        info: this.getSaveInfo(i),
      })
    }
    return slots
  }

  /**
   * Auto-save the game
   */
  autosave(data: SaveData): boolean {
    if (!this.isAutosaveEnabled) return false
    return this.save(AUTOSAVE_SLOT, data)
  }

  /**
   * Update the auto-save timer
   */
  update(deltaTime: number, data: SaveData): void {
    if (!this.isAutosaveEnabled) return

    this.autosaveTimer += deltaTime
    if (this.autosaveTimer >= this.autosaveInterval) {
      this.autosave(data)
      this.autosaveTimer = 0
    }
  }

  /**
   * Set auto-save enabled
   */
  setAutosaveEnabled(enabled: boolean): void {
    this.isAutosaveEnabled = enabled
  }

  /**
   * Set auto-save interval
   */
  setAutosaveInterval(seconds: number): void {
    this.autosaveInterval = Math.max(30, seconds)
  }

  /**
   * Get time since last save
   */
  getTimeSinceLastSave(): number {
    if (this.lastSaveTime === 0) return Infinity
    return (Date.now() - this.lastSaveTime) / 1000
  }

  /**
   * Create save data from game state
   */
  createSaveData(
    player: Player,
    inventory: Inventory,
    quests: QuestSave[],
    achievements: string[],
    statistics: GameStatistics,
    settings: any,
    unlocks: string[],
    playTime: number,
  ): SaveData {
    const playerData = player.serialize()

    return {
      version: SAVE_VERSION,
      saveTime: Date.now(),
      playTime,
      player: playerData,
      inventory: inventory.serialize().map((entry) => ({
        item: inventory.slots[entry.slotIndex].item,
        quantity: entry.quantity,
        slotIndex: entry.slotIndex,
        locked: false,
        acquiredAt: Date.now(),
      })),
      equipment: {
        weapon: inventory.getEquippedItem('weapon'),
        helmet: inventory.getEquippedItem('helmet'),
        chest: inventory.getEquippedItem('chest'),
        legs: inventory.getEquippedItem('legs'),
        boots: inventory.getEquippedItem('boots'),
        gloves: inventory.getEquippedItem('gloves'),
        ring1: inventory.getEquippedItem('ring1'),
        ring2: inventory.getEquippedItem('ring2'),
        amulet: inventory.getEquippedItem('amulet'),
        belt: inventory.getEquippedItem('belt'),
      },
      world: {
        currentWorldId: 'forest_1',
        visitedWorlds: ['forest_1'],
        defeatedBosses: [],
        collectedCollectibles: [],
        unlockedAreas: ['forest_1'],
        worldStates: {},
      },
      quests,
      achievements,
      settings,
      statistics,
      unlocks,
      currencies: inventory.serializeCurrencies(),
    }
  }

  /**
   * Apply save data to game state
   */
  applySaveData(data: SaveData, player: Player, inventory: Inventory): void {
    // Load player
    player.deserialize(data.player)

    // Load inventory
    const items = data.inventory.map((entry) => ({
      itemId: entry.item.id,
      quantity: entry.quantity,
      slotIndex: entry.slotIndex,
    }))
    inventory.deserialize(items)
    inventory.deserializeCurrencies(data.currencies)

    // Load equipment
    inventory.deserializeEquipment(data.equipment)
  }

  /**
   * Save settings
   */
  saveSettings(settings: any): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
    } catch (error) {
      console.error('[SaveManager] Failed to save settings:', error)
    }
  }

  /**
   * Load settings
   */
  loadSettings(): any | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      if (!data) return null
      return JSON.parse(data)
    } catch (error) {
      console.error('[SaveManager] Failed to load settings:', error)
      return null
    }
  }

  /**
   * Save tutorial progress
   */
  saveTutorialProgress(step: number): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TUTORIAL, JSON.stringify({ step, completed: step >= 100 }))
    } catch (error) {
      console.error('[SaveManager] Failed to save tutorial progress:', error)
    }
  }

  /**
   * Load tutorial progress
   */
  loadTutorialProgress(): { step: number; completed: boolean } | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TUTORIAL)
      if (!data) return null
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  /**
   * Save high scores
   */
  saveHighScore(mode: string, score: number): void {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES)
      const scores = data ? JSON.parse(data) : {}
      if (!scores[mode] || scores[mode] < score) {
        scores[mode] = score
        localStorage.setItem(STORAGE_KEYS.HIGH_SCORES, JSON.stringify(scores))
      }
    } catch (error) {
      console.error('[SaveManager] Failed to save high score:', error)
    }
  }

  /**
   * Get high score for a mode
   */
  getHighScore(mode: string): number {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.HIGH_SCORES)
      if (!data) return 0
      const scores = JSON.parse(data)
      return scores[mode] || 0
    } catch {
      return 0
    }
  }

  /**
   * Migrate save data to current version
   */
  private migrateSaveData(data: SaveData): SaveData | null {
    // Future version migrations would go here
    // For now, just return the data as-is if versions match closely
    console.info(`[SaveManager] Migrating from ${data.version} to ${SAVE_VERSION}`)
    data.version = SAVE_VERSION
    return data
  }

  /**
   * Check if local storage is available
   */
  static isStorageAvailable(): boolean {
    try {
      const test = '__test__'
      localStorage.setItem(test, test)
      localStorage.removeItem(test)
      return true
    } catch {
      return false
    }
  }

  /**
   * Clear all saved data (for debugging/reset)
   */
  clearAll(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('aether_realms_')) {
          localStorage.removeItem(key)
        }
      })
      console.info('[SaveManager] All data cleared')
    } catch (error) {
      console.error('[SaveManager] Failed to clear data:', error)
    }
  }

  /**
   * Get storage usage estimate
   */
  getStorageUsage(): { used: number; total: number; percentage: number } | null {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        return navigator.storage.estimate().then((estimate) => ({
          used: estimate.usage || 0,
          total: estimate.quota || 0,
          percentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0,
        })) as any
      }
    } catch {
      // Fall through to localStorage estimate
    }

    // Estimate based on localStorage
    let total = 0
    for (const key in localStorage) {
      if (key.startsWith('aether_realms_')) {
        total += (localStorage[key].length + key.length) * 2 // UTF-16
      }
    }
    return { used: total, total: 5 * 1024 * 1024, percentage: (total / (5 * 1024 * 1024)) * 100 }
  }
}

// Global singleton
export const saveManager = SaveManager.getInstance()
