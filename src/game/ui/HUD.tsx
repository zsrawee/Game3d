'use client'

// ===================================================================
// HUD - Heads-Up Display during gameplay
// ===================================================================
// Displays health/mana/stamina bars, minimap, kill count, score,
// boss health bar, notifications, and other in-game UI elements.
// ===================================================================

import React, { useState, useEffect, useCallback } from 'react'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'
import { formatNumber } from '../utils/MathUtils'

interface HUDProps {
  visible: boolean
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  stamina: number
  maxStamina: number
  level: number
  experience: number
  experienceToNext: number
  gold: number
  killCount: number
  score: number
  comboCount: number
  playerName: string
  bossName?: string
  bossHealth?: number
  bossMaxHealth?: number
  fps?: number
}

interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement' | 'quest'
  timestamp: number
}

export const HUD: React.FC<HUDProps> = ({
  visible,
  health,
  maxHealth,
  mana,
  maxMana,
  stamina,
  maxStamina,
  level,
  experience,
  experienceToNext,
  gold,
  killCount,
  score,
  comboCount,
  playerName,
  bossName,
  bossHealth,
  bossMaxHealth,
  fps,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Listen for notifications
  useEffect(() => {
    const unsubscribe = eventBus.on(GameEventType.NOTIFICATION, (event) => {
      if (event.data.message) {
        const notification: Notification = {
          id: `${Date.now()}_${Math.random()}`,
          message: event.data.message,
          type: event.data.type || 'info',
          timestamp: Date.now(),
        }
        setNotifications((prev) => [...prev, notification])
        // Remove after 4 seconds
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
        }, 4000)
      }
    })
    return unsubscribe
  }, [])

  // Listen for achievement unlocks
  useEffect(() => {
    const unsubscribe = eventBus.on(GameEventType.ACHIEVEMENT_UNLOCKED, (event) => {
      const notification: Notification = {
        id: `ach_${Date.now()}`,
        message: `🎉 إنجاز: ${event.data.name}`,
        type: 'achievement',
        timestamp: Date.now(),
      }
      setNotifications((prev) => [...prev, notification])
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      }, 5000)
    })
    return unsubscribe
  }, [])

  // Listen for quest completion
  useEffect(() => {
    const unsubscribe = eventBus.on(GameEventType.QUEST_COMPLETED, (event) => {
      const notification: Notification = {
        id: `quest_${Date.now()}`,
        message: `✓ مهمة مكتملة: ${event.data.questName}`,
        type: 'quest',
        timestamp: Date.now(),
      }
      setNotifications((prev) => [...prev, notification])
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      }, 5000)
    })
    return unsubscribe
  }, [])

  const healthPercent = maxHealth > 0 ? (health / maxHealth) * 100 : 0
  const manaPercent = maxMana > 0 ? (mana / maxMana) * 100 : 0
  const staminaPercent = maxStamina > 0 ? (stamina / maxStamina) * 100 : 0
  const expPercent = experienceToNext > 0 ? (experience / experienceToNext) * 100 : 0
  const bossHealthPercent = bossMaxHealth && bossMaxHealth > 0 && bossHealth !== undefined
    ? (bossHealth / bossMaxHealth) * 100
    : 0

  const getBarColor = (percent: number, type: 'health' | 'mana' | 'stamina') => {
    if (type === 'health') {
      if (percent > 50) return 'linear-gradient(90deg, #2ecc71, #27ae60)'
      if (percent > 25) return 'linear-gradient(90deg, #f1c40f, #e67e22)'
      return 'linear-gradient(90deg, #e74c3c, #c0392b)'
    }
    if (type === 'mana') return 'linear-gradient(90deg, #3498db, #2980b9)'
    return 'linear-gradient(90deg, #f39c12, #d35400)'
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Top Left - Player Stats */}
      <div style={{
        position: 'absolute',
        top: '15px',
        left: '15px',
        background: 'rgba(0,0,0,0.5)',
        borderRadius: '12px',
        padding: '10px 14px',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.15)',
        minWidth: '220px',
      }}>
        {/* Player name and level */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}>
          <span style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>
            {playerName}
          </span>
          <span style={{
            color: '#ffd700',
            fontSize: '12px',
            fontWeight: 'bold',
            background: 'rgba(0,0,0,0.5)',
            padding: '2px 8px',
            borderRadius: '8px',
          }}>
            مستوى {level}
          </span>
        </div>

        {/* Health Bar */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#ccc',
            marginBottom: '2px',
          }}>
            <span>الصحة</span>
            <span>{Math.ceil(health)} / {Math.ceil(maxHealth)}</span>
          </div>
          <div style={{
            width: '100%',
            height: '14px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '7px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div style={{
              width: `${healthPercent}%`,
              height: '100%',
              background: getBarColor(healthPercent, 'health'),
              transition: 'width 0.3s, background 0.3s',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
            }} />
          </div>
        </div>

        {/* Mana Bar */}
        <div style={{ marginBottom: '4px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#ccc',
            marginBottom: '2px',
          }}>
            <span>المانا</span>
            <span>{Math.ceil(mana)} / {Math.ceil(maxMana)}</span>
          </div>
          <div style={{
            width: '100%',
            height: '10px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '5px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div style={{
              width: `${manaPercent}%`,
              height: '100%',
              background: getBarColor(manaPercent, 'mana'),
              transition: 'width 0.3s',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
            }} />
          </div>
        </div>

        {/* Stamina Bar */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#ccc',
            marginBottom: '2px',
          }}>
            <span>القدرة</span>
            <span>{Math.ceil(stamina)} / {Math.ceil(maxStamina)}</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div style={{
              width: `${staminaPercent}%`,
              height: '100%',
              background: getBarColor(staminaPercent, 'stamina'),
              transition: 'width 0.2s',
            }} />
          </div>
        </div>

        {/* Experience Bar */}
        <div style={{ marginTop: '6px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '9px',
            color: '#aaa',
            marginBottom: '2px',
          }}>
            <span>خبرة</span>
            <span>{expPercent.toFixed(1)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '4px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${expPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #9b59b6, #8e44ad)',
              transition: 'width 0.3s',
            }} />
          </div>
        </div>
      </div>

      {/* Top Right - Score, Gold, Kills */}
      <div style={{
        position: 'absolute',
        top: '15px',
        right: '15px',
        textAlign: 'right',
        fontFamily: 'system-ui, sans-serif',
      }}>
        {/* Score */}
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '10px',
          padding: '6px 12px',
          marginBottom: '6px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          <div style={{ fontSize: '10px', color: '#aaa' }}>النقاط</div>
          <div style={{
            fontSize: '22px',
            fontWeight: 'bold',
            color: '#ffd700',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          }}>
            {formatNumber(score)}
          </div>
        </div>

        {/* Gold */}
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '10px',
          padding: '4px 12px',
          marginBottom: '6px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          justifyContent: 'flex-end',
        }}>
          <span style={{ fontSize: '14px' }}>🪙</span>
          <span style={{
            fontSize: '14px',
            color: '#ffd700',
            fontWeight: 'bold',
          }}>
            {formatNumber(gold)}
          </span>
        </div>

        {/* Kills */}
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          borderRadius: '10px',
          padding: '4px 12px',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          justifyContent: 'flex-end',
        }}>
          <span style={{ fontSize: '14px' }}>⚔</span>
          <span style={{
            fontSize: '14px',
            color: '#ff6b6b',
            fontWeight: 'bold',
          }}>
            {killCount} قتلى
          </span>
        </div>

        {/* FPS (debug) */}
        {fps !== undefined && (
          <div style={{
            marginTop: '6px',
            fontSize: '10px',
            color: '#888',
            background: 'rgba(0,0,0,0.4)',
            padding: '2px 8px',
            borderRadius: '4px',
            display: 'inline-block',
          }}>
            {fps} FPS
          </div>
        )}
      </div>

      {/* Top Center - Boss Health Bar */}
      {bossName && bossHealth !== undefined && bossMaxHealth !== undefined && (
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '50%',
          maxWidth: '500px',
          textAlign: 'center',
        }}>
          <div style={{
            color: '#ff4040',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            marginBottom: '4px',
          }}>
            {bossName}
          </div>
          <div style={{
            width: '100%',
            height: '18px',
            background: 'rgba(0,0,0,0.7)',
            borderRadius: '9px',
            overflow: 'hidden',
            border: '2px solid rgba(255,64,64,0.6)',
            boxShadow: '0 0 20px rgba(255,64,64,0.4)',
          }}>
            <div style={{
              width: `${bossHealthPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #ff4040, #c02020)',
              transition: 'width 0.3s',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
            }} />
          </div>
        </div>
      )}

      {/* Combo Counter */}
      {comboCount > 1 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ffd700',
          fontSize: '48px',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(255,215,0,0.8), 0 4px 8px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
          animation: 'comboPop 0.3s ease-out',
        }}>
          {comboCount}x
          <div style={{ fontSize: '16px', color: '#fff' }}>كومبو</div>
        </div>
      )}

      {/* Notifications */}
      <div style={{
        position: 'absolute',
        top: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        maxWidth: '80%',
      }}>
        {notifications.map((notif) => {
          const colors: Record<string, { bg: string; border: string; text: string }> = {
            info: { bg: 'rgba(0,0,0,0.7)', border: 'rgba(255,255,255,0.3)', text: '#ffffff' },
            success: { bg: 'rgba(0,100,0,0.7)', border: 'rgba(0,255,0,0.5)', text: '#aaffaa' },
            warning: { bg: 'rgba(100,80,0,0.7)', border: 'rgba(255,200,0,0.5)', text: '#ffdd80' },
            error: { bg: 'rgba(100,0,0,0.7)', border: 'rgba(255,0,0,0.5)', text: '#ff8080' },
            achievement: { bg: 'rgba(80,60,0,0.8)', border: 'rgba(255,215,0,0.7)', text: '#ffd700' },
            quest: { bg: 'rgba(0,60,80,0.8)', border: 'rgba(0,200,255,0.6)', text: '#80ddff' },
          }
          const color = colors[notif.type] || colors.info
          return (
            <div
              key={notif.id}
              style={{
                background: color.bg,
                border: `1px solid ${color.border}`,
                borderRadius: '8px',
                padding: '8px 16px',
                color: color.text,
                fontSize: '13px',
                fontWeight: 'bold',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: `0 4px 16px ${color.border}`,
                animation: 'slideIn 0.3s ease-out',
                textAlign: 'center',
              }}
            >
              {notif.message}
            </div>
          )
        })}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes comboPop {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default HUD
