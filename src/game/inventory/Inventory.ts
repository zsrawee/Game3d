// ===================================================================
// Inventory System - Player inventory management
// ===================================================================
// Manages the player's inventory: adding, removing, stacking items,
// equipment management, and currency tracking.
// ===================================================================

import { Item, InventorySlot, ItemCategory, Currencies } from '../types'
import { ITEMS_DATABASE, getItem } from './ItemsDatabase'
import { INVENTORY_CONFIG } from '../config/GameConfig'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'

export class Inventory {
  public slots: InventorySlot[] = []
  public maxSlots: number = INVENTORY_CONFIG.DEFAULT_SLOTS
  public currencies: Currencies = {
    gold: 0,
    gems: 0,
    tokens: 0,
    shards: 0,
    crystals: 0,
    souls: 0,
    glory: 0,
  }

  private equipment: Map<string, string | null> = new Map([
    ['weapon', null],
    ['helmet', null],
    ['chest', null],
    ['legs', null],
    ['boots', null],
    ['gloves', null],
    ['ring1', null],
    ['ring2', null],
    ['amulet', null],
    ['belt', null],
  ])

  constructor(maxSlots: number = INVENTORY_CONFIG.DEFAULT_SLOTS) {
    this.maxSlots = maxSlots
    this.initializeSlots()
  }

  /**
   * Initialize empty inventory slots
   */
  private initializeSlots(): void {
    for (let i = 0; i < this.maxSlots; i++) {
      this.slots.push({
        item: null as any,
        quantity: 0,
        slotIndex: i,
        locked: false,
        acquiredAt: 0,
      })
    }
  }

  /**
   * Add an item to the inventory
   */
  addItem(itemId: string, quantity: number = 1): boolean {
    const item = getItem(itemId)
    if (!item) return false

    // Handle currency items separately
    if (item.category === ItemCategory.CURRENCY) {
      return this.addCurrency(itemId, quantity)
    }

    // Try to stack with existing items
    if (item.stackable) {
      for (const slot of this.slots) {
        if (slot.item && slot.item.id === itemId && slot.quantity < item.maxStack) {
          const canAdd = Math.min(quantity, item.maxStack - slot.quantity)
          slot.quantity += canAdd
          quantity -= canAdd
          if (quantity <= 0) {
            this.emitInventoryUpdate()
            return true
          }
        }
      }
    }

    // Find empty slot(s)
    while (quantity > 0) {
      const emptySlot = this.findEmptySlot()
      if (!emptySlot) return false

      const addAmount = item.stackable ? Math.min(quantity, item.maxStack) : 1
      emptySlot.item = item
      emptySlot.quantity = addAmount
      emptySlot.acquiredAt = Date.now()
      quantity -= addAmount

      if (!item.stackable) break
    }

    this.emitInventoryUpdate()
    return true
  }

  /**
   * Remove an item from the inventory
   */
  removeItem(itemId: string, quantity: number = 1): boolean {
    let remaining = quantity

    for (const slot of this.slots) {
      if (slot.item && slot.item.id === itemId) {
        const removeAmount = Math.min(remaining, slot.quantity)
        slot.quantity -= removeAmount
        remaining -= removeAmount

        if (slot.quantity <= 0) {
          slot.item = null as any
          slot.quantity = 0
        }

        if (remaining <= 0) {
          this.emitInventoryUpdate()
          return true
        }
      }
    }

    this.emitInventoryUpdate()
    return remaining < quantity
  }

  /**
   * Remove an item from a specific slot
   */
  removeFromSlot(slotIndex: number, quantity: number = 1): boolean {
    const slot = this.slots[slotIndex]
    if (!slot || !slot.item || slot.quantity < quantity) return false

    slot.quantity -= quantity
    if (slot.quantity <= 0) {
      slot.item = null as any
      slot.quantity = 0
    }

    this.emitInventoryUpdate()
    return true
  }

  /**
   * Add currency
   */
  addCurrency(currencyId: string, amount: number): boolean {
    switch (currencyId) {
      case 'gold_coin':
        this.currencies.gold += amount
        break
      case 'gem':
      case 'rare_gem':
        this.currencies.gems += amount
        break
      case 'token':
        this.currencies.tokens += amount
        break
      case 'shard':
        this.currencies.shards += amount
        break
      case 'crystal':
        this.currencies.crystals += amount
        break
      case 'soul':
        this.currencies.souls += amount
        break
      case 'glory':
        this.currencies.glory += amount
        break
      default:
        return false
    }
    this.emitInventoryUpdate()
    return true
  }

  /**
   * Spend currency
   */
  spendCurrency(currency: keyof Currencies, amount: number): boolean {
    if (this.currencies[currency] < amount) return false
    this.currencies[currency] -= amount
    this.emitInventoryUpdate()
    return true
  }

  /**
   * Find an empty slot
   */
  private findEmptySlot(): InventorySlot | null {
    for (const slot of this.slots) {
      if (!slot.item && !slot.locked) {
        return slot
      }
    }
    return null
  }

  /**
   * Find a slot containing an item
   */
  findItemSlot(itemId: string): InventorySlot | null {
    return this.slots.find((slot) => slot.item && slot.item.id === itemId) || null
  }

  /**
   * Get the count of a specific item
   */
  getItemCount(itemId: string): number {
    let count = 0
    for (const slot of this.slots) {
      if (slot.item && slot.item.id === itemId) {
        count += slot.quantity
      }
    }
    return count
  }

  /**
   * Check if the inventory has at least the specified quantity of an item
   */
  hasItem(itemId: string, quantity: number = 1): boolean {
    return this.getItemCount(itemId) >= quantity
  }

  /**
   * Equip an item
   */
  equipItem(itemId: string, slot: string): boolean {
    const item = getItem(itemId)
    if (!item) return false

    // Check if item is in inventory
    if (!this.hasItem(itemId)) return false

    // Check if slot is valid
    if (!this.equipment.has(slot)) return false

    // Remove from inventory
    this.removeItem(itemId, 1)

    // Unequip existing item in slot
    const currentEquipped = this.equipment.get(slot)
    if (currentEquipped) {
      this.addItem(currentEquipped, 1)
    }

    // Equip new item
    this.equipment.set(slot, itemId)
    this.emitInventoryUpdate()
    return true
  }

  /**
   * Unequip an item
   */
  unequipItem(slot: string): boolean {
    const currentEquipped = this.equipment.get(slot)
    if (!currentEquipped) return false

    if (this.addItem(currentEquipped, 1)) {
      this.equipment.set(slot, null)
      this.emitInventoryUpdate()
      return true
    }
    return false
  }

  /**
   * Get equipped item in a slot
   */
  getEquippedItem(slot: string): string | null {
    return this.equipment.get(slot) || null
  }

  /**
   * Get all equipped items
   */
  getAllEquipped(): Record<string, string | null> {
    const result: Record<string, string | null> = {}
    this.equipment.forEach((item, slot) => {
      result[slot] = item
    })
    return result
  }

  /**
   * Use a consumable item
   */
  useConsumable(itemId: string): boolean {
    const item = getItem(itemId)
    if (!item || item.category !== ItemCategory.CONSUMABLE) return false
    if (!this.hasItem(itemId)) return false

    // Remove the item
    this.removeItem(itemId, 1)

    eventBus.emit(
      GameEventType.ITEM_USED,
      {
        itemId,
        itemName: item.name,
        effects: item.effects,
      },
      'Inventory',
    )

    return true
  }

  /**
   * Sort the inventory
   */
  sortInventory(): void {
    // Group by category, then by rarity, then by name
    const items = this.slots
      .filter((slot) => slot.item)
      .sort((a, b) => {
        if (a.item.category !== b.item.category) {
          return a.item.category.localeCompare(b.item.category)
        }
        if (a.item.rarity !== b.item.rarity) {
          return b.item.rarity - a.item.rarity
        }
        return a.item.name.localeCompare(b.item.name)
      })

    // Clear slots
    for (const slot of this.slots) {
      slot.item = null as any
      slot.quantity = 0
    }

    // Refill in sorted order
    for (let i = 0; i < items.length; i++) {
      this.slots[i].item = items[i].item
      this.slots[i].quantity = items[i].quantity
      this.slots[i].acquiredAt = items[i].acquiredAt
    }

    this.emitInventoryUpdate()
  }

  /**
   * Swap two slots
   */
  swapSlots(slotA: number, slotB: number): void {
    if (slotA < 0 || slotA >= this.maxSlots || slotB < 0 || slotB >= this.maxSlots) return
    const temp = { ...this.slots[slotA] }
    this.slots[slotA].item = this.slots[slotB].item
    this.slots[slotA].quantity = this.slots[slotB].quantity
    this.slots[slotA].acquiredAt = this.slots[slotB].acquiredAt
    this.slots[slotB].item = temp.item
    this.slots[slotB].quantity = temp.quantity
    this.slots[slotB].acquiredAt = temp.acquiredAt
    this.emitInventoryUpdate()
  }

  /**
   * Get the total weight of the inventory
   */
  getTotalWeight(): number {
    let weight = 0
    for (const slot of this.slots) {
      if (slot.item) {
        weight += slot.item.weight * slot.quantity
      }
    }
    return weight
  }

  /**
   * Get the total value of the inventory
   */
  getTotalValue(): number {
    let value = 0
    for (const slot of this.slots) {
      if (slot.item) {
        value += slot.item.value * slot.quantity
      }
    }
    return value
  }

  /**
   * Get the number of used slots
   */
  getUsedSlots(): number {
    return this.slots.filter((slot) => slot.item).length
  }

  /**
   * Get the number of free slots
   */
  getFreeSlots(): number {
    return this.maxSlots - this.getUsedSlots()
  }

  /**
   * Expand inventory by N slots
   */
  expandSlots(additionalSlots: number): void {
    const newMax = Math.min(this.maxSlots + additionalSlots, INVENTORY_CONFIG.MAX_SLOTS)
    for (let i = this.maxSlots; i < newMax; i++) {
      this.slots.push({
        item: null as any,
        quantity: 0,
        slotIndex: i,
        locked: false,
        acquiredAt: 0,
      })
    }
    this.maxSlots = newMax
    this.emitInventoryUpdate()
  }

  /**
   * Get all items as an array
   */
  getAllItems(): Array<{ item: Item; quantity: number; slotIndex: number }> {
    const result: Array<{ item: Item; quantity: number; slotIndex: number }> = []
    for (const slot of this.slots) {
      if (slot.item) {
        result.push({
          item: slot.item,
          quantity: slot.quantity,
          slotIndex: slot.slotIndex,
        })
      }
    }
    return result
  }

  /**
   * Get consumable items
   */
  getConsumables(): Array<{ item: Item; quantity: number; slotIndex: number }> {
    return this.getAllItems().filter((entry) => entry.item.category === ItemCategory.CONSUMABLE)
  }

  /**
   * Get equipment items
   */
  getEquipment(): Array<{ item: Item; quantity: number; slotIndex: number }> {
    return this.getAllItems().filter((entry) => entry.item.category === ItemCategory.ARMOR)
  }

  /**
   * Get materials
   */
  getMaterials(): Array<{ item: Item; quantity: number; slotIndex: number }> {
    return this.getAllItems().filter((entry) => entry.item.category === ItemCategory.MATERIAL)
  }

  /**
   * Sell an item
   */
  sellItem(slotIndex: number, quantity: number = 1): boolean {
    const slot = this.slots[slotIndex]
    if (!slot || !slot.item || !slot.item.sellable) return false

    const sellValue = slot.item.value * quantity
    if (this.removeFromSlot(slotIndex, quantity)) {
      this.currencies.gold += sellValue
      this.emitInventoryUpdate()
      return true
    }
    return false
  }

  /**
   * Clear the inventory
   */
  clear(): void {
    for (const slot of this.slots) {
      slot.item = null as any
      slot.quantity = 0
    }
    this.currencies = {
      gold: 0,
      gems: 0,
      tokens: 0,
      shards: 0,
      crystals: 0,
      souls: 0,
      glory: 0,
    }
    this.equipment.forEach((_, key) => this.equipment.set(key, null))
    this.emitInventoryUpdate()
  }

  /**
   * Emit inventory update event
   */
  private emitInventoryUpdate(): void {
    eventBus.emit(
      GameEventType.NOTIFICATION,
      {
        type: 'inventory_update',
        usedSlots: this.getUsedSlots(),
        maxSlots: this.maxSlots,
        currencies: { ...this.currencies },
      },
      'Inventory',
    )
  }

  /**
   * Serialize for save data
   */
  serialize(): Array<{ itemId: string; quantity: number; slotIndex: number }> {
    return this.slots
      .filter((slot) => slot.item)
      .map((slot) => ({
        itemId: slot.item.id,
        quantity: slot.quantity,
        slotIndex: slot.slotIndex,
      }))
  }

  /**
   * Deserialize from save data
   */
  deserialize(data: Array<{ itemId: string; quantity: number; slotIndex: number }>): void {
    this.clear()
    for (const entry of data) {
      const item = getItem(entry.itemId)
      if (item && entry.slotIndex < this.maxSlots) {
        this.slots[entry.slotIndex].item = item
        this.slots[entry.slotIndex].quantity = entry.quantity
        this.slots[entry.slotIndex].acquiredAt = Date.now()
      }
    }
    this.emitInventoryUpdate()
  }

  /**
   * Serialize currencies
   */
  serializeCurrencies(): Currencies {
    return { ...this.currencies }
  }

  /**
   * Deserialize currencies
   */
  deserializeCurrencies(data: Currencies): void {
    this.currencies = { ...data }
  }

  /**
   * Serialize equipment
   */
  serializeEquipment(): Record<string, string | null> {
    const result: Record<string, string | null> = {}
    this.equipment.forEach((item, slot) => {
      result[slot] = item
    })
    return result
  }

  /**
   * Deserialize equipment
   */
  deserializeEquipment(data: Record<string, string | null>): void {
    Object.entries(data).forEach(([slot, itemId]) => {
      if (this.equipment.has(slot)) {
        this.equipment.set(slot, itemId)
      }
    })
  }
}
