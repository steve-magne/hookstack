import { describe, it, expect } from 'vitest'
import type { TargetAndTransition } from 'motion/react'
import {
  EASE_OUT,
  spring,
  duration,
  fadeUp,
  staggerContainer,
  sectionReveal,
} from '@/lib/motion'

describe('motion tokens', () => {
  it('EASE_OUT est une courbe de Bézier cubique valide (4 nombres)', () => {
    expect(EASE_OUT).toHaveLength(4)
    expect(EASE_OUT.every((n) => typeof n === 'number')).toBe(true)
  })

  it('chaque spring est de type "spring" avec stiffness/damping positifs', () => {
    for (const key of ['snappy', 'smooth', 'gentle'] as const) {
      const s = spring[key]
      expect(s.type).toBe('spring')
      expect(s.stiffness).toBeGreaterThan(0)
      expect(s.damping).toBeGreaterThan(0)
    }
  })

  it('les durées sont positives et ordonnées micro < base < reveal', () => {
    expect(duration.micro).toBeGreaterThan(0)
    expect(duration.micro).toBeLessThan(duration.base)
    expect(duration.base).toBeLessThan(duration.reveal)
  })

  it('fadeUp révèle de hidden (opacity 0) vers show (opacity 1, y 0)', () => {
    const hidden = fadeUp.hidden as TargetAndTransition
    const show = fadeUp.show as TargetAndTransition
    expect(hidden.opacity).toBe(0)
    expect(show.opacity).toBe(1)
    expect(show.y).toBe(0)
  })

  it('staggerContainer orchestre une cascade (staggerChildren > 0)', () => {
    const show = staggerContainer.show as TargetAndTransition
    expect(show.transition?.staggerChildren).toBeGreaterThan(0)
  })

  it('sectionReveal combine fondu (opacity 0→1) et cascade des enfants', () => {
    const hidden = sectionReveal.hidden as TargetAndTransition
    const show = sectionReveal.show as TargetAndTransition
    expect(hidden.opacity).toBe(0)
    expect(show.opacity).toBe(1)
    expect(show.transition?.staggerChildren).toBeGreaterThan(0)
  })
})
