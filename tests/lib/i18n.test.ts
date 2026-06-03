import { describe, it, expect } from 'vitest'
import { T } from '@/lib/i18n'

describe('T translations', () => {
  it('has a non-empty navCatalogue', () => {
    expect(T.navCatalogue).toBe('Catalogue')
  })

  it('has a non-empty copy label', () => {
    expect(T.copy).toBe('Copy')
  })

  it('has no empty string values at the root level', () => {
    for (const [key, val] of Object.entries(T)) {
      if (typeof val === 'string') expect(val, `T.${key} is empty`).not.toBe('')
    }
  })

  it('categoryLabels covers all expected categories', () => {
    const expected = ['security', 'context', 'validation', 'notification', 'workflow', 'documentation']
    expect(Object.keys(T.categoryLabels).sort()).toEqual(expected.sort())
  })
})
