'use client'

// ===================================================================
// Main Menu - Title screen and main navigation
// ===================================================================
// The first screen the player sees. Provides access to start a new
// game, continue, settings, and other meta-game options.
// ===================================================================

import React, { useState } from 'react'
import { CharacterClass } from '../types'
import { CLASS_STARTING_STATS } from '../config/GameConfig'

interface MainMenuProps {
  onStart: (classType: CharacterClass, name: string) => void
  onContinue?: () => void
  hasSave: boolean
  onSettings?: () => void
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStart,
  onContinue,
  hasSave,
  onSettings,
}) => {
  const [selectedClass, setSelectedClass] = useState<CharacterClass>(CharacterClass.WARRIOR)
  const [playerName, setPlayerName] = useState('بطل')
  const [showClassSelect, setShowClassSelect] = useState(false)

  const classes: CharacterClass[] = [
    CharacterClass.WARRIOR,
    CharacterClass.ARCHER,
    CharacterClass.MAGE,
    CharacterClass.ASSASSIN,
    CharacterClass.TANK,
    CharacterClass.PALADIN,
    CharacterClass.NECROMANCER,
    CharacterClass.BERSERKER,
  ]

  const classIcons: Record<CharacterClass, string> = {
    [CharacterClass.WARRIOR]: '⚔️',
    [CharacterClass.ARCHER]: '🏹',
    [CharacterClass.MAGE]: '🔮',
    [CharacterClass.ASSASSIN]: '🗡️',
    [CharacterClass.TANK]: '🛡️',
    [CharacterClass.PALADIN]: '✨',
    [CharacterClass.NECROMANCER]: '💀',
    [CharacterClass.BERSERKER]: '🪓',
  }

  const classNamesAr: Record<CharacterClass, string> = {
    [CharacterClass.WARRIOR]: 'المحارب',
    [CharacterClass.ARCHER]: 'الرامي',
    [CharacterClass.MAGE]: 'الساحر',
    [CharacterClass.ASSASSIN]: 'المغتال',
    [CharacterClass.TANK]: 'الدرع',
    [CharacterClass.PALADIN]: 'البطل المقدس',
    [CharacterClass.NECROMANCER]: 'مستدعي الموتى',
    [CharacterClass.BERSERKER]: 'الهائج',
  }

  if (showClassSelect) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0a0a1a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        zIndex: 1000,
        padding: '20px',
        overflowY: 'auto',
      }}>
        <h1 style={{
          fontSize: '32px',
          marginBottom: '8px',
          background: 'linear-gradient(90deg, #ffd700, #ff8040)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 20px rgba(255,215,0,0.5)',
        }}>
          اختر فئتك
        </h1>
        <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '14px' }}>
          كل فئة لها قدرات وأسلوب لعب فريد
        </p>

        {/* Name input */}
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="اسم البطل"
          maxLength={20}
          style={{
            padding: '10px 16px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '2px solid rgba(255,215,0,0.5)',
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            marginBottom: '20px',
            width: '250px',
            textAlign: 'center',
            outline: 'none',
          }}
        />

        {/* Class grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          maxWidth: '700px',
          marginBottom: '30px',
        }}>
          {classes.map((cls) => {
            const info = CLASS_STARTING_STATS[cls]
            const isSelected = selectedClass === cls
            return (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,128,64,0.2))'
                    : 'rgba(255,255,255,0.05)',
                  border: isSelected
                    ? '2px solid #ffd700'
                    : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  color: 'white',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span style={{ fontSize: '28px' }}>{classIcons[cls]}</span>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  {classNamesAr[cls]}
                </span>
                <div style={{ fontSize: '10px', color: '#aaa', textAlign: 'center' }}>
                  <div>❤️ {info.health}</div>
                  <div>⚔️ {info.attack}</div>
                  <div>🛡️ {info.defense}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected class description */}
        <div style={{
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: '12px',
          padding: '16px 24px',
          maxWidth: '500px',
          textAlign: 'center',
          marginBottom: '20px',
        }}>
          <h3 style={{ color: '#ffd700', fontSize: '18px', marginBottom: '8px' }}>
            {classIcons[selectedClass]} {classNamesAr[selectedClass]}
          </h3>
          <p style={{ color: '#ccc', fontSize: '13px', lineHeight: 1.5 }}>
            {CLASS_STARTING_STATS[selectedClass].descriptionAr}
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => onStart(selectedClass, playerName || 'بطل')}
            style={{
              padding: '14px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #ffd700, #ff8040)',
              border: 'none',
              borderRadius: '10px',
              color: '#000',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(255,215,0,0.5)',
              transition: 'transform 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            ابدأ المغامرة
          </button>
          <button
            onClick={() => setShowClassSelect(false)}
            style={{
              padding: '14px 24px',
              fontSize: '16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '10px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            رجوع
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #2a1a4a 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* Animated background particles */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(255,215,0,0.1) 0%, transparent 60%)',
        animation: 'pulse 4s ease-in-out infinite',
      }} />

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '40px', zIndex: 1 }}>
        <h1 style={{
          fontSize: 'clamp(36px, 8vw, 72px)',
          fontWeight: '900',
          background: 'linear-gradient(90deg, #ffd700, #ff8040, #ff4080)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 40px rgba(255,215,0,0.5)',
          marginBottom: '8px',
          letterSpacing: '2px',
        }}>
          عوالم الأثير
        </h1>
        <h2 style={{
          fontSize: 'clamp(18px, 4vw, 32px)',
          color: '#80c0ff',
          textShadow: '0 0 20px rgba(128,192,255,0.5)',
        }}>
          ثلاثية الأبعاد
        </h2>
        <p style={{
          marginTop: '12px',
          color: '#888',
          fontSize: '14px',
          maxWidth: '400px',
        }}>
          مغامرة ملحمية في عالم سحري. قاتل الأعداء، اهزم الزعماء، وكن البطل الأسطوري!
        </p>
      </div>

      {/* Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 1,
        minWidth: '280px',
      }}>
        {hasSave && onContinue && (
          <button
            onClick={onContinue}
            style={{
              padding: '16px 32px',
              fontSize: '18px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #2ecc71, #27ae60)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(46,204,113,0.4)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(46,204,113,0.6)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(46,204,113,0.4)'
            }}
          >
            ▶ متابعة
          </button>
        )}

        <button
          onClick={() => setShowClassSelect(true)}
          style={{
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #ffd700, #ff8040)',
            border: 'none',
            borderRadius: '12px',
            color: '#000',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(255,215,0,0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(255,215,0,0.6)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,215,0,0.4)'
          }}
        >
          ⚔ لعبة جديدة
        </button>

        {onSettings && (
          <button
            onClick={onSettings}
            style={{
              padding: '14px 32px',
              fontSize: '16px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              color: 'white',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              transition: 'background 0.2s',
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            ⚙ الإعدادات
          </button>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        color: '#666',
        fontSize: '12px',
        textAlign: 'center',
      }}>
        عوالم الأثير 3D · نسخة 1.0.0
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default MainMenu
