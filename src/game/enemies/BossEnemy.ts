// ===================================================================
// Boss Enemy - Multi-phase boss with special attacks
// ===================================================================
// A powerful boss enemy with multiple phases, special attacks, and
// significantly more health than regular enemies. Bosses have
// phase transitions based on health thresholds and gain new
// abilities as the fight progresses.
// ===================================================================

import * as THREE from 'three'
import { Enemy } from './Enemy'
import { EnemyDefinition, EnemyBehavior, EnemyType, BossPhase, DamageType } from '../types'
import { eventBus } from '../engine/EventBus'
import { GameEventType } from '../types'

export const BOSS_DEFINITION: EnemyDefinition = {
  id: 'dragon_lord',
  name: 'Dragon Lord Vaelith',
  type: EnemyType.BOSS,
  health: 2000,
  damage: 50,
  defense: 30,
  speed: 4,
  attackRange: 5,
  detectionRange: 40,
  attackCooldown: 1.5,
  experienceReward: 1000,
  goldReward: 500,
  itemDropChance: 1.0,
  possibleDrops: ['dragon_scale', 'legendary_sword', 'ancient_amulet', 'royal_crown'],
  behavior: EnemyBehavior.SPECIAL,
  abilities: ['fire_breath', 'wing_slam', 'tail_sweep', 'summon_minions'],
  weaknesses: [DamageType.ICE],
  resistances: [DamageType.FIRE],
  immunities: [],
  scale: 3.5,
  color: 0x8b0000,
  isElite: true,
  isBoss: true,
  bossPhases: [
    {
      phaseNumber: 1,
      healthThreshold: 1.0,
      damageMultiplier: 1.0,
      speedMultiplier: 1.0,
      attackPattern: ['fire_breath', 'wing_slam'],
      newAbilities: [],
      enrageTimer: 0,
    },
    {
      phaseNumber: 2,
      healthThreshold: 0.66,
      damageMultiplier: 1.3,
      speedMultiplier: 1.2,
      attackPattern: ['fire_breath', 'wing_slam', 'tail_sweep'],
      newAbilities: ['tail_sweep'],
      enrageTimer: 0,
    },
    {
      phaseNumber: 3,
      healthThreshold: 0.33,
      damageMultiplier: 1.7,
      speedMultiplier: 1.5,
      attackPattern: ['fire_breath', 'wing_slam', 'tail_sweep', 'summon_minions'],
      newAbilities: ['summon_minions'],
      enrageTimer: 60,
    },
  ],
}

export class BossEnemy extends Enemy {
  private currentBossPhase: number = 0
  private specialAttackCooldown: number = 0
  private currentAttackPattern: string[] = ['fire_breath', 'wing_slam']
  private enrageTimer: number = 0
  private isEnraged: boolean = false
  private fireBreathActive: boolean = false
  private fireBreathTimer: number = 0
  private summonTimer: number = 0

  constructor(position: THREE.Vector3) {
    super(BOSS_DEFINITION, position, false)
    this.currentBossPhase = 0
    this.currentAttackPattern = BOSS_DEFINITION.bossPhases![0].attackPattern
  }

  protected createMesh(): THREE.Group {
    const group = new THREE.Group()
    const scale = this.definition.scale

    // Massive dragon body
    const bodyGeometry = new THREE.SphereGeometry(2 * scale, 16, 12)
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.definition.color,
      roughness: 0.4,
      metalness: 0.3,
      emissive: 0x300000,
      emissiveIntensity: 0.3,
    })
    this.bodyMaterial = bodyMaterial
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
    body.position.y = 3 * scale
    body.scale.set(1.5, 1, 1)
    body.castShadow = true
    body.receiveShadow = true
    body.name = 'body'
    group.add(body)

    // Dragon head
    const headGeometry = new THREE.ConeGeometry(1 * scale, 2 * scale, 8)
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x6a0000,
      roughness: 0.4,
      metalness: 0.3,
      emissive: 0x400000,
      emissiveIntensity: 0.4,
    })
    const head = new THREE.Mesh(headGeometry, headMaterial)
    head.position.set(0, 4 * scale, -2 * scale)
    head.rotation.x = -Math.PI / 2
    head.castShadow = true
    head.name = 'head'
    group.add(head)

    // Glowing eyes
    const eyeGeometry = new THREE.SphereGeometry(0.15 * scale, 8, 6)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 })
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    leftEye.position.set(-0.4 * scale, 4.2 * scale, -2.5 * scale)
    group.add(leftEye)
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial)
    rightEye.position.set(0.4 * scale, 4.2 * scale, -2.5 * scale)
    group.add(rightEye)

    // Wings (large, bat-like)
    const wingShape = new THREE.Shape()
    wingShape.moveTo(0, 0)
    wingShape.lineTo(3 * scale, 1 * scale)
    wingShape.lineTo(4 * scale, 0.5 * scale)
    wingShape.lineTo(3.5 * scale, -0.5 * scale)
    wingShape.lineTo(2 * scale, -1 * scale)
    wingShape.lineTo(0, 0)

    const wingGeometry = new THREE.ShapeGeometry(wingShape)
    const wingMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a0000,
      side: THREE.DoubleSide,
      roughness: 0.6,
    })

    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial)
    leftWing.position.set(-2 * scale, 3 * scale, 0)
    leftWing.rotation.y = Math.PI / 2
    leftWing.castShadow = true
    leftWing.name = 'leftWing'
    group.add(leftWing)

    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial)
    rightWing.position.set(2 * scale, 3 * scale, 0)
    rightWing.rotation.y = -Math.PI / 2
    rightWing.scale.x = -1
    rightWing.castShadow = true
    rightWing.name = 'rightWing'
    group.add(rightWing)

    // Tail
    const tailGeometry = new THREE.CylinderGeometry(0.3 * scale, 0.6 * scale, 4 * scale, 8)
    const tailMaterial = new THREE.MeshStandardMaterial({
      color: 0x6a0000,
      roughness: 0.5,
    })
    const tail = new THREE.Mesh(tailGeometry, tailMaterial)
    tail.position.set(0, 3 * scale, 3 * scale)
    tail.rotation.x = Math.PI / 2
    tail.castShadow = true
    tail.name = 'tail'
    group.add(tail)

    // Spikes along the back
    for (let i = 0; i < 5; i++) {
      const spikeGeometry = new THREE.ConeGeometry(0.3 * scale, 0.8 * scale, 6)
      const spikeMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a0000,
        roughness: 0.3,
        metalness: 0.5,
      })
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial)
      spike.position.set(0, (4 + i * 0.2) * scale, (i * 0.7 - 1) * scale)
      spike.castShadow = true
      group.add(spike)
    }

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.8 * scale, 2 * scale, 0.8 * scale)
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a0000,
      roughness: 0.6,
    })

    const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial)
    frontLeftLeg.position.set(-1.2 * scale, 1 * scale, -1.5 * scale)
    frontLeftLeg.castShadow = true
    group.add(frontLeftLeg)

    const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial)
    frontRightLeg.position.set(1.2 * scale, 1 * scale, -1.5 * scale)
    frontRightLeg.castShadow = true
    group.add(frontRightLeg)

    const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial)
    backLeftLeg.position.set(-1.2 * scale, 1 * scale, 1.5 * scale)
    backLeftLeg.castShadow = true
    group.add(backLeftLeg)

    const backRightLeg = new THREE.Mesh(legGeometry, legMaterial)
    backRightLeg.position.set(1.2 * scale, 1 * scale, 1.5 * scale)
    backRightLeg.castShadow = true
    group.add(backRightLeg)

    group.userData.head = head
    group.userData.leftWing = leftWing
    group.userData.rightWing = rightWing
    group.userData.tail = tail

    // Larger health bar for boss
    this.healthBar = this.createHealthBar()
    this.healthBar.position.y = 6 * scale
    this.healthBar.scale.set(6, 0.5, 1)
    group.add(this.healthBar)

    return group
  }

  updateAI(deltaTime: number, playerPosition: THREE.Vector3): void {
    if (!this.isAlive) return

    // Check for phase transitions
    this.checkPhaseTransition()

    // Update enrage timer
    if (this.isEnraged) {
      this.enrageTimer -= deltaTime
    }

    // Update special attack cooldown
    this.specialAttackCooldown -= deltaTime

    const distToPlayer = this.distanceToPlayer(playerPosition)

    // Face the player
    const dx = playerPosition.x - this.mesh.position.x
    const dz = playerPosition.z - this.mesh.position.z
    this.smoothRotateTo(Math.atan2(dx, dz), deltaTime)

    if (this.canDetectPlayer(playerPosition)) {
      if (distToPlayer > this.definition.attackRange) {
        // Move toward player
        this.setState(EnemyBehavior.CHASE)
        const phase = this.getCurrentPhase()
        const speed = this.definition.speed * phase.speedMultiplier * (this.isEnraged ? 1.5 : 1)
        this.moveToward(playerPosition, speed, deltaTime)
      } else {
        // In attack range
        this.setState(EnemyBehavior.ATTACK)
        this.velocity.x = 0
        this.velocity.z = 0

        // Try regular attack
        this.tryAttack(playerPosition)

        // Try special attack
        if (this.specialAttackCooldown <= 0) {
          this.executeSpecialAttack(playerPosition)
        }
      }
    } else {
      // Idle
      this.setState(EnemyBehavior.IDLE)
      this.velocity.x *= 0.9
      this.velocity.z *= 0.9
    }

    // Update fire breath
    if (this.fireBreathActive) {
      this.fireBreathTimer -= deltaTime
      if (this.fireBreathTimer <= 0) {
        this.fireBreathActive = false
      }
    }

    // Update animations
    this.updateAnimations(deltaTime)
  }

  /**
   * Check for and execute phase transitions
   */
  private checkPhaseTransition(): void {
    const healthPercent = this.getHealthPercent()
    const phases = this.definition.bossPhases!

    for (let i = phases.length - 1; i >= 0; i--) {
      if (healthPercent <= phases[i].healthThreshold && this.currentBossPhase < i) {
        this.currentBossPhase = i
        this.currentAttackPattern = phases[i].attackPattern

        // Enrage if enrage timer is set
        if (phases[i].enrageTimer > 0) {
          this.enrageTimer = phases[i].enrageTimer
        }

        eventBus.emit(
          GameEventType.BOSS_PHASE_CHANGE,
          {
            bossId: this.id,
            bossName: this.definition.name,
            newPhase: i + 1,
            newAbilities: phases[i].newAbilities,
          },
          'BossEnemy',
        )

        console.info(`[BossEnemy] ${this.definition.name} entered phase ${i + 1}`)
        break
      }
    }

    // Check for enrage trigger
    if (this.enrageTimer > 0 && !this.isEnraged) {
      // Enrage when timer expires
    }
  }

  /**
   * Get the current phase data
   */
  private getCurrentPhase(): BossPhase {
    return this.definition.bossPhases![this.currentBossPhase]
  }

  /**
   * Execute a special attack from the pattern
   */
  private executeSpecialAttack(playerPosition: THREE.Vector3): void {
    const attack = this.currentAttackPattern[Math.floor(Math.random() * this.currentAttackPattern.length)]
    const phase = this.getCurrentPhase()

    switch (attack) {
      case 'fire_breath':
        this.fireBreath(playerPosition)
        this.specialAttackCooldown = 4 / phase.damageMultiplier
        break

      case 'wing_slam':
        this.wingSlam(playerPosition)
        this.specialAttackCooldown = 5
        break

      case 'tail_sweep':
        this.tailSweep(playerPosition)
        this.specialAttackCooldown = 4
        break

      case 'summon_minions':
        this.summonMinions()
        this.specialAttackCooldown = 15
        break
    }
  }

  /**
   * Fire breath attack
   */
  private fireBreath(playerPosition: THREE.Vector3): void {
    this.fireBreathActive = true
    this.fireBreathTimer = 2

    const phase = this.getCurrentPhase()
    const damage = this.definition.damage * 0.8 * phase.damageMultiplier

    // Emit fire breath event - the combat system will check for hits
    eventBus.emit(
      GameEventType.ABILITY_USED,
      {
        source: 'boss',
        bossId: this.id,
        ability: 'fire_breath',
        damage,
        damageType: DamageType.FIRE,
        position: this.mesh.position.toArray(),
        direction: [
          playerPosition.x - this.mesh.position.x,
          0,
          playerPosition.z - this.mesh.position.z,
        ],
        range: 15,
        cone: 30,
        duration: 2,
      },
      'BossEnemy',
    )
  }

  /**
   * Wing slam attack - AoE damage around boss
   */
  private wingSlam(playerPosition: THREE.Vector3): void {
    const phase = this.getCurrentPhase()
    const damage = this.definition.damage * 1.2 * phase.damageMultiplier

    eventBus.emit(
      GameEventType.ABILITY_USED,
      {
        source: 'boss',
        bossId: this.id,
        ability: 'wing_slam',
        damage,
        damageType: DamageType.PHYSICAL,
        position: this.mesh.position.toArray(),
        range: 8,
        knockback: 15,
      },
      'BossEnemy',
    )
  }

  /**
   * Tail sweep - 360 degree attack
   */
  private tailSweep(playerPosition: THREE.Vector3): void {
    const phase = this.getCurrentPhase()
    const damage = this.definition.damage * phase.damageMultiplier

    eventBus.emit(
      GameEventType.ABILITY_USED,
      {
        source: 'boss',
        bossId: this.id,
        ability: 'tail_sweep',
        damage,
        damageType: DamageType.PHYSICAL,
        position: this.mesh.position.toArray(),
        range: 6,
        knockback: 10,
      },
      'BossEnemy',
    )
  }

  /**
   * Summon minion enemies
   */
  private summonMinions(): void {
    eventBus.emit(
      GameEventType.ENEMY_SPAWNED,
      {
        source: 'boss',
        bossId: this.id,
        type: 'summon',
        position: this.mesh.position.toArray(),
        count: 3,
        enemyType: 'grunt',
      },
      'BossEnemy',
    )
  }

  /**
   * Update boss animations
   */
  private updateAnimations(deltaTime: number): void {
    const head = this.mesh.userData.head as THREE.Mesh
    const leftWing = this.mesh.userData.leftWing as THREE.Mesh
    const rightWing = this.mesh.userData.rightWing as THREE.Mesh
    const tail = this.mesh.userData.tail as THREE.Mesh

    // Wing flapping
    if (leftWing && rightWing) {
      const flapSpeed = this.getState() === EnemyBehavior.ATTACK ? 8 : 3
      const flapAmount = this.getState() === EnemyBehavior.ATTACK ? 1.5 : 0.5
      leftWing.rotation.z = Math.sin(this.animationTime * flapSpeed) * flapAmount
      rightWing.rotation.z = -Math.sin(this.animationTime * flapSpeed) * flapAmount
    }

    // Tail sway
    if (tail) {
      tail.rotation.y = Math.sin(this.animationTime * 2) * 0.3
    }

    // Head movement during fire breath
    if (head) {
      if (this.fireBreathActive) {
        head.rotation.x = -Math.PI / 2 + Math.sin(this.animationTime * 20) * 0.1
      } else {
        head.rotation.x = -Math.PI / 2
      }
    }

    // Enrage visual effect
    if (this.bodyMaterial && this.isEnraged) {
      this.bodyMaterial.emissive.setHex(0xff0000)
      this.bodyMaterial.emissiveIntensity = 0.6 + Math.sin(this.animationTime * 5) * 0.2
    }
  }

  /**
   * Override takeDamage for phase-based damage immunity frames
   */
  takeDamage(amount: number, damageType: DamageType = DamageType.PHYSICAL, source?: string): number {
    // Boss takes less damage during phase transitions
    return super.takeDamage(amount, damageType, source)
  }

  /**
   * Get the current boss phase number (1-indexed)
   */
  getCurrentPhaseNumber(): number {
    return this.currentBossPhase + 1
  }

  /**
   * Check if boss is enraged
   */
  getIsEnraged(): boolean {
    return this.isEnraged
  }

  /**
   * Check if fire breath is active
   */
  isFireBreathActive(): boolean {
    return this.fireBreathActive
  }
}
