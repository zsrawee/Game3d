// ===================================================================
// Environment Objects - Trees, rocks, and decorative elements
// ===================================================================
// Creates and manages the visual elements that populate the world:
// trees, rocks, crystals, plants, and biome-specific decorations.
// ===================================================================

import * as THREE from 'three'
import { BiomeType } from '../types'
import { BIOME_SETTINGS } from '../config/GameConfig'
import { SeededRandom } from '../utils/RandomUtils'

export class EnvironmentObjects {
  private scene: THREE.Scene
  private group: THREE.Group
  private biome: BiomeType
  private objects: THREE.Object3D[] = []
  private rng: SeededRandom

  // Cached geometries and materials
  private geometries: Map<string, THREE.BufferGeometry> = new Map()
  private materials: Map<string, THREE.Material> = new Map()

  constructor(scene: THREE.Scene, biome: BiomeType, seed: number = 0) {
    this.scene = scene
    this.biome = biome
    this.rng = new SeededRandom(seed)
    this.group = new THREE.Group()
    this.group.name = 'environment'
    this.scene.add(this.group)
  }

  /**
   * Generate environment objects for the biome
   */
  generate(count: number = 80): void {
    this.clear()

    const biomeSettings = BIOME_SETTINGS[this.biome]

    for (let i = 0; i < count; i++) {
      // Random position within world bounds
      const x = this.rng.range(-90, 90)
      const z = this.rng.range(-90, 90)

      // Skip spawn area
      if (Math.sqrt(x * x + z * z) < 8) {
        i--
        continue
      }

      // Pick object type based on biome
      const objectType = this.pickObjectType()
      const obj = this.createObject(objectType, x, z)

      if (obj) {
        obj.castShadow = true
        obj.receiveShadow = true
        this.objects.push(obj)
        this.group.add(obj)
      }
    }
  }

  /**
   * Pick an object type based on the current biome
   */
  private pickObjectType(): string {
    switch (this.biome) {
      case BiomeType.FOREST:
        return this.rng.weighted(
          ['tree', 'tree', 'tree', 'rock', 'bush', 'flower', 'log'],
          [3, 3, 3, 2, 2, 1, 1],
        )
      case BiomeType.DESERT:
        return this.rng.weighted(
          ['cactus', 'rock', 'rock', 'dead_tree', 'bone'],
          [3, 3, 2, 2, 1],
        )
      case BiomeType.SNOW:
        return this.rng.weighted(
          ['pine_tree', 'pine_tree', 'rock', 'ice_crystal', 'snowman'],
          [3, 3, 2, 1, 0.5],
        )
      case BiomeType.VOLCANIC:
        return this.rng.weighted(
          ['rock', 'rock', 'lava_rock', 'dead_tree', 'crystal'],
          [3, 3, 2, 2, 1],
        )
      case BiomeType.CRYSTAL:
        return this.rng.weighted(
          ['crystal', 'crystal', 'crystal', 'rock', 'glow_plant'],
          [3, 3, 3, 2, 1],
        )
      case BiomeType.VOID:
        return this.rng.weighted(
          ['void_crystal', 'dark_rock', 'dark_rock', 'tentacle'],
          [3, 3, 2, 1],
        )
      case BiomeType.OCEAN:
        return this.rng.weighted(
          ['coral', 'coral', 'seaweed', 'rock', 'shell'],
          [3, 3, 2, 2, 1],
        )
      case BiomeType.SKY:
        return this.rng.weighted(
          ['cloud', 'cloud', 'floating_rock', 'wind_plant'],
          [3, 3, 2, 1],
        )
      default:
        return 'tree'
    }
  }

  /**
   * Create an environment object
   */
  private createObject(type: string, x: number, z: number): THREE.Object3D | null {
    const biomeSettings = BIOME_SETTINGS[this.biome]
    const scale = this.rng.range(0.7, 1.3)
    const rotation = this.rng.range(0, Math.PI * 2)

    let obj: THREE.Object3D | null = null

    switch (type) {
      case 'tree':
        obj = this.createTree()
        break
      case 'pine_tree':
        obj = this.createPineTree()
        break
      case 'dead_tree':
        obj = this.createDeadTree()
        break
      case 'rock':
        obj = this.createRock(biomeSettings.obstacleColor)
        break
      case 'lava_rock':
        obj = this.createLavaRock()
        break
      case 'bush':
        obj = this.createBush()
        break
      case 'flower':
        obj = this.createFlower()
        break
      case 'log':
        obj = this.createLog()
        break
      case 'cactus':
        obj = this.createCactus()
        break
      case 'bone':
        obj = this.createBone()
        break
      case 'ice_crystal':
        obj = this.createIceCrystal()
        break
      case 'snowman':
        obj = this.createSnowman()
        break
      case 'crystal':
        obj = this.createCrystal()
        break
      case 'glow_plant':
        obj = this.createGlowPlant()
        break
      case 'void_crystal':
        obj = this.createVoidCrystal()
        break
      case 'dark_rock':
        obj = this.createRock(0x1a0a2a)
        break
      case 'tentacle':
        obj = this.createTentacle()
        break
      case 'coral':
        obj = this.createCoral()
        break
      case 'seaweed':
        obj = this.createSeaweed()
        break
      case 'shell':
        obj = this.createShell()
        break
      case 'cloud':
        obj = this.createCloud()
        break
      case 'floating_rock':
        obj = this.createFloatingRock()
        break
      case 'wind_plant':
        obj = this.createWindPlant()
        break
    }

    if (obj) {
      obj.position.set(x, 0, z)
      obj.rotation.y = rotation
      obj.scale.setScalar(scale)
    }

    return obj
  }

  /**
   * Create a tree
   */
  private createTree(): THREE.Group {
    const group = new THREE.Group()

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 8)
    const trunkMat = this.getMaterial('trunk', 0x4a3a2a, 0.9, 0.1)
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = 1.5
    trunk.castShadow = true
    group.add(trunk)

    // Foliage (multiple spheres)
    const foliageMat = this.getMaterial('foliage', 0x3a5f3a, 0.8, 0.1)
    for (let i = 0; i < 3; i++) {
      const radius = 1.2 - i * 0.3
      const foliageGeo = new THREE.SphereGeometry(radius, 8, 6)
      const foliage = new THREE.Mesh(foliageGeo, foliageMat)
      foliage.position.y = 3 + i * 0.8
      foliage.castShadow = true
      group.add(foliage)
    }

    return group
  }

  /**
   * Create a pine tree
   */
  private createPineTree(): THREE.Group {
    const group = new THREE.Group()

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2, 8)
    const trunkMat = this.getMaterial('pine_trunk', 0x4a3a2a, 0.9, 0.1)
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = 1
    trunk.castShadow = true
    group.add(trunk)

    // Cones (pine layers)
    const foliageMat = this.getMaterial('pine_foliage', 0x2a4a2a, 0.8, 0.1)
    for (let i = 0; i < 4; i++) {
      const radius = 1.5 - i * 0.3
      const height = 1.5
      const coneGeo = new THREE.ConeGeometry(radius, height, 8)
      const cone = new THREE.Mesh(coneGeo, foliageMat)
      cone.position.y = 2 + i * 0.8
      cone.castShadow = true
      group.add(cone)
    }

    // Snow on top
    const snowMat = this.getMaterial('snow', 0xffffff, 0.6, 0.1)
    const snowGeo = new THREE.SphereGeometry(0.3, 8, 6)
    const snow = new THREE.Mesh(snowGeo, snowMat)
    snow.position.y = 5.5
    group.add(snow)

    return group
  }

  /**
   * Create a dead tree
   */
  private createDeadTree(): THREE.Group {
    const group = new THREE.Group()

    // Twisted trunk
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.4, 4, 6)
    const trunkMat = this.getMaterial('dead_trunk', 0x3a2a1a, 0.95, 0.05)
    const trunk = new THREE.Mesh(trunkGeo, trunkMat)
    trunk.position.y = 2
    trunk.castShadow = true
    trunk.rotation.z = 0.1
    group.add(trunk)

    // Branches
    const branchMat = trunkMat
    for (let i = 0; i < 4; i++) {
      const branchGeo = new THREE.CylinderGeometry(0.05, 0.15, 1.5, 6)
      const branch = new THREE.Mesh(branchGeo, branchMat)
      branch.position.y = 2.5 + i * 0.5
      branch.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.7
      branch.rotation.y = i * Math.PI / 2
      branch.position.x = (i % 2 === 0 ? 0.5 : -0.5)
      group.add(branch)
    }

    return group
  }

  /**
   * Create a rock
   */
  private createRock(color: number): THREE.Mesh {
    const geo = new THREE.DodecahedronGeometry(this.rng.range(0.5, 1.5), 0)
    const mat = this.getMaterial(`rock_${color}`, color, 0.9, 0.1)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = this.rng.range(0.3, 0.8)
    mesh.rotation.set(
      this.rng.range(0, Math.PI),
      this.rng.range(0, Math.PI),
      this.rng.range(0, Math.PI),
    )
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  /**
   * Create a lava rock
   */
  private createLavaRock(): THREE.Group {
    const group = new THREE.Group()

    // Rock base
    const rockGeo = new THREE.DodecahedronGeometry(1, 0)
    const rockMat = this.getMaterial('lava_rock', 0x2a1a0a, 0.9, 0.1)
    const rock = new THREE.Mesh(rockGeo, rockMat)
    rock.position.y = 0.5
    rock.castShadow = true
    group.add(rock)

    // Glowing cracks
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xff4000 })
    for (let i = 0; i < 3; i++) {
      const crackGeo = new THREE.BoxGeometry(0.1, 0.05, 0.8)
      const crack = new THREE.Mesh(crackGeo, crackMat)
      crack.position.y = 0.5
      crack.rotation.y = i * Math.PI / 1.5
      crack.rotation.x = 0.3
      group.add(crack)
    }

    return group
  }

  /**
   * Create a bush
   */
  private createBush(): THREE.Group {
    const group = new THREE.Group()
    const bushMat = this.getMaterial('bush', 0x2a4a2a, 0.8, 0.1)

    for (let i = 0; i < 3; i++) {
      const bushGeo = new THREE.SphereGeometry(0.4, 8, 6)
      const bush = new THREE.Mesh(bushGeo, bushMat)
      bush.position.set(
        this.rng.range(-0.3, 0.3),
        0.3,
        this.rng.range(-0.3, 0.3),
      )
      bush.castShadow = true
      group.add(bush)
    }

    return group
  }

  /**
   * Create a flower
   */
  private createFlower(): THREE.Group {
    const group = new THREE.Group()

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4)
    const stemMat = this.getMaterial('stem', 0x2a6a2a, 0.8, 0.1)
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = 0.25
    group.add(stem)

    // Flower head
    const flowerColors = [0xff4040, 0xffee40, 0xff80ff, 0xffffff, 0xff8040]
    const color = flowerColors[Math.floor(this.rng.next() * flowerColors.length)]
    const flowerGeo = new THREE.SphereGeometry(0.15, 8, 6)
    const flowerMat = this.getMaterial(`flower_${color}`, color, 0.5, 0.1)
    const flower = new THREE.Mesh(flowerGeo, flowerMat)
    flower.position.y = 0.55
    group.add(flower)

    return group
  }

  /**
   * Create a log
   */
  private createLog(): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(0.3, 0.3, 2, 8)
    const mat = this.getMaterial('log', 0x4a3a2a, 0.9, 0.1)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.z = Math.PI / 2
    mesh.position.y = 0.3
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  /**
   * Create a cactus
   */
  private createCactus(): THREE.Group {
    const group = new THREE.Group()
    const cactusMat = this.getMaterial('cactus', 0x3a6a3a, 0.7, 0.1)

    // Main body
    const bodyGeo = new THREE.CylinderGeometry(0.4, 0.5, 3, 8)
    const body = new THREE.Mesh(bodyGeo, cactusMat)
    body.position.y = 1.5
    body.castShadow = true
    group.add(body)

    // Arms (random)
    if (this.rng.chance(0.6)) {
      const armGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.2, 8)
      const arm = new THREE.Mesh(armGeo, cactusMat)
      arm.position.set(0.5, 1.8, 0)
      arm.rotation.z = -Math.PI / 4
      arm.castShadow = true
      group.add(arm)
    }

    if (this.rng.chance(0.4)) {
      const armGeo = new THREE.CylinderGeometry(0.25, 0.3, 1, 8)
      const arm = new THREE.Mesh(armGeo, cactusMat)
      arm.position.set(-0.4, 1.5, 0)
      arm.rotation.z = Math.PI / 4
      arm.castShadow = true
      group.add(arm)
    }

    return group
  }

  /**
   * Create a bone
   */
  private createBone(): THREE.Group {
    const group = new THREE.Group()
    const boneMat = this.getMaterial('bone', 0xeeeeee, 0.6, 0.2)

    // Main bone
    const boneGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 6)
    const bone = new THREE.Mesh(boneGeo, boneMat)
    bone.rotation.z = Math.PI / 2
    bone.position.y = 0.2
    group.add(bone)

    // End caps
    for (const x of [-0.75, 0.75]) {
      const capGeo = new THREE.SphereGeometry(0.2, 6, 4)
      const cap = new THREE.Mesh(capGeo, boneMat)
      cap.position.set(x, 0.2, 0)
      group.add(cap)
    }

    return group
  }

  /**
   * Create an ice crystal
   */
  private createIceCrystal(): THREE.Group {
    const group = new THREE.Group()
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x80c0ff,
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.8,
      emissive: 0x4080ff,
      emissiveIntensity: 0.3,
    })

    // Main crystal
    const crystalGeo = new THREE.OctahedronGeometry(0.6, 0)
    const crystal = new THREE.Mesh(crystalGeo, crystalMat)
    crystal.position.y = 0.8
    crystal.scale.y = 1.5
    crystal.castShadow = true
    group.add(crystal)

    // Smaller crystals
    for (let i = 0; i < 3; i++) {
      const smallGeo = new THREE.OctahedronGeometry(0.3, 0)
      const small = new THREE.Mesh(smallGeo, crystalMat)
      small.position.set(
        this.rng.range(-0.5, 0.5),
        this.rng.range(0.3, 0.7),
        this.rng.range(-0.5, 0.5),
      )
      small.castShadow = true
      group.add(small)
    }

    return group
  }

  /**
   * Create a snowman
   */
  private createSnowman(): THREE.Group {
    const group = new THREE.Group()
    const snowMat = this.getMaterial('snow', 0xffffff, 0.6, 0.1)

    // Three snowballs
    const sizes = [0.6, 0.4, 0.3]
    let y = 0
    for (const size of sizes) {
      const snowball = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), snowMat)
      snowball.position.y = y + size
      y += size * 2
      snowball.castShadow = true
      group.add(snowball)
    }

    // Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 })
    for (const x of [-0.1, 0.1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), eyeMat)
      eye.position.set(x, 1.85, 0.25)
      group.add(eye)
    }

    // Carrot nose
    const noseMat = this.getMaterial('carrot', 0xff8040, 0.5, 0.2)
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), noseMat)
    nose.position.set(0, 1.78, 0.3)
    nose.rotation.x = Math.PI / 2
    group.add(nose)

    return group
  }

  /**
   * Create a crystal
   */
  private createCrystal(): THREE.Group {
    const group = new THREE.Group()
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x80a0ff,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.85,
      emissive: 0x4060ff,
      emissiveIntensity: 0.5,
    })

    // Large central crystal
    const mainGeo = new THREE.ConeGeometry(0.4, 1.8, 6)
    const main = new THREE.Mesh(mainGeo, crystalMat)
    main.position.y = 0.9
    main.castShadow = true
    group.add(main)

    // Surrounding smaller crystals
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2
      const smallGeo = new THREE.ConeGeometry(0.2, 0.8, 6)
      const small = new THREE.Mesh(smallGeo, crystalMat)
      small.position.set(
        Math.cos(angle) * 0.5,
        0.4,
        Math.sin(angle) * 0.5,
      )
      small.castShadow = true
      group.add(small)
    }

    // Point light
    const light = new THREE.PointLight(0x4060ff, 1, 5)
    light.position.y = 1
    group.add(light)

    return group
  }

  /**
   * Create a glow plant
   */
  private createGlowPlant(): THREE.Group {
    const group = new THREE.Group()

    const plantMat = new THREE.MeshStandardMaterial({
      color: 0x80ff80,
      emissive: 0x40ff40,
      emissiveIntensity: 0.5,
      roughness: 0.5,
    })

    // Bulb
    const bulbGeo = new THREE.SphereGeometry(0.2, 8, 6)
    const bulb = new THREE.Mesh(bulbGeo, plantMat)
    bulb.position.y = 0.4
    group.add(bulb)

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.05, 0.4, 4)
    const stemMat = this.getMaterial('plant_stem', 0x408040, 0.7, 0.1)
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = 0.2
    group.add(stem)

    // Light
    const light = new THREE.PointLight(0x80ff80, 0.5, 3)
    light.position.y = 0.5
    group.add(light)

    return group
  }

  /**
   * Create a void crystal
   */
  private createVoidCrystal(): THREE.Group {
    const group = new THREE.Group()
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0xa040ff,
      roughness: 0.2,
      metalness: 0.4,
      transparent: true,
      opacity: 0.7,
      emissive: 0x8000ff,
      emissiveIntensity: 0.6,
    })

    for (let i = 0; i < 3; i++) {
      const geo = new THREE.OctahedronGeometry(0.4 + i * 0.1, 0)
      const crystal = new THREE.Mesh(geo, crystalMat)
      crystal.position.y = 0.5 + i * 0.3
      crystal.rotation.y = i * 0.5
      crystal.scale.y = 1.5
      crystal.castShadow = true
      group.add(crystal)
    }

    const light = new THREE.PointLight(0xa040ff, 1, 5)
    light.position.y = 1
    group.add(light)

    return group
  }

  /**
   * Create a tentacle (void biome)
   */
  private createTentacle(): THREE.Group {
    const group = new THREE.Group()
    const tentacleMat = this.getMaterial('tentacle', 0x2a0a4a, 0.6, 0.3)

    // Curved tentacle using segments
    const segments = 5
    for (let i = 0; i < segments; i++) {
      const segGeo = new THREE.SphereGeometry(0.3 - i * 0.04, 8, 6)
      const seg = new THREE.Mesh(segGeo, tentacleMat)
      seg.position.y = i * 0.4
      seg.position.x = Math.sin(i * 0.5) * 0.2
      seg.castShadow = true
      group.add(seg)
    }

    return group
  }

  /**
   * Create coral
   */
  private createCoral(): THREE.Group {
    const group = new THREE.Group()
    const colors = [0xff6080, 0xffaa40, 0xff60ff, 0xff8060]
    const color = colors[Math.floor(this.rng.next() * colors.length)]
    const coralMat = this.getMaterial(`coral_${color}`, color, 0.5, 0.2)

    // Branching structure
    for (let i = 0; i < 5; i++) {
      const branchGeo = new THREE.CylinderGeometry(0.05, 0.15, 1 + this.rng.next() * 0.5, 6)
      const branch = new THREE.Mesh(branchGeo, coralMat)
      branch.position.y = 0.5
      branch.rotation.set(
        this.rng.range(-0.5, 0.5),
        (i / 5) * Math.PI * 2,
        this.rng.range(-0.5, 0.5),
      )
      branch.castShadow = true
      group.add(branch)
    }

    return group
  }

  /**
   * Create seaweed
   */
  private createSeaweed(): THREE.Group {
    const group = new THREE.Group()
    const seaweedMat = this.getMaterial('seaweed', 0x3a6a3a, 0.7, 0.2)

    for (let i = 0; i < 4; i++) {
      const geo = new THREE.CylinderGeometry(0.05, 0.1, 2 + this.rng.next(), 6)
      const seaweed = new THREE.Mesh(geo, seaweedMat)
      seaweed.position.set(
        this.rng.range(-0.3, 0.3),
        1,
        this.rng.range(-0.3, 0.3),
      )
      seaweed.rotation.z = this.rng.range(-0.3, 0.3)
      group.add(seaweed)
    }

    return group
  }

  /**
   * Create a shell
   */
  private createShell(): THREE.Mesh {
    const geo = new THREE.ConeGeometry(0.3, 0.4, 8)
    const mat = this.getMaterial('shell', 0xffe0c0, 0.4, 0.3)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = 0.2
    mesh.rotation.x = Math.PI
    return mesh
  }

  /**
   * Create a cloud
   */
  private createCloud(): THREE.Group {
    const group = new THREE.Group()
    const cloudMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    })

    for (let i = 0; i < 5; i++) {
      const geo = new THREE.SphereGeometry(this.rng.range(0.5, 1.2), 8, 6)
      const cloud = new THREE.Mesh(geo, cloudMat)
      cloud.position.set(
        this.rng.range(-1, 1),
        this.rng.range(-0.3, 0.3),
        this.rng.range(-1, 1),
      )
      group.add(cloud)
    }

    // Position higher up
    group.position.y = this.rng.range(2, 6)

    return group
  }

  /**
   * Create a floating rock (sky biome)
   */
  private createFloatingRock(): THREE.Mesh {
    const geo = new THREE.DodecahedronGeometry(this.rng.range(0.5, 1.5), 0)
    const mat = this.getMaterial('floating_rock', 0x8090a0, 0.7, 0.2)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.y = this.rng.range(2, 5)
    mesh.castShadow = true
    return mesh
  }

  /**
   * Create a wind plant
   */
  private createWindPlant(): THREE.Group {
    const group = new THREE.Group()
    const stemMat = this.getMaterial('wind_stem', 0xa0e0a0, 0.5, 0.2)

    // Stem
    const stemGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.8, 6)
    const stem = new THREE.Mesh(stemGeo, stemMat)
    stem.position.y = 0.4
    group.add(stem)

    // Leaves
    for (let i = 0; i < 4; i++) {
      const leafGeo = new THREE.PlaneGeometry(0.3, 0.4)
      const leaf = new THREE.Mesh(leafGeo, stemMat)
      leaf.position.y = 0.8
      leaf.rotation.y = (i / 4) * Math.PI * 2
      leaf.rotation.x = -0.3
      group.add(leaf)
    }

    return group
  }

  /**
   * Get or create a cached material
   */
  private getMaterial(name: string, color: number, roughness: number, metalness: number): THREE.Material {
    if (!this.materials.has(name)) {
      this.materials.set(
        name,
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
      )
    }
    return this.materials.get(name)!
  }

  /**
   * Get all environment objects (for collision)
   */
  getObjects(): THREE.Object3D[] {
    return [...this.objects]
  }

  /**
   * Clear all environment objects
   */
  clear(): void {
    this.objects.forEach((obj) => {
      this.group.remove(obj)
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry?.dispose()
        }
      })
    })
    this.objects = []
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clear()
    this.materials.forEach((mat) => mat.dispose())
    this.materials.clear()
    this.geometries.forEach((geo) => geo.dispose())
    this.geometries.clear()
    this.scene.remove(this.group)
  }

  /**
   * Get the environment group
   */
  getGroup(): THREE.Group {
    return this.group
  }
}
