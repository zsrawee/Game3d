// ===================================================================
// Player Abilities - Special abilities and skill system
// ===================================================================
// Defines all player abilities, their costs, cooldowns, and effects.
// Each character class has unique abilities that can be unlocked
// and upgraded through the skill tree system.
// ===================================================================

import { CharacterClass, EffectType, DamageType } from '../types'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import { generateId } from '../utils/MathUtils'

export interface Ability {
  id: string
  name: string
  nameAr: string
  description: string
  descriptionAr: string
  classType: CharacterClass | 'all'
  manaCost: number
  staminaCost: number
  healthCost: number
  cooldown: number
  castTime: number
  duration: number
  range: number
  damage: number
  damageType: DamageType
  effects: AbilityEffect[]
  level: number
  maxLevel: number
  unlockLevel: number
  icon: string
  isPassive: boolean
  isUltimate: boolean
  requiresTarget: boolean
}

export interface AbilityEffect {
  type: EffectType
  magnitude: number
  duration: number
  radius?: number
  target: 'self' | 'enemy' | 'ally' | 'all'
}

export class PlayerAbilities {
  private abilities: Map<string, Ability> = new Map()
  private cooldowns: Map<string, number> = new Map()
  private activeEffects: Map<string, number> = new Map()
  private classType: CharacterClass

  constructor(classType: CharacterClass) {
    this.classType = classType
    this.loadClassAbilities()
  }

  /**
   * Load abilities for the current class
   */
  private loadClassAbilities(): void {
    // Universal abilities available to all classes
    this.registerAbility({
      id: 'dash_strike',
      name: 'Dash Strike',
      nameAr: 'ضربة الاندفاع',
      description: 'Quick dash forward that damages enemies in your path',
      descriptionAr: 'اندفاع سريع للأمام يلحق ضرراً بالأعداء في طريقك',
      classType: 'all',
      manaCost: 15,
      staminaCost: 20,
      healthCost: 0,
      cooldown: 3,
      castTime: 0,
      duration: 0.3,
      range: 8,
      damage: 30,
      damageType: DamageType.PHYSICAL,
      effects: [],
      level: 1,
      maxLevel: 5,
      unlockLevel: 1,
      icon: 'dash',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'heal_self',
      name: 'Self Heal',
      nameAr: 'الشفاء الذاتي',
      description: 'Restore health over time',
      descriptionAr: 'استعادة الصحة بمرور الوقت',
      classType: 'all',
      manaCost: 25,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 8,
      castTime: 0.5,
      duration: 5,
      range: 0,
      damage: 0,
      damageType: DamageType.HOLY,
      effects: [
        {
          type: EffectType.HEAL,
          magnitude: 10,
          duration: 5,
          target: 'self',
        },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 2,
      icon: 'heal',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    // Class-specific abilities
    switch (this.classType) {
      case CharacterClass.WARRIOR:
        this.loadWarriorAbilities()
        break
      case CharacterClass.ARCHER:
        this.loadArcherAbilities()
        break
      case CharacterClass.MAGE:
        this.loadMageAbilities()
        break
      case CharacterClass.ASSASSIN:
        this.loadAssassinAbilities()
        break
      case CharacterClass.TANK:
        this.loadTankAbilities()
        break
      case CharacterClass.NECROMANCER:
        this.loadNecromancerAbilities()
        break
      case CharacterClass.PALADIN:
        this.loadPaladinAbilities()
        break
      case CharacterClass.BERSERKER:
        this.loadBerserkerAbilities()
        break
    }
  }

  private loadWarriorAbilities(): void {
    this.registerAbility({
      id: 'whirlwind',
      name: 'Whirlwind',
      nameAr: 'الإعصار',
      description: 'Spin attack hitting all nearby enemies',
      descriptionAr: 'هجوم دوار يصيب جميع الأعداء القريبين',
      classType: CharacterClass.WARRIOR,
      manaCost: 30,
      staminaCost: 25,
      healthCost: 0,
      cooldown: 6,
      castTime: 0,
      duration: 1,
      range: 5,
      damage: 50,
      damageType: DamageType.PHYSICAL,
      effects: [],
      level: 1,
      maxLevel: 5,
      unlockLevel: 3,
      icon: 'whirlwind',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'battle_cry',
      name: 'Battle Cry',
      nameAr: 'صيحة المعركة',
      description: 'Buff attack and defense for 10 seconds',
      descriptionAr: 'تعزيز الهجوم والدفاع لمدة 10 ثوانٍ',
      classType: CharacterClass.WARRIOR,
      manaCost: 40,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 15,
      castTime: 0.3,
      duration: 10,
      range: 0,
      damage: 0,
      damageType: DamageType.PHYSICAL,
      effects: [
        { type: EffectType.BUFF_ATTACK, magnitude: 15, duration: 10, target: 'self' },
        { type: EffectType.BUFF_DEFENSE, magnitude: 10, duration: 10, target: 'self' },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 5,
      icon: 'battle_cry',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'warriors_charge',
      name: "Warrior's Charge",
      nameAr: 'هجمة المحارب',
      description: 'Charge forward, knocking back enemies',
      descriptionAr: 'الاندفاع للأمام، دفع الأعداء بعيداً',
      classType: CharacterClass.WARRIOR,
      manaCost: 50,
      staminaCost: 30,
      healthCost: 0,
      cooldown: 12,
      castTime: 0,
      duration: 0.5,
      range: 12,
      damage: 75,
      damageType: DamageType.PHYSICAL,
      effects: [],
      level: 1,
      maxLevel: 5,
      unlockLevel: 10,
      icon: 'charge',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'blade_storm',
      name: 'Blade Storm',
      nameAr: 'عاصفة النصال',
      description: 'ULTIMATE: Massive damage to all enemies in range',
      descriptionAr: 'نهائي: ضرر هائل لجميع الأعداء في النطاق',
      classType: CharacterClass.WARRIOR,
      manaCost: 100,
      staminaCost: 50,
      healthCost: 0,
      cooldown: 60,
      castTime: 1,
      duration: 2,
      range: 10,
      damage: 200,
      damageType: DamageType.PHYSICAL,
      effects: [],
      level: 1,
      maxLevel: 3,
      unlockLevel: 20,
      icon: 'blade_storm',
      isPassive: false,
      isUltimate: true,
      requiresTarget: false,
    })
  }

  private loadArcherAbilities(): void {
    this.registerAbility({
      id: 'power_shot',
      name: 'Power Shot',
      nameAr: 'السهم القوي',
      description: 'Charged arrow that pierces enemies',
      descriptionAr: 'سهم مشحون يخترق الأعداء',
      classType: CharacterClass.ARCHER,
      manaCost: 20,
      staminaCost: 15,
      healthCost: 0,
      cooldown: 4,
      castTime: 0.8,
      duration: 0,
      range: 30,
      damage: 60,
      damageType: DamageType.PHYSICAL,
      effects: [],
      level: 1,
      maxLevel: 5,
      unlockLevel: 3,
      icon: 'power_shot',
      isPassive: false,
      isUltimate: false,
      requiresTarget: true,
    })

    this.registerAbility({
      id: 'multishot',
      name: 'Multishot',
      nameAr: 'الرصاص المتعدد',
      description: 'Fire 5 arrows in a spread',
      descriptionAr: 'إطلاق 5 أسهم بانتشار',
      classType: CharacterClass.ARCHER,
      manaCost: 35,
      staminaCost: 20,
      healthCost: 0,
      cooldown: 8,
      castTime: 0.3,
      duration: 0,
      range: 25,
      damage: 30,
      damageType: DamageType.PHYSICAL,
      effects: [],
      level: 1,
      maxLevel: 5,
      unlockLevel: 5,
      icon: 'multishot',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'rain_of_arrows',
      name: 'Rain of Arrows',
      nameAr: 'مطر الأسهم',
      description: 'ULTIMATE: Arrows rain from the sky',
      descriptionAr: 'نهائي: أمطار من الأسهم تنهمر من السماء',
      classType: CharacterClass.ARCHER,
      manaCost: 100,
      staminaCost: 40,
      healthCost: 0,
      cooldown: 60,
      castTime: 1,
      duration: 3,
      range: 15,
      damage: 180,
      damageType: DamageType.PHYSICAL,
      effects: [],
      level: 1,
      maxLevel: 3,
      unlockLevel: 20,
      icon: 'rain_arrows',
      isPassive: false,
      isUltimate: true,
      requiresTarget: false,
    })
  }

  private loadMageAbilities(): void {
    this.registerAbility({
      id: 'fireball',
      name: 'Fireball',
      nameAr: 'كرة النار',
      description: 'Hurl a ball of fire that explodes on impact',
      descriptionAr: 'إطلاق كرة نار تنفجر عند الاصطدام',
      classType: CharacterClass.MAGE,
      manaCost: 30,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 3,
      castTime: 0.5,
      duration: 0,
      range: 25,
      damage: 70,
      damageType: DamageType.FIRE,
      effects: [
        { type: EffectType.DAMAGE_OVER_TIME, magnitude: 5, duration: 3, target: 'enemy' },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 3,
      icon: 'fireball',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'frost_nova',
      name: 'Frost Nova',
      nameAr: 'الصقيع المتجمد',
      description: 'Freeze all nearby enemies',
      descriptionAr: 'تجميد جميع الأعداء القريبين',
      classType: CharacterClass.MAGE,
      manaCost: 45,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 10,
      castTime: 0.3,
      duration: 3,
      range: 8,
      damage: 40,
      damageType: DamageType.ICE,
      effects: [
        { type: EffectType.FREEZE, magnitude: 0, duration: 3, target: 'enemy' },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 5,
      icon: 'frost_nova',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'lightning_storm',
      name: 'Lightning Storm',
      nameAr: 'عاصفة البرق',
      description: 'ULTIMATE: Call down lightning on all enemies',
      descriptionAr: 'نهائي: استدعاء البرق على جميع الأعداء',
      classType: CharacterClass.MAGE,
      manaCost: 100,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 60,
      castTime: 1.5,
      duration: 4,
      range: 20,
      damage: 250,
      damageType: DamageType.LIGHTNING,
      effects: [
        { type: EffectType.STUN, magnitude: 0, duration: 1, target: 'enemy' },
      ],
      level: 1,
      maxLevel: 3,
      unlockLevel: 20,
      icon: 'lightning',
      isPassive: false,
      isUltimate: true,
      requiresTarget: false,
    })
  }

  private loadAssassinAbilities(): void {
    this.registerAbility({
      id: 'shadow_strike',
      name: 'Shadow Strike',
      nameAr: 'ضربة الظل',
      description: 'Teleport behind enemy for a critical strike',
      descriptionAr: 'الانتقال خلف العدو لضربة حرجة',
      classType: CharacterClass.ASSASSIN,
      manaCost: 25,
      staminaCost: 20,
      healthCost: 0,
      cooldown: 5,
      castTime: 0,
      duration: 0,
      range: 15,
      damage: 80,
      damageType: DamageType.SHADOW,
      effects: [],
      level: 1,
      maxLevel: 5,
      unlockLevel: 3,
      icon: 'shadow_strike',
      isPassive: false,
      isUltimate: false,
      requiresTarget: true,
    })

    this.registerAbility({
      id: 'stealth',
      name: 'Stealth',
      nameAr: 'التخفي',
      description: 'Become invisible and gain critical strike bonus',
      descriptionAr: 'الاختفاء عن الأنظار واكتساب ضربات حرجة',
      classType: CharacterClass.ASSASSIN,
      manaCost: 40,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 20,
      castTime: 0.5,
      duration: 8,
      range: 0,
      damage: 0,
      damageType: DamageType.SHADOW,
      effects: [
        { type: EffectType.INVISIBILITY, magnitude: 0, duration: 8, target: 'self' },
        { type: EffectType.BUFF_CRIT, magnitude: 50, duration: 8, target: 'self' },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 5,
      icon: 'stealth',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'death_mark',
      name: 'Death Mark',
      nameAr: 'علامة الموت',
      description: 'ULTIMATE: Mark enemies for instant death below 25% HP',
      descriptionAr: 'نهائي: وضع علامة الموت على الأعداء تحت 25% صحة',
      classType: CharacterClass.ASSASSIN,
      manaCost: 80,
      staminaCost: 30,
      healthCost: 0,
      cooldown: 60,
      castTime: 0.5,
      duration: 10,
      range: 15,
      damage: 150,
      damageType: DamageType.SHADOW,
      effects: [],
      level: 1,
      maxLevel: 3,
      unlockLevel: 20,
      icon: 'death_mark',
      isPassive: false,
      isUltimate: true,
      requiresTarget: false,
    })
  }

  private loadTankAbilities(): void {
    this.registerAbility({
      id: 'shield_bash',
      name: 'Shield Bash',
      nameAr: 'ضربة الدرع',
      description: 'Bash enemy with shield, stunning them',
      descriptionAr: 'ضرب العدو بالدرع، صعقه',
      classType: CharacterClass.TANK,
      manaCost: 20,
      staminaCost: 25,
      healthCost: 0,
      cooldown: 5,
      castTime: 0,
      duration: 0,
      range: 4,
      damage: 40,
      damageType: DamageType.PHYSICAL,
      effects: [
        { type: EffectType.STUN, magnitude: 0, duration: 2, target: 'enemy' },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 3,
      icon: 'shield_bash',
      isPassive: false,
      isUltimate: false,
      requiresTarget: true,
    })

    this.registerAbility({
      id: 'iron_skin',
      name: 'Iron Skin',
      nameAr: 'جلد الحديد',
      description: 'Become immune to damage for 4 seconds',
      descriptionAr: 'الحصانة من الضرر لمدة 4 ثوانٍ',
      classType: CharacterClass.TANK,
      manaCost: 50,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 20,
      castTime: 0,
      duration: 4,
      range: 0,
      damage: 0,
      damageType: DamageType.PHYSICAL,
      effects: [
        { type: EffectType.SHIELD, magnitude: 100, duration: 4, target: 'self' },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 5,
      icon: 'iron_skin',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'earthquake',
      name: 'Earthquake',
      nameAr: 'زلزال',
      description: 'ULTIMATE: Massive AoE damage and knockdown',
      descriptionAr: 'نهائي: ضرر جماعي هائل وإسقاط الأعداء',
      classType: CharacterClass.TANK,
      manaCost: 100,
      staminaCost: 50,
      healthCost: 0,
      cooldown: 60,
      castTime: 1,
      duration: 2,
      range: 12,
      damage: 180,
      damageType: DamageType.PHYSICAL,
      effects: [
        { type: EffectType.STUN, magnitude: 0, duration: 2, target: 'enemy' },
      ],
      level: 1,
      maxLevel: 3,
      unlockLevel: 20,
      icon: 'earthquake',
      isPassive: false,
      isUltimate: true,
      requiresTarget: false,
    })
  }

  private loadNecromancerAbilities(): void {
    this.registerAbility({
      id: 'soul_drain',
      name: 'Soul Drain',
      nameAr: 'تصريف الروح',
      description: 'Drain health from target enemy',
      descriptionAr: 'امتصاص الصحة من العدو المستهدف',
      classType: CharacterClass.NECROMANCER,
      manaCost: 25,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 4,
      castTime: 0.5,
      duration: 3,
      range: 20,
      damage: 50,
      damageType: DamageType.SHADOW,
      effects: [
        { type: EffectType.HEAL, magnitude: 10, duration: 3, target: 'self' },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 3,
      icon: 'soul_drain',
      isPassive: false,
      isUltimate: false,
      requiresTarget: true,
    })

    this.registerAbility({
      id: 'bone_armor',
      name: 'Bone Armor',
      nameAr: 'درع العظام',
      description: 'Summon bone armor that absorbs damage',
      descriptionAr: 'استدعاء درع عظمي يمتص الضرر',
      classType: CharacterClass.NECROMANCER,
      manaCost: 40,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 15,
      castTime: 0.5,
      duration: 15,
      range: 0,
      damage: 0,
      damageType: DamageType.SHADOW,
      effects: [
        { type: EffectType.SHIELD, magnitude: 80, duration: 15, target: 'self' },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 5,
      icon: 'bone_armor',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'army_of_dead',
      name: 'Army of the Dead',
      nameAr: 'جيش الموتى',
      description: 'ULTIMATE: Summon undead warriors to fight for you',
      descriptionAr: 'نهائي: استدعاء محاربين أموات للقتال معك',
      classType: CharacterClass.NECROMANCER,
      manaCost: 100,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 90,
      castTime: 1.5,
      duration: 20,
      range: 10,
      damage: 0,
      damageType: DamageType.SHADOW,
      effects: [],
      level: 1,
      maxLevel: 3,
      unlockLevel: 20,
      icon: 'army_dead',
      isPassive: false,
      isUltimate: true,
      requiresTarget: false,
    })
  }

  private loadPaladinAbilities(): void {
    this.registerAbility({
      id: 'holy_strike',
      name: 'Holy Strike',
      nameAr: 'الضربة المقدسة',
      description: 'Smite enemy with holy power',
      descriptionAr: 'ضرب العدو بالقوة المقدسة',
      classType: CharacterClass.PALADIN,
      manaCost: 25,
      staminaCost: 15,
      healthCost: 0,
      cooldown: 4,
      castTime: 0,
      duration: 0,
      range: 5,
      damage: 55,
      damageType: DamageType.HOLY,
      effects: [],
      level: 1,
      maxLevel: 5,
      unlockLevel: 3,
      icon: 'holy_strike',
      isPassive: false,
      isUltimate: false,
      requiresTarget: true,
    })

    this.registerAbility({
      id: 'divine_shield',
      name: 'Divine Shield',
      nameAr: 'الدرع الإلهي',
      description: 'Become invulnerable for 5 seconds',
      descriptionAr: 'الحصانة الكاملة لمدة 5 ثوانٍ',
      classType: CharacterClass.PALADIN,
      manaCost: 50,
      staminaCost: 0,
      healthCost: 0,
      cooldown: 30,
      castTime: 0,
      duration: 5,
      range: 0,
      damage: 0,
      damageType: DamageType.HOLY,
      effects: [
        { type: EffectType.SHIELD, magnitude: 99999, duration: 5, target: 'self' },
      ],
      level: 1,
      maxLevel: 3,
      unlockLevel: 5,
      icon: 'divine_shield',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'judgment',
      name: 'Judgment',
      nameAr: 'الحكم الإلهي',
      description: 'ULTIMATE: Call down holy judgment on all enemies',
      descriptionAr: 'نهائي: استدعاء الحكم الإلهي على جميع الأعداء',
      classType: CharacterClass.PALADIN,
      manaCost: 100,
      staminaCost: 30,
      healthCost: 0,
      cooldown: 60,
      castTime: 1,
      duration: 2,
      range: 15,
      damage: 220,
      damageType: DamageType.HOLY,
      effects: [],
      level: 1,
      maxLevel: 3,
      unlockLevel: 20,
      icon: 'judgment',
      isPassive: false,
      isUltimate: true,
      requiresTarget: false,
    })
  }

  private loadBerserkerAbilities(): void {
    this.registerAbility({
      id: 'reckless_swing',
      name: 'Reckless Swing',
      nameAr: 'الضربة المتهورة',
      description: 'Massive damage but take self-damage',
      descriptionAr: 'ضرر هائل لكن تتعرض لأذى ذاتي',
      classType: CharacterClass.BERSERKER,
      manaCost: 0,
      staminaCost: 30,
      healthCost: 10,
      cooldown: 3,
      castTime: 0,
      duration: 0,
      range: 5,
      damage: 90,
      damageType: DamageType.PHYSICAL,
      effects: [],
      level: 1,
      maxLevel: 5,
      unlockLevel: 3,
      icon: 'reckless',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'blood_rage',
      name: 'Blood Rage',
      nameAr: 'غضب الدم',
      description: 'Gain attack speed and lifesteal as HP drops',
      descriptionAr: 'اكتساب سرعة هجوم وامتصاص حياة مع انخفاض الصحة',
      classType: CharacterClass.BERSERKER,
      manaCost: 0,
      staminaCost: 40,
      healthCost: 0,
      cooldown: 20,
      castTime: 0,
      duration: 10,
      range: 0,
      damage: 0,
      damageType: DamageType.PHYSICAL,
      effects: [
        { type: EffectType.BUFF_ATTACK, magnitude: 30, duration: 10, target: 'self' },
        { type: EffectType.BUFF_SPEED, magnitude: 3, duration: 10, target: 'self' },
      ],
      level: 1,
      maxLevel: 5,
      unlockLevel: 5,
      icon: 'blood_rage',
      isPassive: false,
      isUltimate: false,
      requiresTarget: false,
    })

    this.registerAbility({
      id: 'rampage',
      name: 'Rampage',
      nameAr: 'الهيجاء',
      description: 'ULTIMATE: Unstoppable frenzy, double damage',
      descriptionAr: 'نهائي: هياج لا يُوقف، ضرر مضاعف',
      classType: CharacterClass.BERSERKER,
      manaCost: 0,
      staminaCost: 80,
      healthCost: 20,
      cooldown: 60,
      castTime: 0,
      duration: 8,
      range: 0,
      damage: 0,
      damageType: DamageType.PHYSICAL,
      effects: [
        { type: EffectType.BUFF_ATTACK, magnitude: 50, duration: 8, target: 'self' },
        { type: EffectType.BUFF_SPEED, magnitude: 5, duration: 8, target: 'self' },
        { type: EffectType.SHIELD, magnitude: 50, duration: 8, target: 'self' },
      ],
      level: 1,
      maxLevel: 3,
      unlockLevel: 20,
      icon: 'rampage',
      isPassive: false,
      isUltimate: true,
      requiresTarget: false,
    })
  }

  /**
   * Register a new ability
   */
  registerAbility(ability: Ability): void {
    this.abilities.set(ability.id, ability)
  }

  /**
   * Get an ability by ID
   */
  getAbility(id: string): Ability | undefined {
    return this.abilities.get(id)
  }

  /**
   * Get all abilities
   */
  getAllAbilities(): Ability[] {
    return Array.from(this.abilities.values())
  }

  /**
   * Get abilities available at a given player level
   */
  getAvailableAbilities(playerLevel: number): Ability[] {
    return this.getAllAbilities().filter((a) => a.unlockLevel <= playerLevel)
  }

  /**
   * Get ultimate abilities
   */
  getUltimates(): Ability[] {
    return this.getAllAbilities().filter((a) => a.isUltimate)
  }

  /**
   * Check if an ability can be used (cooldown, resources)
   */
  canUseAbility(id: string, currentMana: number, currentStamina: number, currentHealth: number): boolean {
    const ability = this.abilities.get(id)
    if (!ability) return false

    if (this.cooldowns.has(id) && this.cooldowns.get(id)! > 0) return false
    if (currentMana < ability.manaCost) return false
    if (currentStamina < ability.staminaCost) return false
    if (currentHealth <= ability.healthCost) return false

    return true
  }

  /**
   * Use an ability, applying costs and starting cooldown
   */
  useAbility(id: string): boolean {
    const ability = this.abilities.get(id)
    if (!ability) return false

    this.cooldowns.set(id, ability.cooldown)

    eventBus.emit(
      GameEventType.ABILITY_USED,
      {
        abilityId: id,
        abilityName: ability.name,
        damage: ability.damage,
        damageType: ability.damageType,
        range: ability.range,
        duration: ability.duration,
        effects: ability.effects,
        isUltimate: ability.isUltimate,
      },
      'PlayerAbilities',
    )

    return true
  }

  /**
   * Update ability cooldowns
   */
  update(deltaTime: number): void {
    this.cooldowns.forEach((remaining, id) => {
      const newRemaining = remaining - deltaTime
      if (newRemaining <= 0) {
        this.cooldowns.delete(id)
      } else {
        this.cooldowns.set(id, newRemaining)
      }
    })

    this.activeEffects.forEach((remaining, id) => {
      const newRemaining = remaining - deltaTime
      if (newRemaining <= 0) {
        this.activeEffects.delete(id)
      } else {
        this.activeEffects.set(id, newRemaining)
      }
    })
  }

  /**
   * Get cooldown remaining for an ability
   */
  getCooldown(id: string): number {
    return this.cooldowns.get(id) || 0
  }

  /**
   * Get cooldown progress for an ability (0-1, 1 = ready)
   */
  getCooldownProgress(id: string): number {
    const ability = this.abilities.get(id)
    if (!ability) return 0
    const remaining = this.cooldowns.get(id) || 0
    return 1 - remaining / ability.cooldown
  }

  /**
   * Upgrade an ability by one level
   */
  upgradeAbility(id: string): boolean {
    const ability = this.abilities.get(id)
    if (!ability || ability.level >= ability.maxLevel) return false
    ability.level++
    return true
  }

  /**
   * Get the active class type
   */
  getClassType(): CharacterClass {
    return this.classType
  }

  /**
   * Get ability damage scaled by level
   */
  getAbilityDamage(id: string): number {
    const ability = this.abilities.get(id)
    if (!ability) return 0
    return ability.damage * (1 + (ability.level - 1) * 0.2)
  }

  /**
   * Serialize abilities for save data
   */
  serialize(): Array<{ id: string; level: number }> {
    const result: Array<{ id: string; level: number }> = []
    this.abilities.forEach((ability, id) => {
      result.push({ id, level: ability.level })
    })
    return result
  }

  /**
   * Deserialize abilities from save data
   */
  deserialize(data: Array<{ id: string; level: number }>): void {
    data.forEach(({ id, level }) => {
      const ability = this.abilities.get(id)
      if (ability) {
        ability.level = level
      }
    })
  }
}
