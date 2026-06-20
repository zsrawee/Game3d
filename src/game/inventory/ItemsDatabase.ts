// ===================================================================
// Items Database - All item definitions (non-weapon)
// ===================================================================
// Static definitions for all non-weapon items: consumables, materials,
// armor, accessories, and currencies.
// ===================================================================

import { Item, ItemCategory, Rarity, EffectType, DamageType } from '../types'

export const ITEMS_DATABASE: Record<string, Item> = {
  // -----------------------------------------------------------------
  // Consumables - Potions and consumable items
  // -----------------------------------------------------------------

  health_potion: {
    id: 'health_potion',
    name: 'Health Potion',
    description: 'Restores 50 health instantly.',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.COMMON,
    icon: 'potion_red',
    stackable: true,
    maxStack: 20,
    value: 25,
    weight: 0.2,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['consumable', 'healing'],
    effects: [
      { type: EffectType.HEAL, magnitude: 50, duration: 0, chance: 1, stacking: false },
    ],
  },

  large_health_potion: {
    id: 'large_health_potion',
    name: 'Large Health Potion',
    description: 'Restores 150 health instantly.',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.UNCOMMON,
    icon: 'potion_red',
    stackable: true,
    maxStack: 10,
    value: 75,
    weight: 0.3,
    level: 5,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['consumable', 'healing'],
    effects: [
      { type: EffectType.HEAL, magnitude: 150, duration: 0, chance: 1, stacking: false },
    ],
  },

  mana_potion: {
    id: 'mana_potion',
    name: 'Mana Potion',
    description: 'Restores 50 mana instantly.',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.COMMON,
    icon: 'potion_blue',
    stackable: true,
    maxStack: 20,
    value: 30,
    weight: 0.2,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['consumable', 'mana'],
    effects: [
      { type: EffectType.MANA_RESTORE, magnitude: 50, duration: 0, chance: 1, stacking: false },
    ],
  },

  stamina_elixir: {
    id: 'stamina_elixir',
    name: 'Stamina Elixir',
    description: 'Restores 80 stamina instantly.',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.COMMON,
    icon: 'potion_green',
    stackable: true,
    maxStack: 20,
    value: 20,
    weight: 0.2,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['consumable', 'stamina'],
    effects: [
      { type: EffectType.STAMINA_RESTORE, magnitude: 80, duration: 0, chance: 1, stacking: false },
    ],
  },

  speed_elixir: {
    id: 'speed_elixir',
    name: 'Speed Elixir',
    description: 'Increases movement speed by 50% for 30 seconds.',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.UNCOMMON,
    icon: 'potion_yellow',
    stackable: true,
    maxStack: 10,
    value: 80,
    weight: 0.3,
    level: 3,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['consumable', 'buff'],
    effects: [
      { type: EffectType.BUFF_SPEED, magnitude: 3, duration: 30, chance: 1, stacking: false },
    ],
  },

  strength_elixir: {
    id: 'strength_elixir',
    name: 'Strength Elixir',
    description: 'Increases attack by 20 for 60 seconds.',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.RARE,
    icon: 'potion_red',
    stackable: true,
    maxStack: 10,
    value: 150,
    weight: 0.3,
    level: 5,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['consumable', 'buff'],
    effects: [
      { type: EffectType.BUFF_ATTACK, magnitude: 20, duration: 60, chance: 1, stacking: false },
    ],
  },

  defense_elixir: {
    id: 'defense_elixir',
    name: 'Defense Elixir',
    description: 'Increases defense by 15 for 60 seconds.',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.RARE,
    icon: 'potion_blue',
    stackable: true,
    maxStack: 10,
    value: 150,
    weight: 0.3,
    level: 5,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['consumable', 'buff'],
    effects: [
      { type: EffectType.BUFF_DEFENSE, magnitude: 15, duration: 60, chance: 1, stacking: false },
    ],
  },

  invincibility_potion: {
    id: 'invincibility_potion',
    name: 'Invincibility Potion',
    description: 'Become invincible for 5 seconds.',
    category: ItemCategory.CONSUMABLE,
    rarity: Rarity.EPIC,
    icon: 'potion_gold',
    stackable: true,
    maxStack: 5,
    value: 500,
    weight: 0.3,
    level: 10,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['consumable', 'buff', 'rare'],
    effects: [
      { type: EffectType.SHIELD, magnitude: 99999, duration: 5, chance: 1, stacking: false },
    ],
  },

  // -----------------------------------------------------------------
  // Materials - Crafting and upgrade materials
  // -----------------------------------------------------------------

  gold_coin: {
    id: 'gold_coin',
    name: 'Gold Coin',
    description: 'Currency used for purchases.',
    category: ItemCategory.CURRENCY,
    rarity: Rarity.COMMON,
    icon: 'coin_gold',
    stackable: true,
    maxStack: 999999,
    value: 1,
    weight: 0,
    level: 1,
    tradeable: false,
    sellable: false,
    destructible: false,
    tags: ['currency'],
  },

  gem: {
    id: 'gem',
    name: 'Gem',
    description: 'A precious gem used for upgrades.',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.UNCOMMON,
    icon: 'gem',
    stackable: true,
    maxStack: 999,
    value: 50,
    weight: 0.05,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: false,
    tags: ['material', 'upgrade'],
  },

  rare_gem: {
    id: 'rare_gem',
    name: 'Rare Gem',
    description: 'A rare gem with magical properties.',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.RARE,
    icon: 'gem_rare',
    stackable: true,
    maxStack: 999,
    value: 200,
    weight: 0.05,
    level: 5,
    tradeable: true,
    sellable: true,
    destructible: false,
    tags: ['material', 'upgrade', 'rare'],
  },

  crystal: {
    id: 'crystal',
    name: 'Crystal',
    description: 'A magical crystal that pulses with energy.',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.RARE,
    icon: 'crystal',
    stackable: true,
    maxStack: 999,
    value: 300,
    weight: 0.1,
    level: 5,
    tradeable: true,
    sellable: true,
    destructible: false,
    tags: ['material', 'magic'],
  },

  dragon_scale: {
    id: 'dragon_scale',
    name: 'Dragon Scale',
    description: 'A shimmering scale from a dragon. Used to craft legendary items.',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.EPIC,
    icon: 'scale',
    stackable: true,
    maxStack: 99,
    value: 1000,
    weight: 0.5,
    level: 15,
    tradeable: true,
    sellable: true,
    destructible: false,
    tags: ['material', 'legendary'],
  },

  ancient_relic: {
    id: 'ancient_relic',
    name: 'Ancient Relic',
    description: 'A relic from a forgotten age. Extremely valuable.',
    category: ItemCategory.TREASURE,
    rarity: Rarity.LEGENDARY,
    icon: 'relic',
    stackable: true,
    maxStack: 99,
    value: 5000,
    weight: 0.5,
    level: 20,
    tradeable: true,
    sellable: true,
    destructible: false,
    tags: ['treasure', 'rare'],
  },

  stone_chunk: {
    id: 'stone_chunk',
    name: 'Stone Chunk',
    description: 'A chunk of stone. Used for basic crafting.',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
    icon: 'stone',
    stackable: true,
    maxStack: 999,
    value: 5,
    weight: 1,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['material', 'common'],
  },

  wood: {
    id: 'wood',
    name: 'Wood',
    description: 'A piece of wood. Used for crafting.',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
    icon: 'wood',
    stackable: true,
    maxStack: 999,
    value: 3,
    weight: 0.5,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['material', 'common'],
  },

  arrow: {
    id: 'arrow',
    name: 'Arrow',
    description: 'Standard ammunition for bows.',
    category: ItemCategory.MATERIAL,
    rarity: Rarity.COMMON,
    icon: 'arrow',
    stackable: true,
    maxStack: 999,
    value: 1,
    weight: 0.05,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['ammunition'],
  },

  // -----------------------------------------------------------------
  // Armor - Defensive equipment
  // -----------------------------------------------------------------

  leather_armor: {
    id: 'leather_armor',
    name: 'Leather Armor',
    description: 'Basic leather armor providing light protection.',
    category: ItemCategory.ARMOR,
    rarity: Rarity.COMMON,
    icon: 'armor_leather',
    stackable: false,
    maxStack: 1,
    value: 80,
    weight: 3,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['armor', 'chest'],
    stats: {
      defense: 5,
      armor: 10,
      maxHealth: 20,
    },
  },

  chainmail: {
    id: 'chainmail',
    name: 'Chainmail Armor',
    description: 'Interlocked metal rings providing solid protection.',
    category: ItemCategory.ARMOR,
    rarity: Rarity.UNCOMMON,
    icon: 'armor_chain',
    stackable: false,
    maxStack: 1,
    value: 250,
    weight: 8,
    level: 5,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['armor', 'chest'],
    stats: {
      defense: 12,
      armor: 25,
      maxHealth: 50,
    },
  },

  plate_armor: {
    id: 'plate_armor',
    name: 'Plate Armor',
    description: 'Full plate armor providing excellent protection.',
    category: ItemCategory.ARMOR,
    rarity: Rarity.RARE,
    icon: 'armor_plate',
    stackable: false,
    maxStack: 1,
    value: 800,
    weight: 15,
    level: 10,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['armor', 'chest'],
    stats: {
      defense: 25,
      armor: 50,
      maxHealth: 100,
    },
  },

  dragon_armor: {
    id: 'dragon_armor',
    name: 'Dragon Armor',
    description: 'Armor forged from dragon scales. Nearly impenetrable.',
    category: ItemCategory.ARMOR,
    rarity: Rarity.LEGENDARY,
    icon: 'armor_dragon',
    stackable: false,
    maxStack: 1,
    value: 5000,
    weight: 12,
    level: 25,
    tradeable: false,
    sellable: false,
    destructible: false,
    tags: ['armor', 'chest', 'legendary'],
    stats: {
      defense: 50,
      armor: 100,
      maxHealth: 250,
      magicResistance: 30,
    },
  },

  // -----------------------------------------------------------------
  // Accessories
  // -----------------------------------------------------------------

  ring_of_power: {
    id: 'ring_of_power',
    name: 'Ring of Power',
    description: 'Increases attack power significantly.',
    category: ItemCategory.ARMOR,
    rarity: Rarity.EPIC,
    icon: 'ring',
    stackable: false,
    maxStack: 1,
    value: 1000,
    weight: 0.1,
    level: 10,
    tradeable: true,
    sellable: true,
    destructible: false,
    tags: ['accessory', 'ring'],
    stats: {
      attack: 15,
      criticalChance: 0.05,
    },
  },

  amulet_of_wisdom: {
    id: 'amulet_of_wisdom',
    name: 'Amulet of Wisdom',
    description: 'Increases mana and mana regeneration.',
    category: ItemCategory.ARMOR,
    rarity: Rarity.RARE,
    icon: 'amulet',
    stackable: false,
    maxStack: 1,
    value: 600,
    weight: 0.1,
    level: 8,
    tradeable: true,
    sellable: true,
    destructible: false,
    tags: ['accessory', 'amulet'],
    stats: {
      maxMana: 80,
      cooldownReduction: 0.15,
    },
  },

  ancient_amulet: {
    id: 'ancient_amulet',
    name: 'Ancient Amulet',
    description: 'An ancient amulet pulsing with powerful magic.',
    category: ItemCategory.ARMOR,
    rarity: Rarity.LEGENDARY,
    icon: 'amulet',
    stackable: false,
    maxStack: 1,
    value: 3000,
    weight: 0.1,
    level: 20,
    tradeable: false,
    sellable: false,
    destructible: false,
    tags: ['accessory', 'amulet', 'legendary'],
    stats: {
      maxHealth: 100,
      maxMana: 100,
      attack: 10,
      defense: 10,
      criticalChance: 0.1,
      cooldownReduction: 0.2,
    },
  },

  royal_crown: {
    id: 'royal_crown',
    name: 'Royal Crown',
    description: 'The crown of a fallen king. Bestows great power.',
    category: ItemCategory.ARMOR,
    rarity: Rarity.MYTHIC,
    icon: 'crown',
    stackable: false,
    maxStack: 1,
    value: 10000,
    weight: 0.5,
    level: 30,
    tradeable: false,
    sellable: false,
    destructible: false,
    tags: ['accessory', 'helmet', 'mythic'],
    stats: {
      maxHealth: 200,
      maxMana: 200,
      attack: 25,
      defense: 25,
      criticalChance: 0.15,
      criticalDamage: 0.5,
      magicResistance: 25,
      armor: 50,
    },
  },

  // -----------------------------------------------------------------
  // Treasure - Valuable items to sell
  // -----------------------------------------------------------------

  epic_treasure: {
    id: 'epic_treasure',
    name: 'Epic Treasure',
    description: 'A valuable treasure chest. Sell for high price.',
    category: ItemCategory.TREASURE,
    rarity: Rarity.EPIC,
    icon: 'chest',
    stackable: true,
    maxStack: 99,
    value: 800,
    weight: 1,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['treasure'],
  },
}

/**
 * Get an item by ID
 */
export function getItem(id: string): Item | undefined {
  return ITEMS_DATABASE[id]
}

/**
 * Get all items
 */
export function getAllItems(): Item[] {
  return Object.values(ITEMS_DATABASE)
}

/**
 * Get items by category
 */
export function getItemsByCategory(category: ItemCategory): Item[] {
  return Object.values(ITEMS_DATABASE).filter((item) => item.category === category)
}

/**
 * Get items by rarity
 */
export function getItemsByRarity(rarity: Rarity): Item[] {
  return Object.values(ITEMS_DATABASE).filter((item) => item.rarity === rarity)
}

/**
 * Get a random item
 */
export function getRandomItem(): Item {
  const items = Object.values(ITEMS_DATABASE)
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * Get a random item by weighted rarity
 */
export function getRandomWeightedItem(): Item {
  const items = Object.values(ITEMS_DATABASE)
  const weights = items.map((item) => {
    switch (item.rarity) {
      case Rarity.COMMON: return 100
      case Rarity.UNCOMMON: return 50
      case Rarity.RARE: return 25
      case Rarity.EPIC: return 10
      case Rarity.LEGENDARY: return 3
      case Rarity.MYTHIC: return 1
      case Rarity.DIVINE: return 0.1
      default: return 100
    }
  })

  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  let r = Math.random() * totalWeight
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[0]
}

/**
 * Get random items for a specific rarity tier
 */
export function getRandomItemsByRarity(rarity: Rarity, count: number): Item[] {
  const items = getItemsByRarity(rarity)
  const result: Item[] = []
  for (let i = 0; i < count && items.length > 0; i++) {
    const idx = Math.floor(Math.random() * items.length)
    result.push(items[idx])
  }
  return result
}
