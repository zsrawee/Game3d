// ===================================================================
// Random Utilities - Seeded RNG and probability helpers
// ===================================================================
// Provides deterministic random number generation for world generation
// and gameplay, plus weighted selection utilities.
// ===================================================================

/** Mulberry32 - a fast, deterministic seeded PRNG */
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Get the next random float in [0, 1) */
  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** Random float in [min, max) */
  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** Random integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1))
  }

  /** Random sign: -1 or 1 */
  sign(): number {
    return this.next() < 0.5 ? -1 : 1
  }

  /** Random boolean with given probability (0-1) */
  chance(probability: number): boolean {
    return this.next() < probability
  }

  /** Pick a random element from an array */
  item<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)]
  }

  /** Pick multiple unique random elements from an array */
  sample<T>(arr: T[], count: number): T[] {
    const pool = [...arr]
    const result: T[] = []
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(this.next() * pool.length)
      result.push(pool.splice(idx, 1)[0])
    }
    return result
  }

  /** Shuffle an array in place using Fisher-Yates */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  /** Get a random point within a circle of given radius */
  pointInCircle(radius: number): { x: number; y: number } {
    const angle = this.next() * Math.PI * 2
    const r = Math.sqrt(this.next()) * radius
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
  }

  /** Get a random point on a circle's edge of given radius */
  pointOnCircle(radius: number): { x: number; y: number } {
    const angle = this.next() * Math.PI * 2
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  }

  /** Gaussian distribution (Box-Muller transform) */
  gaussian(mean: number = 0, stdDev: number = 1): number {
    const u1 = Math.max(this.next(), 1e-10)
    const u2 = this.next()
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return z0 * stdDev + mean
  }

  /** Weighted random selection */
  weighted<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    let r = this.next() * totalWeight
    for (let i = 0; i < items.length; i++) {
      r -= weights[i]
      if (r <= 0) return items[i]
    }
    return items[items.length - 1]
  }

  /** Get the current seed state for serialization */
  getState(): number {
    return this.state
  }

  /** Set the seed state */
  setState(state: number): void {
    this.state = state >>> 0
  }
}

// -------------------------------------------------------------------
// Static convenience methods using Math.random()
// -------------------------------------------------------------------

/** Pick a weighted random item using Math.random() */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  if (totalWeight <= 0) return items[0]
  let r = Math.random() * totalWeight
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

/** Pick N unique items from a weighted list */
export function weightedSample<T>(items: T[], weights: number[], count: number): T[] {
  const result: T[] = []
  const poolItems = [...items]
  const poolWeights = [...weights]

  for (let i = 0; i < count && poolItems.length > 0; i++) {
    const picked = weightedRandom(poolItems, poolWeights)
    const idx = poolItems.indexOf(picked)
    poolItems.splice(idx, 1)
    poolWeights.splice(idx, 1)
    result.push(picked)
  }
  return result
}

/** Generate a random UUID-like string (not RFC compliant but good enough for game IDs) */
export function uuid(): string {
  const chars = '0123456789abcdef'
  let result = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      result += '-'
    } else if (i === 14) {
      result += '4'
    } else if (i === 19) {
      result += chars[(Math.random() * 4) | 0 | 8]
    } else {
      result += chars[Math.floor(Math.random() * 16)]
    }
  }
  return result
}

/** Get a random integer in [min, max] inclusive */
export function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

/** Get a random float in [min, max) */
export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Random boolean with probability (default 50%) */
export function randChance(probability: number = 0.5): boolean {
  return Math.random() < probability
}

/** Random sign: -1 or 1 */
export function randSign(): number {
  return Math.random() < 0.5 ? -1 : 1
}

/** Pick a random item from an array */
export function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/** Pick multiple unique random items from an array */
export function randSample<T>(arr: T[], count: number): T[] {
  const pool = [...arr]
  const result: T[] = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(idx, 1)[0])
  }
  return result
}

/** Shuffle an array using Fisher-Yates */
export function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Get a random point within a sphere */
export function pointInSphere(radius: number, center: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  const r = Math.cbrt(Math.random()) * radius
  return {
    x: center.x + r * Math.sin(phi) * Math.cos(theta),
    y: center.y + r * Math.sin(phi) * Math.sin(theta),
    z: center.z + r * Math.cos(phi),
  }
}

/** Get a random point on a sphere's surface */
export function pointOnSphere(radius: number, center: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }) {
  const theta = Math.random() * Math.PI * 2
  const phi = Math.acos(2 * Math.random() - 1)
  return {
    x: center.x + radius * Math.sin(phi) * Math.cos(theta),
    y: center.y + radius * Math.sin(phi) * Math.sin(theta),
    z: center.z + radius * Math.cos(phi),
  }
}

/** Get a random point within a box */
export function pointInBox(min: { x: number; y: number; z: number }, max: { x: number; y: number; z: number }) {
  return {
    x: min.x + Math.random() * (max.x - min.x),
    y: min.y + Math.random() * (max.y - min.y),
    z: min.z + Math.random() * (max.z - min.z),
  }
}

/** Generate a random string of given length from a charset */
export function randomString(length: number, charset: string = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)]
  }
  return result
}

/** Generate a random seed from current time */
export function generateSeed(): number {
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0
}

/** Gaussian random using Box-Muller transform */
export function gaussianRandom(mean: number = 0, stdDev: number = 1): number {
  const u1 = Math.max(Math.random(), 1e-10)
  const u2 = Math.random()
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return z0 * stdDev + mean
}

/** Dice roll: roll N dice with S sides, return sum */
export function diceRoll(count: number, sides: number, modifier: number = 0): number {
  let total = modifier
  for (let i = 0; i < count; i++) {
    total += Math.floor(Math.random() * sides) + 1
  }
  return total
}

/** Roll dice with advantage (roll twice, keep higher) */
export function rollWithAdvantage(sides: number): number {
  return Math.max(Math.floor(Math.random() * sides) + 1, Math.floor(Math.random() * sides) + 1)
}

/** Roll dice with disadvantage (roll twice, keep lower) */
export function rollWithDisadvantage(sides: number): number {
  return Math.min(Math.floor(Math.random() * sides) + 1, Math.floor(Math.random() * sides) + 1)
}

/** Random element from a weighted map */
export function weightedRandomFromMap<T>(map: Map<T, number>): T {
  const items: T[] = []
  const weights: number[] = []
  map.forEach((weight, item) => {
    items.push(item)
    weights.push(weight)
  })
  return weightedRandom(items, weights)
}

/** Generate a random color as a hex number */
export function randomColor(): number {
  return (Math.random() * 0xffffff) | 0
}

/** Generate a random pastel color */
export function randomPastelColor(): number {
  const h = Math.random() * 360
  const s = 0.5 + Math.random() * 0.3
  const l = 0.7 + Math.random() * 0.2
  return hslToHexInternal(h, s, l)
}

/** Generate a random vibrant color */
export function randomVibrantColor(): number {
  const h = Math.random() * 360
  const s = 0.85 + Math.random() * 0.15
  const l = 0.45 + Math.random() * 0.15
  return hslToHexInternal(h, s, l)
}

function hslToHexInternal(h: number, s: number, l: number): number {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return ((Math.round((r + m) * 255) << 16) |
    (Math.round((g + m) * 255) << 8) |
    Math.round((b + m) * 255))
}

/** Random value from a normal distribution clamped to range */
export function clampedGaussian(mean: number, stdDev: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, gaussianRandom(mean, stdDev)))
}

/** Get a perlin-noise-like 1D value (simple smoothed noise) */
export function noise1D(x: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + seed * 78.233) * 43758.5453
  return n - Math.floor(n)
}

/** 2D noise based on sine hash (cheap pseudo-noise) */
export function noise2D(x: number, y: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453
  return n - Math.floor(n)
}

/** Smoothed 2D noise using bilinear interpolation of noise2D */
export function smoothNoise2D(x: number, y: number, seed: number = 0): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const v00 = noise2D(x0, y0, seed)
  const v10 = noise2D(x0 + 1, y0, seed)
  const v01 = noise2D(x0, y0 + 1, seed)
  const v11 = noise2D(x0 + 1, y0 + 1, seed)
  const v0 = v00 * (1 - fx) + v10 * fx
  const v1 = v01 * (1 - fx) + v11 * fx
  return v0 * (1 - fy) + v1 * fy
}

/** Generate fractal noise (multiple octaves of smoothNoise2D) */
export function fractalNoise2D(
  x: number,
  y: number,
  octaves: number = 4,
  persistence: number = 0.5,
  lacunarity: number = 2,
  seed: number = 0,
): number {
  let total = 0
  let frequency = 1
  let amplitude = 1
  let maxValue = 0
  for (let i = 0; i < octaves; i++) {
    total += smoothNoise2D(x * frequency, y * frequency, seed) * amplitude
    maxValue += amplitude
    amplitude *= persistence
    frequency *= lacunarity
  }
  return total / maxValue
}
