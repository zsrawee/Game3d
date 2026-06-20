'use client'

// ===================================================================
// Game Canvas - Main game component that runs the 3D game
// ===================================================================
// This component initializes the game engine, sets up all game
// systems, runs the main game loop, and renders the UI overlay.
// It bridges the React world with the imperative Three.js engine.
// ===================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { GameEngine, createGameEngine, disposeGameEngine } from '../engine/GameEngine'
import { inputManager } from '../input/InputManager'
import { Player } from '../player/Player'
import { EnemyManager } from '../enemies/EnemyManager'
import { ProjectileSystem } from '../weapons/ProjectileSystem'
import { WeaponSystem } from '../weapons/WeaponSystem'
import { DamageSystem, damageSystem } from '../weapons/DamageSystem'
import { WorldManager } from '../world/WorldManager'
import { ParticleSystem } from '../particles/ParticleSystem'
import { audioManager } from '../audio/AudioManager'
import { Inventory } from '../inventory/Inventory'
import { questManager, achievementsManager } from '../quests/QuestManager'
import { saveManager } from '../save/SaveManager'
import { CharacterClass, Difficulty, GameState, BiomeType } from '../types'
import { DIFFICULTY_MULTIPLIERS } from '../config/GameConfig'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import TouchControls from './TouchControls'
import HUD from './HUD'

interface GameCanvasProps {
  characterClass: CharacterClass
  playerName: string
  onExit: () => void
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  characterClass,
  playerName,
  onExit,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const playerRef = useRef<Player | null>(null)
  const enemyManagerRef = useRef<EnemyManager | null>(null)
  const projectileSystemRef = useRef<ProjectileSystem | null>(null)
  const weaponSystemRef = useRef<WeaponSystem | null>(null)
  const worldManagerRef = useRef<WorldManager | null>(null)
  const particleSystemRef = useRef<ParticleSystem | null>(null)
  const inventoryRef = useRef<Inventory | null>(null)
  const isInitializedRef = useRef(false)

  const [gameState, setGameState] = useState<GameState>(GameState.LOADING)
  const [isPaused, setIsPaused] = useState(false)
  const [showGameOver, setShowGameOver] = useState(false)
  const [showVictory, setShowVictory] = useState(false)

  // HUD state
  const [hudData, setHudData] = useState({
    health: 100,
    maxHealth: 100,
    mana: 50,
    maxMana: 50,
    stamina: 100,
    maxStamina: 100,
    level: 1,
    experience: 0,
    experienceToNext: 100,
    gold: 0,
    killCount: 0,
    score: 0,
    comboCount: 0,
    playerName,
    bossName: undefined as string | undefined,
    bossHealth: undefined as number | undefined,
    bossMaxHealth: undefined as number | undefined,
    fps: 60,
  })

  /**
   * Update HUD with current game state
   */
  const updateHUD = useCallback(() => {
    const player = playerRef.current
    if (!player) return

    const stats = player.stats.getStats()
    const progression = player.progression.getProgression()
    const enemyManager = enemyManagerRef.current
    const boss = enemyManager?.getBoss()
    const inventory = inventoryRef.current
    const engine = engineRef.current

    setHudData({
      health: stats.currentHealth,
      maxHealth: stats.maxHealth,
      mana: stats.currentMana,
      maxMana: stats.maxMana,
      stamina: stats.currentStamina,
      maxStamina: stats.maxStamina,
      level: progression.level,
      experience: progression.experience,
      experienceToNext: progression.experienceToNext,
      gold: inventory?.currencies.gold || 0,
      killCount: enemyManager?.getKillCount() || 0,
      score: progression.totalKills * 100 + progression.totalDamageDealt,
      comboCount: player.controller.getComboCount(),
      playerName: player.getName(),
      bossName: boss?.isAlive ? boss.definition.name : undefined,
      bossHealth: boss?.isAlive ? boss.instance.currentHealth : undefined,
      bossMaxHealth: boss?.isAlive ? boss.instance.maxHealth : undefined,
      fps: engine?.getStats().fps || 60,
    })
  }, [])

  /**
   * Set up game event listeners
   */
  const setupGameEvents = useCallback(() => {
    // Player attack triggers weapon system
    eventBus.on(GameEventType.WEAPON_FIRED, (event) => {
      if (event.source === 'PlayerController' && event.data.type === 'melee') {
        weaponSystemRef.current?.tryAttack()
      }
    })

    // Enemy death drops
    eventBus.on(GameEventType.ENEMY_DEATH, (event) => {
      const pos = new THREE.Vector3(
        event.data.position[0],
        event.data.position[1],
        event.data.position[2],
      )
      worldManagerRef.current?.spawnEnemyDrops(
        pos,
        event.data.gold,
        event.data.drops || [],
        0.5,
      )
      particleSystemRef.current?.createDeathEffect(pos)

      // Add gold to inventory
      inventoryRef.current?.addCurrency('gold_coin', event.data.gold)
      playerRef.current?.gainGold(event.data.gold)
      playerRef.current?.gainExperience(event.data.experience)

      audioManager.playSound('death', 'sfx' as any, { x: pos.x, y: pos.y, z: pos.z })
    })

    // Enemy damaged - hit effects
    eventBus.on(GameEventType.ENEMY_DAMAGED, (event) => {
      if (event.data.source === 'player' && event.data.position) {
        const pos = new THREE.Vector3(
          event.data.position[0],
          event.data.position[1],
          event.data.position[2],
        )
        particleSystemRef.current?.createHitSpark(pos, undefined, new THREE.Vector3(0, 1, 0))
        audioManager.playSound('hit', 'sfx' as any, { x: pos.x, y: pos.y, z: pos.z })
      }
    })

    // Player damaged - effects
    eventBus.on(GameEventType.PLAYER_DAMAGED, () => {
      audioManager.playSound('damage', 'sfx' as any)
      engineRef.current?.cameraController.shake(0.3, 0.3)
    })

    // Player death
    eventBus.on(GameEventType.PLAYER_DEATH, () => {
      audioManager.playSound('death', 'sfx' as any)
      setGameState(GameState.GAME_OVER)
      setShowGameOver(true)
    })

    // Player level up
    eventBus.on(GameEventType.PLAYER_LEVEL_UP, () => {
      audioManager.playSound('levelup', 'sfx' as any)
      if (playerRef.current) {
        const pos = playerRef.current.getPosition()
        particleSystemRef.current?.createLevelUpEffect(pos)
      }
    })

    // Item pickup
    eventBus.on(GameEventType.ITEM_PICKED_UP, (event) => {
      if (event.data.itemId === 'gold_coin') {
        audioManager.playSound('coin', 'ui' as any)
      } else {
        audioManager.playSound('pickup', 'sfx' as any)
      }
      inventoryRef.current?.addItem(event.data.itemId, event.data.quantity)
    })

    // Boss defeated
    eventBus.on(GameEventType.BOSS_DEFEATED, () => {
      audioManager.playSound('achievement', 'sfx' as any)
      setShowVictory(true)
      setGameState(GameState.VICTORY)
    })

    // Boss phase change
    eventBus.on(GameEventType.BOSS_PHASE_CHANGE, () => {
      audioManager.playSound('boss_roar', 'sfx' as any)
    })

    // Pause events
    eventBus.on(GameEventType.GAME_PAUSED, () => {
      setIsPaused(true)
    })

    eventBus.on(GameEventType.GAME_RESUMED, () => {
      setIsPaused(false)
    })

    // Enemy spawned - boss notification
    eventBus.on(GameEventType.ENEMY_SPAWNED, (event) => {
      if (event.data.isBoss) {
        audioManager.playSound('boss_roar', 'sfx' as any)
        audioManager.playMusic('boss_theme')
      }
    })
  }, [])

  /**
   * Clean up the game
   */
  const cleanup = useCallback(() => {
    const interval = (window as any).__gameHudInterval
    if (interval) clearInterval(interval)

    audioManager.stopMusic()
    audioManager.stopAll()

    if (engineRef.current) {
      disposeGameEngine()
      engineRef.current = null
    }

    isInitializedRef.current = false
  }, [])

  /**
   * Initialize the game
   */
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return
    isInitializedRef.current = true

    const initGame = async () => {
      try {
        console.info('[GameCanvas] Initializing game...')

        // Create game engine
        const engine = createGameEngine()
        engine.initialize(containerRef.current!)
        engineRef.current = engine

        // Initialize audio manager (needs user interaction)
        audioManager.initialize()
        audioManager.resume()
        audioManager.playMusic('forest_theme')

        // Create world manager
        const world = new WorldManager(
          engine.sceneManager.scene,
          engine.sceneManager,
          Math.floor(Math.random() * 100000),
        )
        world.initialize(BiomeType.FOREST)
        worldManagerRef.current = world

        // Create player
        const player = new Player(
          inputManager,
          engine.cameraController,
          characterClass,
          playerName,
        )
        playerRef.current = player

        // Position player at spawn
        const spawnPos = new THREE.Vector3(0, 0, 0)
        player.controller.setPosition(spawnPos.x, spawnPos.y, spawnPos.z)

        // Add player to scene
        engine.sceneManager.scene.add(player.controller.mesh)

        // Set camera target
        engine.cameraController.setTarget(player.controller.mesh)

        // Set ground and collision targets for player controller
        player.controller.setGroundTargets(world.getGroundObjects())
        player.controller.setCollisionTargets(world.getCollisionObjects())

        // Create enemy manager
        const enemyManager = new EnemyManager(engine.sceneManager.scene, {
          maxEnemies: 15,
          spawnInterval: 3,
          difficulty: Difficulty.NORMAL,
          bossEnabled: true,
          killCountForBoss: 30,
        })
        enemyManagerRef.current = enemyManager

        // Create projectile system
        const projectileSystem = new ProjectileSystem(engine.sceneManager.scene)
        projectileSystemRef.current = projectileSystem

        // Create particle system
        const particleSystem = new ParticleSystem(engine.sceneManager.scene)
        particleSystemRef.current = particleSystem

        // Create damage system
        damageSystem.setReferences(
          player,
          enemyManager,
          engine.sceneManager.scene,
        )
        damageSystem.setDifficulty(Difficulty.NORMAL)

        // Create weapon system
        const weaponSystem = new WeaponSystem(projectileSystem, damageSystem)
        weaponSystem.setPlayer(player)
        weaponSystemRef.current = weaponSystem

        // Equip starting weapon
        const startingWeaponId = player.character.equippedWeapon
        weaponSystem.equipWeapon(startingWeaponId)

        // Create inventory
        const inventory = new Inventory()
        inventoryRef.current = inventory

        // Set projectile system enemy manager reference
        projectileSystem.setEnemyManager(enemyManager)

        // Register all systems with the game loop
        engine.registerSystem({
          update: (dt: number) => {
            const currentTime = performance.now() / 1000
            player.update(dt, currentTime)
          },
        }, 'gameplay')

        engine.registerSystem({
          update: (dt: number) => {
            enemyManager.update(dt, player.getPosition())
          },
        }, 'ai')

        engine.registerSystem({
          update: (dt: number) => {
            projectileSystem.update(dt)
            projectileSystem.setPlayerPosition(player.getPosition())
          },
        }, 'physics')

        engine.registerSystem({
          update: (dt: number) => {
            weaponSystem.update(dt)
          },
        }, 'gameplay')

        engine.registerSystem({
          update: (dt: number) => {
            damageSystem.update(dt)
          },
        }, 'gameplay')

        engine.registerSystem({
          update: (dt: number) => {
            particleSystem.update(dt)
          },
        }, 'particles')

        engine.registerSystem({
          update: (dt: number) => {
            world.update(dt, player.getPosition())
          },
        }, 'gameplay')

        engine.registerSystem({
          update: () => {
            inputManager.lateUpdate()
          },
        }, 'input')

        // Set up event listeners for game events
        setupGameEvents()

        // Set state to playing
        setGameState(GameState.PLAYING)

        // Start HUD update interval
        const hudInterval = setInterval(() => {
          updateHUD()
        }, 100)

        // Store interval for cleanup
        ;(window as any).__gameHudInterval = hudInterval

        // Play level loaded sound
        audioManager.playSound('levelup', 'sfx' as any)

        // Spawn ambient particles
        particleSystem.createAmbientParticles()

        console.info('[GameCanvas] Game initialized successfully')
      } catch (error) {
        console.error('[GameCanvas] Failed to initialize game:', error)
      }
    }

    initGame()

    return () => {
      cleanup()
    }
  }, [characterClass, playerName, setupGameEvents, updateHUD, cleanup])

  /**
   * Handle pause button
   */
  const handlePause = () => {
    if (gameState === GameState.PLAYING) {
      engineRef.current?.pause()
    } else if (gameState === GameState.PAUSED) {
      engineRef.current?.resume()
    }
  }

  /**
   * Handle restart
   */
  const handleRestart = () => {
    cleanup()
    setShowGameOver(false)
    setShowVictory(false)
    setTimeout(() => {
      window.location.reload()
    }, 100)
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        overflow: 'hidden',
        touchAction: 'none',
      }}
    >
      {/* HUD */}
      <HUD
        visible={gameState === GameState.PLAYING || gameState === GameState.PAUSED}
        {...hudData}
      />

      {/* Touch Controls */}
      <TouchControls
        visible={gameState === GameState.PLAYING}
        onJump={() => {}}
        onAttack={() => {
          weaponSystemRef.current?.tryAttack()
        }}
        onDash={() => {}}
        onSpecial={() => {
          playerRef.current?.abilities.useAbility('dash_strike')
        }}
      />

      {/* Pause Menu */}
      {isPaused && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'rgba(20,20,40,0.95)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
            minWidth: '300px',
          }}>
            <h2 style={{ fontSize: '28px', marginBottom: '20px', color: '#ffd700' }}>
              متوقف مؤقتاً
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handlePause}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ▶ متابعة
              </button>
              <button
                onClick={onExit}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                🚪 خروج للقائمة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {showGameOver && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{
            fontSize: '64px',
            color: '#ff4040',
            textShadow: '0 0 30px rgba(255,64,64,0.8)',
            marginBottom: '20px',
          }}>
            انتهت اللعبة
          </h1>
          <div style={{
            background: 'rgba(20,20,40,0.9)',
            padding: '24px 40px',
            borderRadius: '12px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>
              المستوى: <span style={{ color: '#ffd700' }}>{hudData.level}</span>
            </div>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>
              القتلى: <span style={{ color: '#ff6b6b' }}>{hudData.killCount}</span>
            </div>
            <div style={{ fontSize: '18px' }}>
              النقاط: <span style={{ color: '#ffd700' }}>{hudData.score}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleRestart}
              style={{
                padding: '14px 32px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #ffd700, #ff8040)',
                border: 'none',
                borderRadius: '10px',
                color: '#000',
                cursor: 'pointer',
              }}
            >
              🔄 إعادة المحاولة
            </button>
            <button
              onClick={onExit}
              style={{
                padding: '14px 32px',
                fontSize: '18px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '10px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              🏠 القائمة الرئيسية
            </button>
          </div>
        </div>
      )}

      {/* Victory Screen */}
      {showVictory && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 300,
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h1 style={{
            fontSize: '64px',
            background: 'linear-gradient(90deg, #ffd700, #ff8040)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '20px',
            textShadow: '0 0 30px rgba(255,215,0,0.5)',
          }}>
            نصر!
          </h1>
          <p style={{ fontSize: '20px', marginBottom: '30px', color: '#ccc' }}>
            لقد هزمت الزعيم! أنت بطل حقيقي!
          </p>
          <button
            onClick={onExit}
            style={{
              padding: '14px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #ffd700, #ff8040)',
              border: 'none',
              borderRadius: '10px',
              color: '#000',
              cursor: 'pointer',
            }}
          >
            🏠 العودة للقائمة
          </button>
        </div>
      )}

      {/* Loading screen */}
      {gameState === GameState.LOADING && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div>جاري التحميل...</div>
        </div>
      )}
    </div>
  )
}

export default GameCanvas
