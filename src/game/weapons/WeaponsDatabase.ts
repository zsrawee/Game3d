// ===================================================================
// Weapons Database - All weapon definitions
// ===================================================================
// Static definitions for every weapon in the game. Each weapon has
// unique stats, abilities, and visual properties. Used by the
// inventory system and combat system.
// ===================================================================

import { Weapon, WeaponType, Rarity, DamageType, ItemCategory } from '../types'

export const WEAPONS_DATABASE: Record<string, Weapon> = {
  // -----------------------------------------------------------------
  // Starting Weapons
  // -----------------------------------------------------------------

  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    description: 'A reliable iron sword. A warrior\'s trusted companion.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.COMMON,
    icon: 'sword',
    stackable: false,
    maxStack: 1,
    value: 50,
    weight: 5,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['starting', 'melee', 'sword'],
    weaponType: WeaponType.SWORD,
    baseDamage: 15,
    attackSpeed: 1.2,
    range: 3,
    knockback: 5,
    durability: 100,
    maxDurability: 100,
    upgradeLevel: 0,
    gemSlots: 1,
    equippedGems: [],
  },

  oak_bow: {
    id: 'oak_bow',
    name: 'Oak Bow',
    description: 'A simple oak bow. Effective at range.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.COMMON,
    icon: 'bow',
    stackable: false,
    maxStack: 1,
    value: 60,
    weight: 3,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['starting', 'ranged', 'bow'],
    weaponType: WeaponType.BOW,
    baseDamage: 18,
    attackSpeed: 1.0,
    range: 25,
    knockback: 3,
    projectileSpeed: 25,
    projectileCount: 1,
    spread: 0,
    durability: 80,
    maxDurability: 80,
    upgradeLevel: 0,
    gemSlots: 1,
    equippedGems: [],
  },

  apprentice_staff: {
    id: 'apprentice_staff',
    name: 'Apprentice Staff',
    description: 'A magical staff for aspiring mages.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.COMMON,
    icon: 'staff',
    stackable: false,
    maxStack: 1,
    value: 70,
    weight: 4,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['starting', 'magic', 'staff'],
    weaponType: WeaponType.STAFF,
    baseDamage: 12,
    attackSpeed: 0.9,
    range: 20,
    knockback: 2,
    projectileSpeed: 18,
    projectileCount: 1,
    spread: 0,
    elementalDamage: [{ type: DamageType.FIRE, amount: 8 }],
    durability: 70,
    maxDurability: 70,
    upgradeLevel: 0,
    gemSlots: 2,
    equippedGems: [],
  },

  twin_daggers: {
    id: 'twin_daggers',
    name: 'Twin Daggers',
    description: 'Fast and deadly twin daggers.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.COMMON,
    icon: 'dagger',
    stackable: false,
    maxStack: 1,
    value: 55,
    weight: 2,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['starting', 'melee', 'dagger'],
    weaponType: WeaponType.DAGGER,
    baseDamage: 10,
    attackSpeed: 2.0,
    range: 2,
    knockback: 2,
    comboCount: 4,
    durability: 90,
    maxDurability: 90,
    upgradeLevel: 0,
    gemSlots: 1,
    equippedGems: [],
  },

  war_hammer: {
    id: 'war_hammer',
    name: 'War Hammer',
    description: 'A massive hammer that crushes enemies.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.COMMON,
    icon: 'hammer',
    stackable: false,
    maxStack: 1,
    value: 80,
    weight: 12,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['starting', 'melee', 'hammer'],
    weaponType: WeaponType.HAMMER,
    baseDamage: 25,
    attackSpeed: 0.7,
    range: 3.5,
    knockback: 12,
    chargeTime: 1.0,
    durability: 120,
    maxDurability: 120,
    upgradeLevel: 0,
    gemSlots: 1,
    equippedGems: [],
  },

  bone_staff: {
    id: 'bone_staff',
    name: 'Bone Staff',
    description: 'A staff of necromantic power.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.COMMON,
    icon: 'staff',
    stackable: false,
    maxStack: 1,
    value: 75,
    weight: 4,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['starting', 'magic', 'staff', 'necromancy'],
    weaponType: WeaponType.STAFF,
    baseDamage: 14,
    attackSpeed: 0.9,
    range: 18,
    knockback: 1,
    projectileSpeed: 16,
    projectileCount: 1,
    spread: 0,
    elementalDamage: [{ type: DamageType.SHADOW, amount: 10 }],
    durability: 70,
    maxDurability: 70,
    upgradeLevel: 0,
    gemSlots: 2,
    equippedGems: [],
  },

  holy_sword: {
    id: 'holy_sword',
    name: 'Holy Sword',
    description: 'A blessed sword that smites evil.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.UNCOMMON,
    icon: 'sword',
    stackable: false,
    maxStack: 1,
    value: 120,
    weight: 5,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['starting', 'melee', 'sword', 'holy'],
    weaponType: WeaponType.SWORD,
    baseDamage: 18,
    attackSpeed: 1.1,
    range: 3,
    knockback: 6,
    elementalDamage: [{ type: DamageType.HOLY, amount: 8 }],
    durability: 110,
    maxDurability: 110,
    upgradeLevel: 0,
    gemSlots: 2,
    equippedGems: [],
  },

  great_axe: {
    id: 'great_axe',
    name: 'Great Axe',
    description: 'A massive axe for a berserker.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.UNCOMMON,
    icon: 'axe',
    stackable: false,
    maxStack: 1,
    value: 100,
    weight: 10,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['starting', 'melee', 'axe'],
    weaponType: WeaponType.HAMMER,
    baseDamage: 28,
    attackSpeed: 0.8,
    range: 4,
    knockback: 10,
    chargeTime: 0.8,
    durability: 130,
    maxDurability: 130,
    upgradeLevel: 0,
    gemSlots: 1,
    equippedGems: [],
  },

  // -----------------------------------------------------------------
  // Mid-tier Weapons
  // -----------------------------------------------------------------

  steel_sword: {
    id: 'steel_sword',
    name: 'Steel Sword',
    description: 'A well-forged steel sword.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.UNCOMMON,
    icon: 'sword',
    stackable: false,
    maxStack: 1,
    value: 200,
    weight: 5,
    level: 5,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['melee', 'sword'],
    weaponType: WeaponType.SWORD,
    baseDamage: 25,
    attackSpeed: 1.3,
    range: 3,
    knockback: 6,
    durability: 150,
    maxDurability: 150,
    upgradeLevel: 0,
    gemSlots: 2,
    equippedGems: [],
  },

  elven_bow: {
    id: 'elven_bow',
    name: 'Elven Bow',
    description: 'A graceful bow crafted by elves.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.UNCOMMON,
    icon: 'bow',
    stackable: false,
    maxStack: 1,
    value: 250,
    weight: 2,
    level: 5,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['ranged', 'bow', 'elven'],
    weaponType: WeaponType.BOW,
    baseDamage: 28,
    attackSpeed: 1.2,
    range: 30,
    knockback: 4,
    projectileSpeed: 30,
    projectileCount: 1,
    spread: 0,
    durability: 120,
    maxDurability: 120,
    upgradeLevel: 0,
    gemSlots: 2,
    equippedGems: [],
  },

  fire_staff: {
    id: 'fire_staff',
    name: 'Staff of Embers',
    description: 'A staff imbued with fire magic.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.RARE,
    icon: 'staff',
    stackable: false,
    maxStack: 1,
    value: 400,
    weight: 4,
    level: 10,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['magic', 'staff', 'fire'],
    weaponType: WeaponType.STAFF,
    baseDamage: 18,
    attackSpeed: 1.0,
    range: 22,
    knockback: 3,
    projectileSpeed: 20,
    projectileCount: 1,
    spread: 0,
    elementalDamage: [{ type: DamageType.FIRE, amount: 20 }],
    durability: 100,
    maxDurability: 100,
    upgradeLevel: 0,
    gemSlots: 3,
    equippedGems: [],
  },

  // -----------------------------------------------------------------
  // High-tier Weapons
  // -----------------------------------------------------------------

  dragon_slayer: {
    id: 'dragon_slayer',
    name: 'Dragon Slayer',
    description: 'A legendary sword forged to slay dragons.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.EPIC,
    icon: 'sword',
    stackable: false,
    maxStack: 1,
    value: 1500,
    weight: 8,
    level: 20,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['melee', 'sword', 'legendary'],
    weaponType: WeaponType.SWORD,
    baseDamage: 65,
    attackSpeed: 1.1,
    range: 4,
    knockback: 12,
    elementalDamage: [{ type: DamageType.FIRE, amount: 25 }],
    durability: 250,
    maxDurability: 250,
    upgradeLevel: 0,
    gemSlots: 4,
    equippedGems: [],
  },

  shadow_bow: {
    id: 'shadow_bow',
    name: 'Bow of Shadows',
    description: 'A bow that fires shadow arrows.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.EPIC,
    icon: 'bow',
    stackable: false,
    maxStack: 1,
    value: 1200,
    weight: 2,
    level: 18,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['ranged', 'bow', 'shadow'],
    weaponType: WeaponType.BOW,
    baseDamage: 55,
    attackSpeed: 1.4,
    range: 35,
    knockback: 5,
    projectileSpeed: 35,
    projectileCount: 3,
    spread: 15,
    elementalDamage: [{ type: DamageType.SHADOW, amount: 20 }],
    durability: 180,
    maxDurability: 180,
    upgradeLevel: 0,
    gemSlots: 3,
    equippedGems: [],
  },

  // -----------------------------------------------------------------
  // Legendary Weapons
  // -----------------------------------------------------------------

  legendary_sword: {
    id: 'legendary_sword',
    name: 'Sword of Eternity',
    description: 'The most powerful sword ever forged. Glows with divine light.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.LEGENDARY,
    icon: 'sword',
    stackable: false,
    maxStack: 1,
    value: 10000,
    weight: 6,
    level: 30,
    tradeable: false,
    sellable: false,
    destructible: false,
    tags: ['melee', 'sword', 'legendary', 'divine'],
    weaponType: WeaponType.SWORD,
    baseDamage: 120,
    attackSpeed: 1.5,
    range: 5,
    knockback: 20,
    elementalDamage: [
      { type: DamageType.HOLY, amount: 50 },
      { type: DamageType.FIRE, amount: 30 },
    ],
    durability: 500,
    maxDurability: 500,
    upgradeLevel: 0,
    gemSlots: 5,
    equippedGems: [],
  },

  // -----------------------------------------------------------------
  // Miscellaneous Weapons
  // -----------------------------------------------------------------

  rusty_dagger: {
    id: 'rusty_dagger',
    name: 'Rusty Dagger',
    description: 'A worn and rusty dagger. Better than nothing.',
    category: ItemCategory.WEAPON,
    rarity: Rarity.COMMON,
    icon: 'dagger',
    stackable: false,
    maxStack: 1,
    value: 10,
    weight: 1,
    level: 1,
    tradeable: true,
    sellable: true,
    destructible: true,
    tags: ['melee', 'dagger', 'cheap'],
    weaponType: WeaponType.DAGGER,
    baseDamage: 6,
    attackSpeed: 1.8,
    range: 1.5,
    knockback: 1,
    durability: 40,
    maxDurability: 40,
    upgradeLevel: 0,
    gemSlots: 0,
    equippedGems: [],
  },
}

/**
 * Get a weapon by ID
 */
export function getWeapon(id: string): Weapon | undefined {
  return WEAPONS_DATABASE[id]
}

/**
 * Get all weapons of a specific type
 */
export function getWeaponsByType(type: WeaponType): Weapon[] {
  return Object.values(WEAPONS_DATABASE).filter((w) => w.weaponType === type)
}

/**
 * Get all weapons of a specific rarity
 */
export function getWeaponsByRarity(rarity: Rarity): Weapon[] {
  return Object.values(WEAPONS_DATABASE).filter((w) => w.rarity === rarity)
}

/**
 * Get all weapons usable by a specific level
 */
export function getWeaponsForLevel(level: number): Weapon[] {
  return Object.values(WEAPONS_DATABASE).filter((w) => w.level <= level)
}

/**
 * Get a random weapon
 */
export function getRandomWeapon(): Weapon {
  const weapons = Object.values(WEAPONS_DATABASE)
  return weapons[Math.floor(Math.random() * weapons.length)]
}

/**
 * Get a random weapon by rarity weight
 */
export function getRandomWeightedWeapon(): Weapon {
  const weapons = Object.values(WEAPONS_DATABASE)
  const weights = weapons.map((w) => {
    switch (w.rarity) {
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
  for (let i = 0; i < weapons.length; i++) {
    r -= weights[i]
    if (r <= 0) return weapons[i]
  }
  return weapons[0]
}
