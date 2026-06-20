// ===================================================================
// Quests and Achievements System
// ===================================================================
// Manages active quests, tracks progress, and unlocks achievements.
// Quests can have multiple requirements and rewards.
// ===================================================================

import {
  Quest,
  QuestRequirement,
  QuestRequirementType,
  QuestStatus,
  QuestSave,
  Achievement,
  AchievementCategory,
  RewardType,
} from '../types'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'

// -------------------------------------------------------------------
// Quest Definitions
// -------------------------------------------------------------------

export const QUESTS_DATABASE: Record<string, Quest> = {
  tutorial_first_steps: {
    id: 'tutorial_first_steps',
    name: 'First Steps',
    description: 'Learn the basics of combat by defeating 5 enemies.',
    type: 'main' as any,
    difficulty: 'easy' as any,
    requirements: [
      {
        type: QuestRequirementType.KILL_ENEMIES,
        targetId: 'any',
        targetName: 'Enemies',
        requiredAmount: 5,
        currentAmount: 0,
        isCompleted: false,
        description: 'Defeat 5 enemies',
      },
    ],
    rewards: [
      { type: RewardType.EXPERIENCE, amount: 50, isGuaranteed: true },
      { type: RewardType.GOLD, amount: 100, isGuaranteed: true },
    ],
    prerequisites: [],
    isMainQuest: true,
    isRepeatable: false,
    minLevel: 1,
  },

  collect_potions: {
    id: 'collect_potions',
    name: 'Stocking Up',
    description: 'Collect 3 health potions for your journey.',
    type: 'side' as any,
    difficulty: 'easy' as any,
    requirements: [
      {
        type: QuestRequirementType.COLLECT_ITEMS,
        targetId: 'health_potion',
        targetName: 'Health Potions',
        requiredAmount: 3,
        currentAmount: 0,
        isCompleted: false,
        description: 'Collect 3 Health Potions',
      },
    ],
    rewards: [
      { type: RewardType.EXPERIENCE, amount: 30, isGuaranteed: true },
      { type: RewardType.GOLD, amount: 50, isGuaranteed: true },
    ],
    prerequisites: [],
    isMainQuest: false,
    isRepeatable: true,
    minLevel: 1,
  },

  reach_level_5: {
    id: 'reach_level_5',
    name: 'Rising Hero',
    description: 'Reach level 5 to unlock new abilities.',
    type: 'main' as any,
    difficulty: 'easy' as any,
    requirements: [
      {
        type: QuestRequirementType.REACH_LEVEL,
        targetId: 'level_5',
        targetName: 'Level 5',
        requiredAmount: 5,
        currentAmount: 1,
        isCompleted: false,
        description: 'Reach level 5',
      },
    ],
    rewards: [
      { type: RewardType.EXPERIENCE, amount: 100, isGuaranteed: true },
      { type: RewardType.SKILL_POINT, amount: 1, isGuaranteed: true },
    ],
    prerequisites: ['tutorial_first_steps'],
    isMainQuest: true,
    isRepeatable: false,
    minLevel: 1,
  },

  kill_50_enemies: {
    id: 'kill_50_enemies',
    name: 'Battle Hardened',
    description: 'Defeat 50 enemies to prove your combat prowess.',
    type: 'side' as any,
    difficulty: 'normal' as any,
    requirements: [
      {
        type: QuestRequirementType.KILL_ENEMIES,
        targetId: 'any',
        targetName: 'Enemies',
        requiredAmount: 50,
        currentAmount: 0,
        isCompleted: false,
        description: 'Defeat 50 enemies',
      },
    ],
    rewards: [
      { type: RewardType.EXPERIENCE, amount: 200, isGuaranteed: true },
      { type: RewardType.GOLD, amount: 300, isGuaranteed: true },
      { type: RewardType.ITEM, itemId: 'strength_elixir', amount: 1, isGuaranteed: true },
    ],
    prerequisites: ['tutorial_first_steps'],
    isMainQuest: false,
    isRepeatable: false,
    minLevel: 3,
  },

  defeat_first_boss: {
    id: 'defeat_first_boss',
    name: 'Dragon Slayer',
    description: 'Defeat the Dragon Lord Vaelith.',
    type: 'main' as any,
    difficulty: 'hard' as any,
    requirements: [
      {
        type: QuestRequirementType.DEFEAT_BOSS,
        targetId: 'dragon_lord',
        targetName: 'Dragon Lord Vaelith',
        requiredAmount: 1,
        currentAmount: 0,
        isCompleted: false,
        description: 'Defeat Dragon Lord Vaelith',
      },
    ],
    rewards: [
      { type: RewardType.EXPERIENCE, amount: 1000, isGuaranteed: true },
      { type: RewardType.GOLD, amount: 500, isGuaranteed: true },
      { type: RewardType.ITEM, itemId: 'legendary_sword', amount: 1, isGuaranteed: true },
    ],
    prerequisites: ['reach_level_5'],
    isMainQuest: true,
    isRepeatable: false,
    minLevel: 5,
  },

  collect_treasures: {
    id: 'collect_treasures',
    name: 'Treasure Hunter',
    description: 'Find and collect 10 treasure items.',
    type: 'side' as any,
    difficulty: 'normal' as any,
    requirements: [
      {
        type: QuestRequirementType.COLLECT_ITEMS,
        targetId: 'treasure',
        targetName: 'Treasures',
        requiredAmount: 10,
        currentAmount: 0,
        isCompleted: false,
        description: 'Collect 10 treasures',
      },
    ],
    rewards: [
      { type: RewardType.EXPERIENCE, amount: 150, isGuaranteed: true },
      { type: RewardType.GOLD, amount: 250, isGuaranteed: true },
    ],
    prerequisites: [],
    isMainQuest: false,
    isRepeatable: false,
    minLevel: 2,
  },

  survive_5_minutes: {
    id: 'survive_5_minutes',
    name: 'Survivor',
    description: 'Survive for 5 minutes without dying.',
    type: 'side' as any,
    difficulty: 'normal' as any,
    requirements: [
      {
        type: QuestRequirementType.SURVIVE_TIME,
        targetId: 'survival',
        targetName: 'Survival Time',
        requiredAmount: 300,
        currentAmount: 0,
        isCompleted: false,
        description: 'Survive 5 minutes',
      },
    ],
    rewards: [
      { type: RewardType.EXPERIENCE, amount: 300, isGuaranteed: true },
      { type: RewardType.GOLD, amount: 200, isGuaranteed: true },
      { type: RewardType.ITEM, itemId: 'invincibility_potion', amount: 1, isGuaranteed: true },
    ],
    prerequisites: [],
    isMainQuest: false,
    isRepeatable: true,
    minLevel: 3,
  },

  deal_1000_damage: {
    id: 'deal_1000_damage',
    name: 'Devastating Force',
    description: 'Deal 1000 total damage to enemies.',
    type: 'side' as any,
    difficulty: 'easy' as any,
    requirements: [
      {
        type: QuestRequirementType.DEAL_DAMAGE,
        targetId: 'damage',
        targetName: 'Damage',
        requiredAmount: 1000,
        currentAmount: 0,
        isCompleted: false,
        description: 'Deal 1000 damage',
      },
    ],
    rewards: [
      { type: RewardType.EXPERIENCE, amount: 100, isGuaranteed: true },
      { type: RewardType.GOLD, amount: 100, isGuaranteed: true },
    ],
    prerequisites: [],
    isMainQuest: false,
    isRepeatable: true,
    minLevel: 1,
  },
}

// -------------------------------------------------------------------
// Achievement Definitions
// -------------------------------------------------------------------

export const ACHIEVEMENTS_DATABASE: Record<string, Achievement> = {
  first_blood: {
    id: 'first_blood',
    name: 'First Blood',
    description: 'Defeat your first enemy.',
    category: AchievementCategory.COMBAT,
    icon: 'sword',
    points: 10,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 1,
  },

  kill_100: {
    id: 'kill_100',
    name: 'Centurion',
    description: 'Defeat 100 enemies.',
    category: AchievementCategory.COMBAT,
    icon: 'skull',
    points: 25,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 100,
  },

  kill_1000: {
    id: 'kill_1000',
    name: 'Exterminator',
    description: 'Defeat 1000 enemies.',
    category: AchievementCategory.COMBAT,
    icon: 'skull_pile',
    points: 50,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 1000,
  },

  reach_level_10: {
    id: 'reach_level_10',
    name: 'Adventurer',
    description: 'Reach level 10.',
    category: AchievementCategory.PROGRESSION,
    icon: 'level',
    points: 25,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 10,
  },

  reach_level_50: {
    id: 'reach_level_50',
    name: 'Veteran',
    description: 'Reach level 50.',
    category: AchievementCategory.PROGRESSION,
    icon: 'level',
    points: 75,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 50,
  },

  defeat_boss: {
    id: 'defeat_boss',
    name: 'Boss Slayer',
    description: 'Defeat your first boss.',
    category: AchievementCategory.COMBAT,
    icon: 'crown',
    points: 50,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 1,
  },

  collect_1000_gold: {
    id: 'collect_1000_gold',
    name: 'Gold Hoarder',
    description: 'Collect 1000 gold coins.',
    category: AchievementCategory.COLLECTION,
    icon: 'coins',
    points: 20,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 1000,
  },

  collect_all_weapons: {
    id: 'collect_all_weapons',
    name: 'Arsenal',
    description: 'Collect all weapons in the game.',
    category: AchievementCategory.COLLECTION,
    icon: 'armory',
    points: 100,
    isHidden: true,
    isUnlocked: false,
    progress: 0,
    maxProgress: 16, // Number of weapons in the database
  },

  explore_all_biomes: {
    id: 'explore_all_biomes',
    name: 'Explorer',
    description: 'Visit all biomes.',
    category: AchievementCategory.EXPLORATION,
    icon: 'map',
    points: 50,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 8,
  },

  complete_tutorial: {
    id: 'complete_tutorial',
    name: 'Graduate',
    description: 'Complete the tutorial.',
    category: AchievementCategory.PROGRESSION,
    icon: 'graduate',
    points: 10,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 1,
  },

  no_damage_run: {
    id: 'no_damage_run',
    name: 'Untouchable',
    description: 'Defeat a boss without taking damage.',
    category: AchievementCategory.COMBAT,
    icon: 'shield',
    points: 100,
    isHidden: true,
    isUnlocked: false,
    progress: 0,
    maxProgress: 1,
  },

  speedrun: {
    id: 'speedrun',
    name: 'Speed Demon',
    description: 'Defeat the boss in under 5 minutes.',
    category: AchievementCategory.SPECIAL,
    icon: 'clock',
    points: 75,
    isHidden: true,
    isUnlocked: false,
    progress: 0,
    maxProgress: 1,
  },

  death_100: {
    id: 'death_100',
    name: 'Persistent',
    description: 'Die 100 times. Never give up.',
    category: AchievementCategory.SPECIAL,
    icon: 'skull',
    points: 25,
    isHidden: true,
    isUnlocked: false,
    progress: 0,
    maxProgress: 100,
  },

  combo_master: {
    id: 'combo_master',
    name: 'Combo Master',
    description: 'Achieve a 50-hit combo.',
    category: AchievementCategory.COMBAT,
    icon: 'combo',
    points: 50,
    isHidden: false,
    isUnlocked: false,
    progress: 0,
    maxProgress: 50,
  },
}

// -------------------------------------------------------------------
// Quest Manager
// -------------------------------------------------------------------

export class QuestManager {
  public activeQuests: Map<string, QuestSave> = new Map()
  public completedQuests: Set<string> = new Set()

  constructor() {
    this.setupEventListeners()
  }

  /**
   * Set up event listeners for quest tracking
   */
  private setupEventListeners(): void {
    eventBus.on(GameEventType.PLAYER_KILL, (event) => {
      this.updateRequirement(QuestRequirementType.KILL_ENEMIES, 'any', 1)
    })

    eventBus.on(GameEventType.PLAYER_LEVEL_UP, (event) => {
      this.updateRequirement(QuestRequirementType.REACH_LEVEL, 'level_5', 1)
      this.updateRequirement(QuestRequirementType.REACH_LEVEL, 'level_10', 1)
    })

    eventBus.on(GameEventType.BOSS_DEFEATED, (event) => {
      this.updateRequirement(QuestRequirementType.DEFEAT_BOSS, event.data.bossId, 1)
    })

    eventBus.on(GameEventType.ITEM_PICKED_UP, (event) => {
      this.updateRequirement(QuestRequirementType.COLLECT_ITEMS, event.data.itemId, event.data.quantity)
      if (event.data.itemId.includes('treasure') || event.data.itemId.includes('gold')) {
        this.updateRequirement(QuestRequirementType.COLLECT_ITEMS, 'treasure', event.data.quantity)
      }
    })

    eventBus.on(GameEventType.PLAYER_DAMAGED, (event) => {
      // Track damage taken
    })

    eventBus.on(GameEventType.ENEMY_DAMAGED, (event) => {
      if (event.data.source === 'player') {
        this.updateRequirement(QuestRequirementType.DEAL_DAMAGE, 'damage', event.data.damage)
      }
    })
  }

  /**
   * Start a quest
   */
  startQuest(questId: string): boolean {
    if (this.activeQuests.has(questId)) return false
    if (this.completedQuests.has(questId)) return false

    const quest = QUESTS_DATABASE[questId]
    if (!quest) return false

    // Check prerequisites
    for (const prereq of quest.prerequisites) {
      if (!this.completedQuests.has(prereq)) return false
    }

    const questSave: QuestSave = {
      questId,
      status: QuestStatus.ACTIVE,
      startedAt: Date.now(),
      progress: {},
    }

    // Initialize progress
    quest.requirements.forEach((req, index) => {
      questSave.progress[index.toString()] = req.currentAmount
    })

    this.activeQuests.set(questId, questSave)

    eventBus.emit(
      GameEventType.QUEST_STARTED,
      { questId, questName: quest.name, description: quest.description },
      'QuestManager',
    )

    return true
  }

  /**
   * Update a quest requirement
   */
  updateRequirement(type: QuestRequirementType, targetId: string, amount: number): void {
    this.activeQuests.forEach((questSave, questId) => {
      const quest = QUESTS_DATABASE[questId]
      if (!quest) return

      quest.requirements.forEach((req, index) => {
        if (req.type !== type) return
        if (req.targetId !== targetId && req.targetId !== 'any') return
        if (req.isCompleted) return

        const currentProgress = questSave.progress[index.toString()] || 0
        const newProgress = currentProgress + amount
        questSave.progress[index.toString()] = newProgress

        eventBus.emit(
          GameEventType.QUEST_PROGRESS,
          {
            questId,
            requirementIndex: index,
            current: newProgress,
            required: req.requiredAmount,
            description: req.description,
          },
          'QuestManager',
        )

        if (newProgress >= req.requiredAmount) {
          req.isCompleted = true
          this.checkQuestCompletion(questId)
        }
      })
    })
  }

  /**
   * Check if a quest is complete
   */
  private checkQuestCompletion(questId: string): void {
    const quest = QUESTS_DATABASE[questId]
    if (!quest) return

    const allCompleted = quest.requirements.every((req) => req.isCompleted)
    if (!allCompleted) return

    const questSave = this.activeQuests.get(questId)
    if (!questSave) return

    questSave.status = QuestStatus.COMPLETED
    questSave.completedAt = Date.now()

    eventBus.emit(
      GameEventType.QUEST_COMPLETED,
      {
        questId,
        questName: quest.name,
        rewards: quest.rewards,
      },
      'QuestManager',
    )

    console.info(`[QuestManager] Quest completed: ${quest.name}`)
  }

  /**
   * Turn in a completed quest and claim rewards
   */
  turnInQuest(questId: string): boolean {
    const questSave = this.activeQuests.get(questId)
    if (!questSave || questSave.status !== QuestStatus.COMPLETED) return false

    const quest = QUESTS_DATABASE[questId]
    if (!quest) return false

    // Apply rewards
    quest.rewards.forEach((reward) => {
      eventBus.emit(
        GameEventType.NOTIFICATION,
        {
          type: 'quest_reward',
          rewardType: reward.type,
          amount: reward.amount,
          itemId: reward.itemId,
        },
        'QuestManager',
      )
    })

    this.activeQuests.delete(questId)
    this.completedQuests.add(questId)

    return true
  }

  /**
   * Abandon a quest
   */
  abandonQuest(questId: string): boolean {
    return this.activeQuests.delete(questId)
  }

  /**
   * Get all active quests
   */
  getActiveQuests(): Array<{ quest: Quest; save: QuestSave }> {
    const result: Array<{ quest: Quest; save: QuestSave }> = []
    this.activeQuests.forEach((save, questId) => {
      const quest = QUESTS_DATABASE[questId]
      if (quest) {
        result.push({ quest, save })
      }
    })
    return result
  }

  /**
   * Get available quests (not started, prerequisites met)
   */
  getAvailableQuests(playerLevel: number): Quest[] {
    return Object.values(QUESTS_DATABASE).filter((quest) => {
      if (this.activeQuests.has(quest.id)) return false
      if (this.completedQuests.has(quest.id) && !quest.isRepeatable) return false
      if (playerLevel < quest.minLevel) return false
      return quest.prerequisites.every((prereq) => this.completedQuests.has(prereq))
    })
  }

  /**
   * Get completed quests
   */
  getCompletedQuests(): string[] {
    return Array.from(this.completedQuests)
  }

  /**
   * Serialize for save data
   */
  serialize(): QuestSave[] {
    return Array.from(this.activeQuests.values())
  }

  /**
   * Deserialize from save data
   */
  deserialize(data: QuestSave[]): void {
    this.activeQuests.clear()
    this.completedQuests.clear()

    data.forEach((save) => {
      this.activeQuests.set(save.questId, save)
      if (save.status === QuestStatus.COMPLETED || save.status === QuestStatus.TURNED_IN) {
        this.completedQuests.add(save.questId)
      }
    })
  }
}

// -------------------------------------------------------------------
// Achievements Manager
// -------------------------------------------------------------------

export class AchievementsManager {
  public achievements: Map<string, Achievement> = new Map()
  private totalPoints: number = 0

  constructor() {
    // Load all achievements from database
    Object.values(ACHIEVEMENTS_DATABASE).forEach((achievement) => {
      this.achievements.set(achievement.id, { ...achievement })
    })

    this.setupEventListeners()
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    eventBus.on(GameEventType.PLAYER_KILL, () => {
      this.updateProgress('first_blood', 1)
      this.updateProgress('kill_100', 1)
      this.updateProgress('kill_1000', 1)
    })

    eventBus.on(GameEventType.PLAYER_LEVEL_UP, (event) => {
      this.setProgress('reach_level_10', event.data.newLevel)
      this.setProgress('reach_level_50', event.data.newLevel)
    })

    eventBus.on(GameEventType.BOSS_DEFEATED, () => {
      this.updateProgress('defeat_boss', 1)
    })

    eventBus.on(GameEventType.ITEM_PICKED_UP, (event) => {
      if (event.data.itemId === 'gold_coin') {
        this.updateProgress('collect_1000_gold', event.data.quantity)
      }
    })

    eventBus.on(GameEventType.PLAYER_DEATH, () => {
      this.updateProgress('death_100', 1)
    })
  }

  /**
   * Update achievement progress by adding to current
   */
  updateProgress(achievementId: string, amount: number): void {
    const achievement = this.achievements.get(achievementId)
    if (!achievement || achievement.isUnlocked) return

    achievement.progress += amount
    if (achievement.progress >= achievement.maxProgress) {
      this.unlock(achievementId)
    }
  }

  /**
   * Set achievement progress to a specific value
   */
  setProgress(achievementId: string, value: number): void {
    const achievement = this.achievements.get(achievementId)
    if (!achievement || achievement.isUnlocked) return

    achievement.progress = Math.max(achievement.progress, value)
    if (achievement.progress >= achievement.maxProgress) {
      this.unlock(achievementId)
    }
  }

  /**
   * Unlock an achievement
   */
  unlock(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId)
    if (!achievement || achievement.isUnlocked) return false

    achievement.isUnlocked = true
    achievement.unlockedAt = Date.now()
    achievement.progress = achievement.maxProgress
    this.totalPoints += achievement.points

    eventBus.emit(
      GameEventType.ACHIEVEMENT_UNLOCKED,
      {
        achievementId,
        name: achievement.name,
        description: achievement.description,
        points: achievement.points,
        icon: achievement.icon,
      },
      'AchievementsManager',
    )

    console.info(`[AchievementsManager] Unlocked: ${achievement.name}`)
    return true
  }

  /**
   * Get all achievements
   */
  getAllAchievements(): Achievement[] {
    return Array.from(this.achievements.values())
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(): Achievement[] {
    return this.getAllAchievements().filter((a) => a.isUnlocked)
  }

  /**
   * Get achievements by category
   */
  getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return this.getAllAchievements().filter((a) => a.category === category)
  }

  /**
   * Get total achievement points
   */
  getTotalPoints(): number {
    return this.totalPoints
  }

  /**
   * Get progress percentage (0-1)
   */
  getProgressPercentage(): number {
    const total = this.achievements.size
    const unlocked = this.getUnlockedAchievements().length
    return total > 0 ? unlocked / total : 0
  }

  /**
   * Check if an achievement is unlocked
   */
  isUnlocked(achievementId: string): boolean {
    return this.achievements.get(achievementId)?.isUnlocked || false
  }

  /**
   * Serialize for save data
   */
  serialize(): string[] {
    return this.getUnlockedAchievements().map((a) => a.id)
  }

  /**
   * Deserialize from save data
   */
  deserialize(data: string[]): void {
    data.forEach((id) => {
      this.unlock(id)
    })
  }
}

// Global singletons
export const questManager = new QuestManager()
export const achievementsManager = new AchievementsManager()
