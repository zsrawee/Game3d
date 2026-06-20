'use client'

// ===================================================================
// Main Page - Entry point for the 3D Mobile Game
// ===================================================================
// This is the only user-visible route. It manages the high-level
// game state machine: main menu → character select → game → game
// over → back to menu. Delegates rendering to the appropriate
// game UI component based on the current state.
// ===================================================================

import React, { useState } from 'react'
import MainMenu from '../game/ui/MainMenu'
import GameCanvas from '../game/ui/GameCanvas'
import { CharacterClass, GameState } from '../game/types'
import { saveManager } from '../game/save/SaveManager'

export default function Home() {
  const [gameState, setGameState] = useState<GameState>(GameState.MAIN_MENU)
  const [characterClass, setCharacterClass] = useState<CharacterClass>(CharacterClass.WARRIOR)
  const [playerName, setPlayerName] = useState('بطل')
  const [hasSave, setHasSave] = useState(() => {
    if (typeof window === 'undefined') return false
    return saveManager.hasSave(0)
  })

  /**
   * Start a new game
   */
  const handleStart = (cls: CharacterClass, name: string) => {
    setCharacterClass(cls)
    setPlayerName(name)
    setGameState(GameState.PLAYING)
  }

  /**
   * Continue from save
   */
  const handleContinue = () => {
    // For simplicity, just start a new game with default settings
    // In a full implementation, this would load save data
    setGameState(GameState.PLAYING)
  }

  /**
   * Exit to main menu
   */
  const handleExit = () => {
    setGameState(GameState.MAIN_MENU)
    setHasSave(saveManager.hasSave(0))
    // Reload the page to ensure clean state
    setTimeout(() => window.location.reload(), 100)
  }

  // Render based on game state
  if (gameState === GameState.PLAYING) {
    return (
      <GameCanvas
        characterClass={characterClass}
        playerName={playerName}
        onExit={handleExit}
      />
    )
  }

  return (
    <MainMenu
      onStart={handleStart}
      onContinue={hasSave ? handleContinue : undefined}
      hasSave={hasSave}
      onSettings={() => {
        // Settings menu would go here
        console.log('Settings clicked')
      }}
    />
  )
}
