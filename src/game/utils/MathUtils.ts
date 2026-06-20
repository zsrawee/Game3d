// ===================================================================
// Math Utilities - Mathematical helper functions for the game
// ===================================================================
// A comprehensive set of math utilities used throughout the game
// engine for vector math, interpolation, smoothing, geometry, etc.
// ===================================================================

import * as THREE from 'three'

// -------------------------------------------------------------------
// Basic Math Helpers
// -------------------------------------------------------------------

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Linear interpolation between a and b by t (0-1) */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Inverse linear interpolation - returns t for a value between a and b */
export function inverseLerp(a: number, b: number, value: number): number {
  if (Math.abs(b - a) < 1e-6) return 0
  return clamp((value - a) / (b - a), 0, 1)
}

/** Remap a value from one range to another */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = inverseLerp(inMin, inMax, value)
  return lerp(outMin, outMax, t)
}

/** Smooth step interpolation - smooth curve at boundaries */
export function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Smoother step - even smoother curve with zero derivative at edges */
export function smootherStep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/** Frame-rate independent smoothing using exponential decay */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt))
}

/** Frame-rate independent angle smoothing */
export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const diff = angleDifference(current, target)
  return current + diff * (1 - Math.exp(-lambda * dt))
}

/** Move towards a target at a max speed, never overshooting */
export function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target
  return current + Math.sign(target - current) * maxDelta
}

/** Move an angle towards a target angle at max delta */
export function moveTowardsAngle(current: number, target: number, maxDelta: number): number {
  const diff = angleDifference(current, target)
  if (Math.abs(diff) <= maxDelta) return target
  return current + Math.sign(diff) * maxDelta
}

/** Shortest angular difference between two angles (radians) */
export function angleDifference(a: number, b: number): number {
  let diff = (b - a) % (Math.PI * 2)
  if (diff < -Math.PI) diff += Math.PI * 2
  if (diff > Math.PI) diff -= Math.PI * 2
  return diff
}

/** Wrap an angle to [-PI, PI] */
export function wrapAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2
  while (angle < -Math.PI) angle += Math.PI * 2
  return angle
}

/** Convert degrees to radians */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Convert radians to degrees */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI
}

// -------------------------------------------------------------------
// Vector3 Helpers
// -------------------------------------------------------------------

/** Damp a Vector3 toward a target with frame-rate independence */
export function dampVector3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  lambda: number,
  dt: number,
): THREE.Vector3 {
  const factor = 1 - Math.exp(-lambda * dt)
  return current.lerp(target, factor)
}

/** Move a Vector3 toward a target at max distance per step */
export function moveTowardsVector3(
  current: THREE.Vector3,
  target: THREE.Vector3,
  maxDistanceDelta: number,
): THREE.Vector3 {
  const diff = target.clone().sub(current)
  const dist = diff.length()
  if (dist <= maxDistanceDelta || dist === 0) return target.clone()
  return current.clone().add(diff.divideScalar(dist).multiplyScalar(maxDistanceDelta))
}

/** Get the horizontal distance between two vectors (ignoring Y) */
export function horizontalDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

/** Get the horizontal squared distance (faster, no sqrt) */
export function horizontalDistanceSquared(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x
  const dz = a.z - b.z
  return dx * dx + dz * dz
}

/** Get a direction vector from a to b (normalized) */
export function directionFromTo(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
  return b.clone().sub(a).normalize()
}

/** Get a horizontal-only direction vector from a to b */
export function horizontalDirectionFromTo(a: THREE.Vector3, b: THREE.Vector3): THREE.Vector3 {
  const dir = b.clone().sub(a)
  dir.y = 0
  return dir.normalize()
}

/** Returns true if a is within distance of b */
export function isWithinDistance(a: THREE.Vector3, b: THREE.Vector3, distance: number): boolean {
  return a.distanceToSquared(b) <= distance * distance
}

/** Returns true if a is within horizontal distance of b */
export function isWithinHorizontalDistance(
  a: THREE.Vector3,
  b: THREE.Vector3,
  distance: number,
): boolean {
  return horizontalDistanceSquared(a, b) <= distance * distance
}

/** Project a point onto a line segment */
export function closestPointOnSegment(
  point: THREE.Vector3,
  segStart: THREE.Vector3,
  segEnd: THREE.Vector3,
): THREE.Vector3 {
  const seg = segEnd.clone().sub(segStart)
  const segLengthSq = seg.lengthSq()
  if (segLengthSq < 1e-6) return segStart.clone()
  const t = clamp(point.clone().sub(segStart).dot(seg) / segLengthSq, 0, 1)
  return segStart.clone().add(seg.multiplyScalar(t))
}

// -------------------------------------------------------------------
// Geometry Helpers
// -------------------------------------------------------------------

/** Check if a point is inside a sphere */
export function isPointInSphere(
  point: THREE.Vector3,
  center: THREE.Vector3,
  radius: number,
): boolean {
  return point.distanceToSquared(center) <= radius * radius
}

/** Check if a point is inside an AABB (axis-aligned bounding box) */
export function isPointInAABB(
  point: THREE.Vector3,
  min: THREE.Vector3,
  max: THREE.Vector3,
): boolean {
  return (
    point.x >= min.x &&
    point.x <= max.x &&
    point.y >= min.y &&
    point.y <= max.y &&
    point.z >= min.z &&
    point.z <= max.z
  )
}

/** Closest point on an AABB to a given point */
export function closestPointOnAABB(
  point: THREE.Vector3,
  min: THREE.Vector3,
  max: THREE.Vector3,
): THREE.Vector3 {
  return new THREE.Vector3(
    clamp(point.x, min.x, max.x),
    clamp(point.y, min.y, max.y),
    clamp(point.z, min.z, max.z),
  )
}

/** Sphere-sphere intersection */
export function sphereIntersectsSphere(
  c1: THREE.Vector3,
  r1: number,
  c2: THREE.Vector3,
  r2: number,
): boolean {
  const combinedRadius = r1 + r2
  return c1.distanceToSquared(c2) <= combinedRadius * combinedRadius
}

/** Sphere-AABB intersection test */
export function sphereIntersectsAABB(
  center: THREE.Vector3,
  radius: number,
  min: THREE.Vector3,
  max: THREE.Vector3,
): boolean {
  const closest = closestPointOnAABB(center, min, max)
  return center.distanceToSquared(closest) <= radius * radius
}

// -------------------------------------------------------------------
// Random Helpers (delegated to RandomUtils for advanced features)
// -------------------------------------------------------------------

/** Simple random float in [min, max) */
export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Random integer in [min, max] inclusive */
export function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

/** Random sign (-1 or 1) */
export function randomSign(): number {
  return Math.random() < 0.5 ? -1 : 1
}

/** Pick a random element from an array */
export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// -------------------------------------------------------------------
// Easing Functions
// -------------------------------------------------------------------

export const Easing = {
  linear: (t: number): number => t,
  inQuad: (t: number): number => t * t,
  outQuad: (t: number): number => t * (2 - t),
  inOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  inCubic: (t: number): number => t * t * t,
  outCubic: (t: number): number => --t * t * t + 1,
  inOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  inQuart: (t: number): number => t * t * t * t,
  outQuart: (t: number): number => 1 - --t * t * t * t,
  inOutQuart: (t: number): number =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  inQuint: (t: number): number => t * t * t * t * t,
  outQuint: (t: number): number => 1 + --t * t * t * t * t,
  inOutQuint: (t: number): number =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
  inSine: (t: number): number => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t: number): number => Math.sin((t * Math.PI) / 2),
  inOutSine: (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2,
  inExpo: (t: number): number => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  outExpo: (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t: number): number => {
    if (t === 0) return 0
    if (t === 1) return 1
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2
    return (2 - Math.pow(2, -20 * t + 10)) / 2
  },
  inCirc: (t: number): number => 1 - Math.sqrt(1 - t * t),
  outCirc: (t: number): number => Math.sqrt(1 - --t * t),
  inOutCirc: (t: number): number =>
    t < 0.5
      ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
      : (Math.sqrt(1 - -2 * t * (t - 2) * (2 * t - 2) * (2 * t - 2) + 1) + 1) / 2,
  inBack: (t: number): number => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },
  outBack: (t: number): number => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  inOutBack: (t: number): number => {
    const c1 = 1.70158
    const c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  },
  inElastic: (t: number): number => {
    if (t === 0) return 0
    if (t === 1) return 1
    const c4 = (2 * Math.PI) / 3
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4)
  },
  outElastic: (t: number): number => {
    if (t === 0) return 0
    if (t === 1) return 1
    const c4 = (2 * Math.PI) / 3
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  inOutElastic: (t: number): number => {
    if (t === 0) return 0
    if (t === 1) return 1
    const c5 = (2 * Math.PI) / 4.5
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c5)) / 2 + 1
  },
  outBounce: (t: number): number => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) return n1 * t * t
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375
    return n1 * (t -= 2.625 / d1) * t + 0.984375
  },
  inBounce: (t: number): number => 1 - Easing.outBounce(1 - t),
  inOutBounce: (t: number): number =>
    t < 0.5
      ? (1 - Easing.outBounce(1 - 2 * t)) / 2
      : (1 + Easing.outBounce(2 * t - 1)) / 2,
}

// -------------------------------------------------------------------
// Number Formatting
// -------------------------------------------------------------------

/** Format a number with thousands separators */
export function formatNumber(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B'
  if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M'
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K'
  return value.toFixed(0)
}

/** Format time in seconds to MM:SS or HH:MM:SS */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/** Format a percentage value */
export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

// -------------------------------------------------------------------
// Physics Helpers
// -------------------------------------------------------------------

/** Calculate launch velocity for a projectile to hit a target with gravity */
export function calculateLaunchVelocity(
  start: THREE.Vector3,
  target: THREE.Vector3,
  gravity: number,
  angleDeg: number = 45,
): THREE.Vector3 {
  const direction = target.clone().sub(start)
  const horizontalDistance = Math.sqrt(direction.x * direction.x + direction.z * direction.z)
  const verticalDistance = direction.y
  const angleRad = degToRad(angleDeg)
  const tanAngle = Math.tan(angleRad)
  const g = Math.abs(gravity)

  const velocitySq =
    (g * horizontalDistance * horizontalDistance) /
    (2 * Math.cos(angleRad) * Math.cos(angleRad) *
      (horizontalDistance * tanAngle - verticalDistance))

  const velocity = Math.sqrt(Math.max(0, velocitySq))
  const dir2d = new THREE.Vector2(direction.x, direction.z).normalize()
  return new THREE.Vector3(
    dir2d.x * velocity * Math.cos(angleRad),
    velocity * Math.sin(angleRad),
    dir2d.y * velocity * Math.cos(angleRad),
  )
}

/** Calculate gravitational fall distance for a given time */
export function fallDistance(time: number, gravity: number): number {
  return 0.5 * gravity * time * time
}

/** Calculate time to fall a given distance under gravity */
export function fallTime(distance: number, gravity: number): number {
  return Math.sqrt((2 * Math.abs(distance)) / Math.abs(gravity))
}

// -------------------------------------------------------------------
// Color Helpers
// -------------------------------------------------------------------

/** Mix two colors by t (0-1) */
export function mixColors(c1: THREE.Color, c2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(c1, c2, t)
}

/** Convert hex number to rgba string */
export function hexToRgba(hex: number, alpha: number = 1): string {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  return `rgba(${r},${g},${b},${alpha})`
}

/** Convert HSL to RGB hex */
export function hslToHex(h: number, s: number, l: number): number {
  h = ((h % 360) + 360) % 360
  s = clamp(s, 0, 1)
  l = clamp(l, 0, 1)
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
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

// -------------------------------------------------------------------
// Misc Utilities
// -------------------------------------------------------------------

/** Convert seconds to a human-readable duration string */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

/** Round a number to n decimal places */
export function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals)
  return Math.round(value * multiplier) / multiplier
}

/** Get a unique-ish ID based on timestamp and random */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** Check if a value is approximately zero */
export function approxZero(value: number, epsilon: number = 1e-6): boolean {
  return Math.abs(value) < epsilon
}

/** Check if two values are approximately equal */
export function approxEqual(a: number, b: number, epsilon: number = 1e-6): boolean {
  return Math.abs(a - b) < epsilon
}
