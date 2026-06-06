import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pageSource = () => readFileSync('src/app/not-found.tsx', 'utf8')
const sceneSource = () => readFileSync('src/components/NotFoundScene3D.tsx', 'utf8')

describe('NotFoundPage', () => {
  it('keeps the 404 page in the HookStack product language', () => {
    const source = pageSource()

    expect(source).toContain('Lost route.')
    expect(source).toContain('Hook graph still intact.')
    expect(source).toContain('NotFoundScene3D')
    expect(source).toContain('SplitFlap')
    expect(source).toContain('href="/#catalogue"')
    expect(source).toContain('Back to catalogue')
  })

  it('uses a dedicated client-side 3D scene with reduced-motion support', () => {
    const source = sceneSource()

    expect(source).toContain("'use client'")
    expect(source).toContain('useAnimationFrame')
    expect(source).toContain('useReducedMotion')
    expect(source).toContain('data-component="NotFoundScene3D"')
    expect(source).toContain('pipeline-node')
    expect(source).toContain('Command rejected')
  })
})
