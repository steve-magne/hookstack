import { describe, it, expect } from 'vitest'
import { allHooks, getHookBySlug, localizeHook, filterHooks } from './hooks'
import type { Hook } from '@/types/hook'

function makeHook(overrides: Partial<Hook> = {}): Hook {
  return {
    id: 'test-id',
    slug: 'test-hook',
    name: 'Détection de secrets',
    category: 'security',
    provider: ['claude-code'],
    hook_type: 'PreToolUse',
    trigger: 'Bash',
    description: 'Bloque les secrets en clair.',
    use_cases: ['Protection de credentials', 'Audit'],
    tags: ['security', 'bash'],
    votes: 0,
    community_examples: [],
    implementation: { type: 'settings_json', config: {} },
    ...overrides,
  }
}

describe('localizeHook', () => {
  const hook = makeHook({
    i18n: {
      en: {
        name: 'Secret detection',
        description: 'Blocks plaintext secrets.',
        use_cases: ['Credential protection', 'Audit'],
      },
    },
  })

  it("renvoie le hook canonique tel quel pour 'fr'", () => {
    const result = localizeHook(hook, 'fr')
    expect(result.name).toBe('Détection de secrets')
    expect(result.description).toBe('Bloque les secrets en clair.')
    expect(result.use_cases).toEqual(['Protection de credentials', 'Audit'])
  })

  it("applique l'overlay anglais pour 'en'", () => {
    const result = localizeHook(hook, 'en')
    expect(result.name).toBe('Secret detection')
    expect(result.description).toBe('Blocks plaintext secrets.')
    expect(result.use_cases).toEqual(['Credential protection', 'Audit'])
  })

  it('ne touche pas aux champs neutres (slug, tags, implementation)', () => {
    const result = localizeHook(hook, 'en')
    expect(result.slug).toBe(hook.slug)
    expect(result.tags).toEqual(hook.tags)
    expect(result.implementation).toBe(hook.implementation)
  })

  it("retombe sur le FR si l'overlay de locale est absent", () => {
    const sansOverlay = makeHook()
    expect(localizeHook(sansOverlay, 'en').name).toBe('Détection de secrets')
  })

  it('fait un fallback champ par champ si un champ traduit manque', () => {
    const partiel = makeHook({ i18n: { en: { name: 'Secret detection' } } })
    const result = localizeHook(partiel, 'en')
    expect(result.name).toBe('Secret detection')
    // description et use_cases non traduits → valeurs FR canoniques
    expect(result.description).toBe('Bloque les secrets en clair.')
    expect(result.use_cases).toEqual(['Protection de credentials', 'Audit'])
  })

  it('ne mute pas le hook original', () => {
    const original = makeHook({ i18n: { en: { name: 'Secret detection' } } })
    localizeHook(original, 'en')
    expect(original.name).toBe('Détection de secrets')
  })
})

describe('getHookBySlug', () => {
  it('retrouve un hook existant du registre', () => {
    const slug = allHooks[0]!.slug
    expect(getHookBySlug(slug)?.slug).toBe(slug)
  })

  it('renvoie undefined pour un slug inconnu', () => {
    expect(getHookBySlug('slug-qui-nexiste-pas')).toBeUndefined()
  })
})

describe('filterHooks', () => {
  const hooks = [
    makeHook({ slug: 'a', name: 'Formatage Prettier', category: 'workflow', tags: ['format'] }),
    makeHook({ slug: 'b', name: 'Blocage destructif', category: 'security', tags: ['danger'] }),
  ]
  const empty = { query: '', categories: [], providers: [], events: [] } as const

  it('renvoie tout sans filtre actif', () => {
    expect(filterHooks(hooks, { ...empty })).toHaveLength(2)
  })

  it('filtre par catégorie', () => {
    const result = filterHooks(hooks, { ...empty, categories: ['security'] })
    expect(result.map((h) => h.slug)).toEqual(['b'])
  })

  it('filtre par recherche texte (insensible à la casse)', () => {
    const result = filterHooks(hooks, { ...empty, query: 'prettier' })
    expect(result.map((h) => h.slug)).toEqual(['a'])
  })
})
