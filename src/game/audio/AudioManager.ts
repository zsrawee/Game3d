// ===================================================================
// Audio Manager - Sound effects and music playback
// ===================================================================
// Manages all game audio: background music, sound effects, ambient
// sounds, and UI sounds. Uses the Web Audio API for spatial audio
// and dynamic volume control. Falls back gracefully if audio fails.
// ===================================================================

import { AudioCategory, AudioTrack } from '../types'
import { AUDIO_CONFIG } from '../config/GameConfig'
import { clamp } from '../utils/MathUtils'

export class AudioManager {
  private context: AudioContext | null = null
  private masterGain: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  private voiceGain: GainNode | null = null
  private ambientGain: GainNode | null = null
  private uiGain: GainNode | null = null

  private loadedTracks: Map<string, AudioBuffer> = new Map()
  private activeSources: Map<string, AudioBufferSourceNode> = new Map()
  private activeGainNodes: Map<string, GainNode> = new Map()
  private musicSource: AudioBufferSourceNode | null = null
  private currentMusicTrack: string | null = null
  private proceduralSounds: Map<string, boolean> = new Map()

  private masterVolume: number = AUDIO_CONFIG.MASTER_VOLUME_DEFAULT
  private musicVolume: number = AUDIO_CONFIG.MUSIC_VOLUME_DEFAULT
  private sfxVolume: number = AUDIO_CONFIG.SFX_VOLUME_DEFAULT
  private voiceVolume: number = AUDIO_CONFIG.VOICE_VOLUME_DEFAULT
  private ambientVolume: number = AUDIO_CONFIG.AMBIENT_VOLUME_DEFAULT
  private uiVolume: number = AUDIO_CONFIG.UI_VOLUME_DEFAULT

  private audioEnabled: boolean = true
  private initialized: boolean = false
  private listenerPosition: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }

  constructor() {}

  /**
   * Initialize the audio system (must be called after user interaction)
   */
  initialize(): void {
    if (this.initialized) return

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      this.context = new AudioContextClass()

      // Create gain nodes
      this.masterGain = this.context.createGain()
      this.masterGain.connect(this.context.destination)
      this.masterGain.gain.value = this.masterVolume

      this.musicGain = this.context.createGain()
      this.musicGain.connect(this.masterGain)
      this.musicGain.gain.value = this.musicVolume

      this.sfxGain = this.context.createGain()
      this.sfxGain.connect(this.masterGain)
      this.sfxGain.gain.value = this.sfxVolume

      this.voiceGain = this.context.createGain()
      this.voiceGain.connect(this.masterGain)
      this.voiceGain.gain.value = this.voiceVolume

      this.ambientGain = this.context.createGain()
      this.ambientGain.connect(this.masterGain)
      this.ambientGain.gain.value = this.ambientVolume

      this.uiGain = this.context.createGain()
      this.uiGain.connect(this.masterGain)
      this.uiGain.gain.value = this.uiVolume

      this.initialized = true
      console.info('[AudioManager] Initialized')
    } catch (error) {
      console.warn('[AudioManager] Failed to initialize:', error)
    }
  }

  /**
   * Resume the audio context (after user interaction)
   */
  resume(): void {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume()
    }
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = clamp(volume, 0, 1)
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume
    }
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = clamp(volume, 0, 1)
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume
    }
  }

  /**
   * Set SFX volume (0-1)
   */
  setSfxVolume(volume: number): void {
    this.sfxVolume = clamp(volume, 0, 1)
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume
    }
  }

  /**
   * Set voice volume (0-1)
   */
  setVoiceVolume(volume: number): void {
    this.voiceVolume = clamp(volume, 0, 1)
    if (this.voiceGain) {
      this.voiceGain.gain.value = this.voiceVolume
    }
  }

  /**
   * Set ambient volume (0-1)
   */
  setAmbientVolume(volume: number): void {
    this.ambientVolume = clamp(volume, 0, 1)
    if (this.ambientGain) {
      this.ambientGain.gain.value = this.ambientVolume
    }
  }

  /**
   * Set UI volume (0-1)
   */
  setUiVolume(volume: number): void {
    this.uiVolume = clamp(volume, 0, 1)
    if (this.uiGain) {
      this.uiGain.gain.value = this.uiVolume
    }
  }

  /**
   * Enable or disable audio
   */
  setEnabled(enabled: boolean): void {
    this.audioEnabled = enabled
    if (this.masterGain) {
      this.masterGain.gain.value = enabled ? this.masterVolume : 0
    }
  }

  /**
   * Play a sound effect by name (procedurally generated)
   */
  playSound(
    name: string,
    category: AudioCategory = AudioCategory.SFX,
    position?: { x: number; y: number; z: number },
    volume: number = 1,
  ): void {
    if (!this.audioEnabled || !this.context || !this.initialized) return

    // Generate sound procedurally based on name
    const buffer = this.generateSoundBuffer(name)
    if (!buffer) return

    const source = this.context.createBufferSource()
    source.buffer = buffer

    const gainNode = this.context.createGain()
    gainNode.gain.value = volume

    // Connect to appropriate gain based on category
    let targetGain: GainNode | null = null
    switch (category) {
      case AudioCategory.MUSIC:
        targetGain = this.musicGain
        break
      case AudioCategory.SFX:
        targetGain = this.sfxGain
        break
      case AudioCategory.VOICE:
        targetGain = this.voiceGain
        break
      case AudioCategory.AMBIENT:
        targetGain = this.ambientGain
        break
      case AudioCategory.UI:
        targetGain = this.uiGain
        break
    }

    if (!targetGain) return

    // If position is provided, use spatial audio
    if (position) {
      const panner = this.context.createPanner()
      panner.panningModel = 'HRTF'
      panner.distanceModel = 'inverse'
      panner.refDistance = 1
      panner.maxDistance = 50
      panner.rolloffFactor = 1
      panner.positionX.value = position.x - this.listenerPosition.x
      panner.positionY.value = position.y - this.listenerPosition.y
      panner.positionZ.value = position.z - this.listenerPosition.z

      source.connect(gainNode)
      gainNode.connect(panner)
      panner.connect(targetGain)
    } else {
      source.connect(gainNode)
      gainNode.connect(targetGain)
    }

    source.start()

    // Track the source
    const id = `${name}_${Date.now()}_${Math.random()}`
    this.activeSources.set(id, source)
    this.activeGainNodes.set(id, gainNode)

    // Clean up when finished
    source.onended = () => {
      this.activeSources.delete(id)
      this.activeGainNodes.delete(id)
    }
  }

  /**
   * Generate a procedural sound buffer based on sound name
   */
  private generateSoundBuffer(name: string): AudioBuffer | null {
    if (!this.context) return null

    const sampleRate = this.context.sampleRate
    let duration: number = 0.3
    let frequency: number = 440
    let waveType: OscillatorType = 'sine'
    let envelope: { attack: number; decay: number; sustain: number; release: number } = {
      attack: 0.01,
      decay: 0.05,
      sustain: 0.7,
      release: 0.1,
    }

    // Sound definitions
    switch (name) {
      case 'hit':
      case 'slash':
        duration = 0.15
        frequency = 200
        waveType = 'sawtooth'
        envelope = { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.08 }
        break

      case 'explosion':
        duration = 0.6
        frequency = 80
        waveType = 'sawtooth'
        envelope = { attack: 0.001, decay: 0.2, sustain: 0.5, release: 0.3 }
        break

      case 'jump':
        duration = 0.2
        frequency = 400
        waveType = 'sine'
        envelope = { attack: 0.01, decay: 0.05, sustain: 0.6, release: 0.1 }
        break

      case 'land':
        duration = 0.15
        frequency = 150
        waveType = 'square'
        envelope = { attack: 0.001, decay: 0.05, sustain: 0.4, release: 0.08 }
        break

      case 'dash':
        duration = 0.25
        frequency = 600
        waveType = 'sine'
        envelope = { attack: 0.01, decay: 0.05, sustain: 0.7, release: 0.15 }
        break

      case 'magic':
      case 'cast':
        duration = 0.5
        frequency = 800
        waveType = 'sine'
        envelope = { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.3 }
        break

      case 'pickup':
      case 'collect':
        duration = 0.2
        frequency = 800
        waveType = 'sine'
        envelope = { attack: 0.001, decay: 0.05, sustain: 0.8, release: 0.1 }
        break

      case 'levelup':
        duration = 0.8
        frequency = 600
        waveType = 'sine'
        envelope = { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.5 }
        break

      case 'damage':
        duration = 0.25
        frequency = 250
        waveType = 'sawtooth'
        envelope = { attack: 0.001, decay: 0.05, sustain: 0.5, release: 0.15 }
        break

      case 'death':
        duration = 1.0
        frequency = 200
        waveType = 'sawtooth'
        envelope = { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.6 }
        break

      case 'ui_click':
        duration = 0.05
        frequency = 1000
        waveType = 'square'
        envelope = { attack: 0.001, decay: 0.01, sustain: 0.8, release: 0.03 }
        break

      case 'ui_hover':
        duration = 0.03
        frequency = 1500
        waveType = 'sine'
        envelope = { attack: 0.001, decay: 0.005, sustain: 0.6, release: 0.02 }
        break

      case 'boss_roar':
        duration = 1.5
        frequency = 100
        waveType = 'sawtooth'
        envelope = { attack: 0.1, decay: 0.3, sustain: 0.7, release: 1.0 }
        break

      case 'arrow_shoot':
        duration = 0.2
        frequency = 1200
        waveType = 'sine'
        envelope = { attack: 0.001, decay: 0.05, sustain: 0.3, release: 0.12 }
        break

      case 'fireball':
        duration = 0.5
        frequency = 300
        waveType = 'sawtooth'
        envelope = { attack: 0.05, decay: 0.15, sustain: 0.6, release: 0.25 }
        break

      case 'heal':
        duration = 0.6
        frequency = 700
        waveType = 'sine'
        envelope = { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.4 }
        break

      case 'coin':
        duration = 0.15
        frequency = 1200
        waveType = 'sine'
        envelope = { attack: 0.001, decay: 0.03, sustain: 0.8, release: 0.1 }
        break

      case 'quest':
        duration = 0.5
        frequency = 800
        waveType = 'triangle'
        envelope = { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.3 }
        break

      case 'achievement':
        duration = 0.7
        frequency = 900
        waveType = 'triangle'
        envelope = { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.5 }
        break

      default:
        // Generic sound
        duration = 0.2
        frequency = 500
        waveType = 'sine'
    }

    const buffer = this.context.createBuffer(1, Math.floor(sampleRate * duration), sampleRate)
    const data = buffer.getChannelData(0)

    // Generate the sound wave
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate
      const progress = t / duration

      // ADSR envelope
      let envelopeValue = 1
      const attackEnd = envelope.attack
      const decayEnd = attackEnd + envelope.decay
      const sustainEnd = duration - envelope.release

      if (t < attackEnd) {
        envelopeValue = t / attackEnd
      } else if (t < decayEnd) {
        envelopeValue = 1 - (1 - envelope.sustain) * ((t - attackEnd) / envelope.decay)
      } else if (t < sustainEnd) {
        envelopeValue = envelope.sustain
      } else {
        envelopeValue = envelope.sustain * (1 - (t - sustainEnd) / envelope.release)
      }

      // Generate wave based on type
      let sample = 0
      const freq = frequency * (1 + progress * 0.2) // Slight pitch sweep

      switch (waveType) {
        case 'sine':
          sample = Math.sin(2 * Math.PI * freq * t)
          break
        case 'square':
          sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1
          break
        case 'sawtooth':
          sample = 2 * ((freq * t) % 1) - 1
          break
        case 'triangle':
          sample = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1
          break
      }

      // Add some noise for explosion/death sounds
      if (name === 'explosion' || name === 'death' || name === 'damage' || name === 'land') {
        sample = sample * 0.7 + (Math.random() - 0.5) * 0.6
      }

      // Add harmonics for richer sound
      if (name === 'magic' || name === 'heal' || name === 'levelup' || name === 'achievement') {
        sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.3
        sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.15
      }

      data[i] = sample * envelopeValue * 0.5 // Overall volume reduction
    }

    return buffer
  }

  /**
   * Play background music
   */
  playMusic(trackName: string): void {
    if (!this.audioEnabled || !this.context || !this.initialized) return
    if (this.currentMusicTrack === trackName) return

    this.stopMusic()

    // Generate procedural music
    const buffer = this.generateMusicBuffer(trackName)
    if (!buffer) return

    this.musicSource = this.context.createBufferSource()
    this.musicSource.buffer = buffer
    this.musicSource.loop = true
    this.musicSource.connect(this.musicGain!)
    this.musicSource.start()

    this.currentMusicTrack = trackName
  }

  /**
   * Generate procedural music buffer
   */
  private generateMusicBuffer(trackName: string): AudioBuffer | null {
    if (!this.context) return null

    const sampleRate = this.context.sampleRate
    const duration = 8 // 8 second loop
    const buffer = this.context.createBuffer(2, Math.floor(sampleRate * duration), sampleRate)

    // Define music parameters based on track name
    let baseFreq = 220
    let scale: number[] = [0, 2, 4, 5, 7, 9, 11] // Major scale
    let tempo = 120 // BPM

    switch (trackName) {
      case 'forest_theme':
        baseFreq = 220
        scale = [0, 2, 4, 5, 7, 9, 11]
        tempo = 100
        break
      case 'desert_theme':
        baseFreq = 196
        scale = [0, 2, 3, 5, 7, 8, 11] // Harmonic minor
        tempo = 90
        break
      case 'snow_theme':
        baseFreq = 174
        scale = [0, 2, 3, 5, 7, 8, 10] // Natural minor
        tempo = 80
        break
      case 'volcanic_theme':
        baseFreq = 130
        scale = [0, 1, 3, 5, 6, 8, 10] // Phrygian
        tempo = 110
        break
      case 'crystal_theme':
        baseFreq = 261
        scale = [0, 2, 4, 6, 7, 9, 11] // Lydian
        tempo = 120
        break
      case 'void_theme':
        baseFreq = 110
        scale = [0, 1, 3, 5, 6, 8, 9] // Double harmonic
        tempo = 70
        break
      case 'ocean_theme':
        baseFreq = 196
        scale = [0, 2, 3, 5, 7, 9, 11] // Melodic minor ascending
        tempo = 85
        break
      case 'sky_theme':
        baseFreq = 233
        scale = [0, 2, 4, 5, 7, 9, 11] // Major
        tempo = 130
        break
      case 'boss_theme':
        baseFreq = 146
        scale = [0, 1, 3, 5, 6, 8, 10] // Phrygian dominant
        tempo = 140
        break
      case 'menu_theme':
        baseFreq = 220
        scale = [0, 2, 4, 5, 7, 9, 11]
        tempo = 90
        break
      default:
        baseFreq = 220
        scale = [0, 2, 4, 5, 7, 9, 11]
        tempo = 100
    }

    const beatDuration = 60 / tempo // Duration of one beat
    const totalBeats = Math.floor(duration / beatDuration)

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)

      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate
        const beat = Math.floor(t / beatDuration)
        const beatProgress = (t / beatDuration) % 1

        let sample = 0

        // Bass note (root of chord)
        const bassNote = scale[0] + (beat % 4 < 2 ? 0 : 5)
        const bassFreq = baseFreq * Math.pow(2, bassNote / 12) * 0.5
        sample += Math.sin(2 * Math.PI * bassFreq * t) * 0.3 * Math.exp(-beatProgress * 3)

        // Melody note
        const melodyNoteIndex = (beat * 3) % scale.length
        const melodyNote = scale[melodyNoteIndex]
        const melodyFreq = baseFreq * Math.pow(2, melodyNote / 12)
        sample += Math.sin(2 * Math.PI * melodyFreq * t) * 0.2 * Math.exp(-beatProgress * 2)

        // Harmony
        if (channel === 0) {
          const harmonyNote = scale[(melodyNoteIndex + 2) % scale.length]
          const harmonyFreq = baseFreq * Math.pow(2, harmonyNote / 12)
          sample += Math.sin(2 * Math.PI * harmonyFreq * t) * 0.15
        }

        // Add some atmospheric pad
        const padFreq = baseFreq * 2
        sample += Math.sin(2 * Math.PI * padFreq * t) * 0.05

        // Boss theme - more intense
        if (trackName === 'boss_theme') {
          sample += (Math.random() - 0.5) * 0.1 // Add percussion-like noise
          const drumBeat = beat % 2 === 0
          if (drumBeat && beatProgress < 0.1) {
            sample += 0.3
          }
        }

        // Soft attack/release envelope per beat
        const envelope = Math.exp(-beatProgress * 1.5) * 0.8 + 0.2

        data[i] = sample * envelope * 0.4
      }
    }

    return buffer
  }

  /**
   * Stop the current music
   */
  stopMusic(): void {
    if (this.musicSource) {
      try {
        this.musicSource.stop()
      } catch (e) {
        // Already stopped
      }
      this.musicSource.disconnect()
      this.musicSource = null
      this.currentMusicTrack = null
    }
  }

  /**
   * Set the listener position (for spatial audio)
   */
  setListenerPosition(x: number, y: number, z: number): void {
    this.listenerPosition = { x, y, z }
    if (this.context && this.context.listener) {
      const listener = this.context.listener as any
      if (listener.positionX) {
        listener.positionX.value = x
        listener.positionY.value = y
        listener.positionZ.value = z
      } else if (listener.setPosition) {
        listener.setPosition(x, y, z)
      }
    }
  }

  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.stopMusic()
    this.activeSources.forEach((source) => {
      try {
        source.stop()
      } catch (e) {
        // Already stopped
      }
    })
    this.activeSources.clear()
    this.activeGainNodes.clear()
  }

  /**
   * Get the master volume
   */
  getMasterVolume(): number {
    return this.masterVolume
  }

  /**
   * Get music volume
   */
  getMusicVolume(): number {
    return this.musicVolume
  }

  /**
   * Get SFX volume
   */
  getSfxVolume(): number {
    return this.sfxVolume
  }

  /**
   * Check if audio is enabled
   */
  isEnabled(): boolean {
    return this.audioEnabled
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get current music track
   */
  getCurrentMusicTrack(): string | null {
    return this.currentMusicTrack
  }

  /**
   * Dispose of audio resources
   */
  dispose(): void {
    this.stopAll()
    if (this.context) {
      this.context.close()
      this.context = null
    }
    this.loadedTracks.clear()
    this.initialized = false
  }
}

// Global singleton
export const audioManager = new AudioManager()
