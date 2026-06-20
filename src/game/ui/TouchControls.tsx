'use client'

// ===================================================================
// Touch Controls - Virtual joystick and action buttons
// ===================================================================
// A React component that renders the on-screen virtual joystick and
// action buttons for mobile play. Communicates with the InputManager
// to update game state. Designed with large touch targets and
// customizable opacity/positioning for accessibility.
// ===================================================================

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { inputManager } from '../input/InputManager'
import { JoystickState } from '../types'

interface TouchControlsProps {
  visible: boolean
  onJump?: () => void
  onAttack?: () => void
  onDash?: () => void
  onSpecial?: () => void
  joystickSize?: number
  buttonSize?: number
  opacity?: number
  showLabels?: boolean
  className?: string
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  visible,
  onJump,
  onAttack,
  onDash,
  onSpecial,
  joystickSize = 130,
  buttonSize = 75,
  opacity = 0.65,
  showLabels = true,
  className = '',
}) => {
  const [joystickActive, setJoystickActive] = useState(false)
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 })
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 })

  const joystickRef = useRef<HTMLDivElement>(null)
  const joystickCenter = useRef({ x: 0, y: 0 })
  const activeTouchId = useRef<number | null>(null)

  // Update input manager with joystick state
  const updateJoystickState = useCallback(
    (active: boolean, dx: number, dy: number) => {
      const magnitude = Math.min(1, Math.sqrt(dx * dx + dy * dy) / (joystickSize / 2))
      const angle = Math.atan2(dy, dx)
      const state: Partial<JoystickState> = {
        active,
        position: { x: joystickPos.x, y: joystickPos.y },
        direction: { x: magnitude > 0 ? dx / Math.max(0.01, Math.sqrt(dx * dx + dy * dy)) : 0, y: magnitude > 0 ? dy / Math.max(0.01, Math.sqrt(dx * dx + dy * dy)) : 0 },
        magnitude,
        angle,
      }
      inputManager.updateJoystick(state)
    },
    [joystickPos, joystickSize],
  )

  // Joystick touch handlers
  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const rect = joystickRef.current?.getBoundingClientRect()
    if (!rect) return

    joystickCenter.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }

    let clientX: number, clientY: number
    if ('touches' in e) {
      const touch = e.touches[0]
      clientX = touch.clientX
      clientY = touch.clientY
      activeTouchId.current = touch.identifier
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    setJoystickActive(true)
    setJoystickPos({ x: joystickCenter.current.x, y: joystickCenter.current.y })
    updateJoystickPosition(clientX, clientY)
  }

  const updateJoystickPosition = (clientX: number, clientY: number) => {
    const dx = clientX - joystickCenter.current.x
    const dy = clientY - joystickCenter.current.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxRadius = joystickSize / 2 - 15

    let clampedX = dx
    let clampedY = dy
    if (distance > maxRadius) {
      const ratio = maxRadius / distance
      clampedX = dx * ratio
      clampedY = dy * ratio
    }

    setKnobPos({ x: clampedX, y: clampedY })
    updateJoystickState(true, clampedX / maxRadius, clampedY / maxRadius)
  }

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickActive) return
    e.preventDefault()

    let clientX: number, clientY: number
    if ('touches' in e) {
      // Find our active touch
      const touch = Array.from(e.touches).find((t) => t.identifier === activeTouchId.current)
      if (!touch) return
      clientX = touch.clientX
      clientY = touch.clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    updateJoystickPosition(clientX, clientY)
  }

  const handleJoystickEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setJoystickActive(false)
    setKnobPos({ x: 0, y: 0 })
    activeTouchId.current = null
    updateJoystickState(false, 0, 0)
  }

  // Global mouse handlers for desktop drag support
  useEffect(() => {
    if (!joystickActive) return

    const handleMouseMove = (e: MouseEvent) => {
      updateJoystickPosition(e.clientX, e.clientY)
    }
    const handleMouseUp = () => {
      setJoystickActive(false)
      setKnobPos({ x: 0, y: 0 })
      updateJoystickState(false, 0, 0)
    }
    const handleTouchMove = (e: TouchEvent) => {
      const touch = Array.from(e.touches).find((t) => t.identifier === activeTouchId.current)
      if (touch) {
        e.preventDefault()
        updateJoystickPosition(touch.clientX, touch.clientY)
      }
    }
    const handleTouchEnd = (e: TouchEvent) => {
      const stillActive = Array.from(e.touches).some((t) => t.identifier === activeTouchId.current)
      if (!stillActive) {
        setJoystickActive(false)
        setKnobPos({ x: 0, y: 0 })
        activeTouchId.current = null
        updateJoystickState(false, 0, 0)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [joystickActive, updateJoystickState])

  if (!visible) return null

  // Action button handlers
  const handleActionDown = (name: string, callback?: () => void) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    inputManager.setActionButton(name, true)
    callback?.()
  }

  const handleActionUp = (name: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    inputManager.setActionButton(name, false)
  }

  const actionButtonStyle: React.CSSProperties = {
    width: `${buttonSize}px`,
    height: `${buttonSize}px`,
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), rgba(0,0,0,0.4))',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'none',
    cursor: 'pointer',
    opacity,
    transition: 'transform 0.1s, background 0.1s',
  }

  return (
    <div
      className={`touch-controls-container ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 100,
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Virtual Joystick - Bottom Left */}
      <div
        ref={joystickRef}
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
        onMouseDown={handleJoystickStart}
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '30px',
          width: `${joystickSize}px`,
          height: `${joystickSize}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), rgba(0,0,0,0.35))',
          border: '2px solid rgba(255, 255, 255, 0.45)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          pointerEvents: 'auto',
          touchAction: 'none',
          opacity,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
        }}
      >
        {/* Directional indicators */}
        <div style={{
          position: 'absolute',
          inset: '15%',
          borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.2)',
        }} />
        {/* Knob */}
        <div
          style={{
            width: `${joystickSize * 0.4}px`,
            height: `${joystickSize * 0.4}px`,
            borderRadius: '50%',
            background: joystickActive
              ? 'radial-gradient(circle at 30% 30%, rgba(120,180,255,0.95), rgba(40,80,160,0.85))'
              : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7), rgba(180,180,200,0.5))',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            transition: joystickActive ? 'none' : 'transform 0.2s ease-out',
            boxShadow: joystickActive
              ? '0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(120,180,255,0.5)'
              : '0 2px 6px rgba(0,0,0,0.3)',
          }}
        />
        {showLabels && !joystickActive && (
          <div style={{
            position: 'absolute',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '10px',
            fontWeight: 'bold',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            bottom: '-20px',
          }}>
            تحرك
          </div>
        )}
      </div>

      {/* Action Buttons - Bottom Right */}
      <div
        style={{
          position: 'absolute',
          bottom: '40px',
          right: '30px',
          display: 'grid',
          gridTemplateColumns: `${buttonSize}px ${buttonSize}px`,
          gridTemplateRows: `${buttonSize}px ${buttonSize}px`,
          gap: '10px',
          pointerEvents: 'auto',
        }}
      >
        {/* Jump button - top left of cluster */}
        <button
          onTouchStart={handleActionDown('jump', onJump)}
          onTouchEnd={handleActionUp('jump')}
          onMouseDown={handleActionDown('jump', onJump)}
          onMouseUp={handleActionUp('jump')}
          style={{
            ...actionButtonStyle,
            background: 'radial-gradient(circle at 30% 30%, rgba(120,255,180,0.4), rgba(20,120,80,0.6))',
            borderColor: 'rgba(120,255,180,0.7)',
          }}
        >
          <span style={{ fontSize: '24px' }}>↑</span>
          {showLabels && <span>قفز</span>}
        </button>

        {/* Attack button - top right of cluster */}
        <button
          onTouchStart={handleActionDown('attack', onAttack)}
          onTouchEnd={handleActionUp('attack')}
          onMouseDown={handleActionDown('attack', onAttack)}
          onMouseUp={handleActionUp('attack')}
          style={{
            ...actionButtonStyle,
            background: 'radial-gradient(circle at 30% 30%, rgba(255,120,120,0.4), rgba(160,30,30,0.6))',
            borderColor: 'rgba(255,120,120,0.7)',
          }}
        >
          <span style={{ fontSize: '24px' }}>⚔</span>
          {showLabels && <span>هجوم</span>}
        </button>

        {/* Dash button - bottom left of cluster */}
        <button
          onTouchStart={handleActionDown('dash', onDash)}
          onTouchEnd={handleActionUp('dash')}
          onMouseDown={handleActionDown('dash', onDash)}
          onMouseUp={handleActionUp('dash')}
          style={{
            ...actionButtonStyle,
            background: 'radial-gradient(circle at 30% 30%, rgba(120,180,255,0.4), rgba(30,80,160,0.6))',
            borderColor: 'rgba(120,180,255,0.7)',
          }}
        >
          <span style={{ fontSize: '20px' }}>»</span>
          {showLabels && <span>اندفاع</span>}
        </button>

        {/* Special button - bottom right of cluster */}
        <button
          onTouchStart={handleActionDown('special', onSpecial)}
          onTouchEnd={handleActionUp('special')}
          onMouseDown={handleActionDown('special', onSpecial)}
          onMouseUp={handleActionUp('special')}
          style={{
            ...actionButtonStyle,
            background: 'radial-gradient(circle at 30% 30%, rgba(255,200,80,0.4), rgba(200,140,30,0.6))',
            borderColor: 'rgba(255,200,80,0.7)',
          }}
        >
          <span style={{ fontSize: '22px' }}>✦</span>
          {showLabels && <span>خاص</span>}
        </button>
      </div>

      {/* Secondary buttons - Top Right */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        gap: '10px',
        pointerEvents: 'auto',
      }}>
        <button
          onTouchStart={handleActionDown('pause')}
          onTouchEnd={handleActionUp('pause')}
          onMouseDown={handleActionDown('pause')}
          onMouseUp={handleActionUp('pause')}
          style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.4)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            opacity,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="إيقاف مؤقت"
        >
          ⏸
        </button>
      </div>
    </div>
  )
}

export default TouchControls
