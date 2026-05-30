import { describe, it, expect } from 'vitest'
import { allHooks, emptyFilters, filterHooks, getHookBySlug } from './hooks'
import type { HookFilters } from './hooks'
import type { Hook } from '../types/hook'

const HOOKS: Hook[] = [
  {
    id: 'hook-a',
    slug: 'hook-a',
    name: 'Detect Secrets',
    category: 'security',
    provider: ['claude-code'],
    hook_type: 'PreToolUse',
    trigger: 'Bash',
    description: 'Détecte les secrets dans les commandes bash',
    use_cases: ['CI/CD protection'],
    tags: ['security', 'bash'],
    votes: 5,
    implementation: {
      type: 'settings_json',
      config: {
        hooks: {
          PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'detect.sh' }] }],
        },
      },
      script_path: '.claude/hooks/detect.sh',
      code_snippet: '#!/bin/bash\nexit 0',
    },
    community_examples: [],
  },
  {
    id: 'hook-b',
    slug: 'hook-b',
    name: 'Auto Format',
    category: 'workflow',
    provider: ['claude-code', 'copilot-vscode'],
    hook_type: 'PostToolUse',
    trigger: 'Write|Edit',
    description: 'Formate automatiquement les fichiers après écriture',
    use_cases: ['Qualité code'],
    tags: ['format', 'prettier'],
    votes: 12,
    implementation: {
      type: 'settings_json',
      config: {
        hooks: {
          PostToolUse: [{ matcher: 'Write|Edit', hooks: [{ type: 'command', command: 'format.sh' }] }],
        },
      },
    },
    community_examples: [],
  },
  {
    id: 'hook-c',
    slug: 'hook-c',
    name: 'TypeCheck',
    category: 'validation',
    provider: ['copilot-vscode'],
    hook_type: 'PostToolUse',
    trigger: 'Write',
    description: 'Vérifie les types TypeScript après modification',
    use_cases: ['Sécurité des types'],
    tags: ['typescript', 'validation'],
    votes: 8,
    implementation: {
      type: 'settings_json',
      config: {},
    },
    community_examples: [],
  },
]

describe('getHookBySlug', () => {
  it('retourne le hook correspondant au slug', () => {
    const hook = getHookBySlug(allHooks[0].slug)
    expect(hook).toBeDefined()
    expect(hook?.slug).toBe(allHooks[0].slug)
  })

  it('retourne undefined pour un slug inexistant', () => {
    expect(getHookBySlug('inexistant-slug')).toBeUndefined()
  })
})

describe('filterHooks', () => {
  it('sans filtre, retourne tous les hooks', () => {
    expect(filterHooks(HOOKS, emptyFilters)).toHaveLength(HOOKS.length)
  })

  it('filtre par catégorie unique', () => {
    const filters: HookFilters = { ...emptyFilters, categories: ['security'] }
    const result = filterHooks(HOOKS, filters)
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('hook-a')
  })

  it('filtre par plusieurs catégories', () => {
    const filters: HookFilters = { ...emptyFilters, categories: ['security', 'workflow'] }
    const result = filterHooks(HOOKS, filters)
    expect(result).toHaveLength(2)
  })

  it('filtre par provider — retourne hooks ayant au moins un provider correspondant', () => {
    const filters: HookFilters = { ...emptyFilters, providers: ['copilot-vscode'] }
    const result = filterHooks(HOOKS, filters)
    expect(result.map((h) => h.slug)).toContain('hook-b')
    expect(result.map((h) => h.slug)).toContain('hook-c')
    expect(result.map((h) => h.slug)).not.toContain('hook-a')
  })

  it('filtre par événement (hook_type)', () => {
    const filters: HookFilters = { ...emptyFilters, events: ['PreToolUse'] }
    const result = filterHooks(HOOKS, filters)
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('hook-a')
  })

  it('filtre par query sur le nom', () => {
    const filters: HookFilters = { ...emptyFilters, query: 'format' }
    const result = filterHooks(HOOKS, filters)
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('hook-b')
  })

  it('filtre par query sur les tags', () => {
    const filters: HookFilters = { ...emptyFilters, query: 'typescript' }
    const result = filterHooks(HOOKS, filters)
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('hook-c')
  })

  it('filtre par query insensible à la casse', () => {
    const filters: HookFilters = { ...emptyFilters, query: 'SECRETS' }
    const result = filterHooks(HOOKS, filters)
    expect(result).toHaveLength(1)
  })

  it('filtre combiné catégorie + provider', () => {
    const filters: HookFilters = {
      ...emptyFilters,
      categories: ['workflow'],
      providers: ['copilot-vscode'],
    }
    const result = filterHooks(HOOKS, filters)
    expect(result).toHaveLength(1)
    expect(result[0].slug).toBe('hook-b')
  })

  it('retourne tableau vide si aucun hook ne correspond', () => {
    const filters: HookFilters = { ...emptyFilters, query: 'rien-qui-ne-correspond' }
    expect(filterHooks(HOOKS, filters)).toHaveLength(0)
  })

  it('ignore les espaces autour de la query', () => {
    const filters: HookFilters = { ...emptyFilters, query: '  format  ' }
    expect(filterHooks(HOOKS, filters)).toHaveLength(1)
  })
})
