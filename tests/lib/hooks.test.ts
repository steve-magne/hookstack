import { describe, it, expect } from 'vitest'
import { allHooks, getHookBySlug, filterHooks } from '@/lib/hooks'
import type { Hook } from '@/types/hook'

function makeHook(overrides: Partial<Hook> = {}): Hook {
  return {
    slug: 'test-hook',
    name: 'Secret detection',
    category: 'security',
    hook_type: 'PreToolUse',
    trigger: 'Bash',
    description: 'Blocks plaintext secrets.',
    use_cases: ['Credential protection', 'Audit'],
    tags: ['security', 'bash'],
    implementation: { type: 'settings_json', config: {} },
    ...overrides,
  }
}

describe('getHookBySlug', () => {
  it('finds an existing hook from the registry', () => {
    const slug = allHooks[0]?.slug
    expect(slug).toBeDefined()
    expect(getHookBySlug(slug)?.slug).toBe(slug)
  })

  it('returns undefined for an unknown slug', () => {
    expect(getHookBySlug('slug-that-does-not-exist')).toBeUndefined()
  })
})

describe('filterHooks', () => {
  const hooks = [
    makeHook({ slug: 'a', name: 'Prettier formatter', category: 'workflow', tags: ['format'] }),
    makeHook({ slug: 'b', name: 'Destructive block', category: 'security', tags: ['danger'] }),
  ]
  const empty = { query: '', categories: [] as Hook['category'][], events: [] as Hook['hook_type'][], stacks: [] as import('@/types/hook').Stack[] }

  it('returns everything with no active filter', () => {
    expect(filterHooks(hooks, empty)).toHaveLength(2)
  })

  it('filters by category', () => {
    const result = filterHooks(hooks, { ...empty, categories: ['security'] })
    expect(result.map((h) => h.slug)).toEqual(['b'])
  })

  it('filters by text search (case-insensitive)', () => {
    const result = filterHooks(hooks, { ...empty, query: 'prettier' })
    expect(result.map((h) => h.slug)).toEqual(['a'])
  })
})
