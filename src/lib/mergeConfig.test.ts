import { describe, it, expect } from 'vitest'
import { collectScripts, mergeSettings, toSettingsJson } from './mergeConfig'
import type { Hook } from '../types/hook'

function makeHook(overrides: Partial<Hook> & { id: string }): Hook {
  return {
    slug: overrides.id,
    name: 'Test Hook',
    category: 'workflow',
    provider: ['claude-code'],
    hook_type: 'PostToolUse',
    trigger: 'Write',
    description: '',
    use_cases: [],
    tags: [],
    votes: 0,
    community_examples: [],
    implementation: {
      type: 'settings_json',
      config: {},
    },
    ...overrides,
  }
}

const hookA = makeHook({
  id: 'hook-a',
  implementation: {
    type: 'settings_json',
    config: {
      hooks: {
        PostToolUse: [
          { matcher: 'Write', hooks: [{ type: 'command', command: 'format.sh' }] },
        ],
      },
    },
    script_path: '.claude/hooks/format.sh',
    code_snippet: '#!/bin/bash\nprettier --write "$FILE"',
  },
})

const hookB = makeHook({
  id: 'hook-b',
  implementation: {
    type: 'settings_json',
    config: {
      hooks: {
        PostToolUse: [
          { matcher: 'Write', hooks: [{ type: 'command', command: 'eslint.sh' }] },
        ],
      },
    },
    script_path: '.claude/hooks/eslint.sh',
    code_snippet: '#!/bin/bash\neslint "$FILE"',
  },
})

const hookC = makeHook({
  id: 'hook-c',
  implementation: {
    type: 'settings_json',
    config: {
      hooks: {
        PreToolUse: [
          { matcher: 'Bash', hooks: [{ type: 'command', command: 'detect.sh' }] },
        ],
      },
    },
  },
})

describe('mergeSettings', () => {
  it('retourne un objet hooks vide pour un tableau vide', () => {
    expect(mergeSettings([])).toEqual({ hooks: {} })
  })

  it("retourne la config d'un seul hook intacte", () => {
    const result = mergeSettings([hookA])
    expect(result.hooks['PostToolUse']).toHaveLength(1)
    expect(result.hooks['PostToolUse'][0].matcher).toBe('Write')
    expect(result.hooks['PostToolUse'][0].hooks).toHaveLength(1)
  })

  it('fusionne deux hooks sur même événement et même matcher', () => {
    const result = mergeSettings([hookA, hookB])
    const postToolUse = result.hooks['PostToolUse']
    expect(postToolUse).toHaveLength(1)
    expect(postToolUse[0].hooks).toHaveLength(2)
  })

  it('conserve les matchers distincts comme entrées séparées', () => {
    const hookD = makeHook({
      id: 'hook-d',
      implementation: {
        type: 'settings_json',
        config: {
          hooks: {
            PostToolUse: [
              { matcher: 'Edit', hooks: [{ type: 'command', command: 'other.sh' }] },
            ],
          },
        },
      },
    })
    const result = mergeSettings([hookA, hookD])
    expect(result.hooks['PostToolUse']).toHaveLength(2)
  })

  it('agrège plusieurs événements distincts', () => {
    const result = mergeSettings([hookA, hookC])
    expect(Object.keys(result.hooks)).toContain('PostToolUse')
    expect(Object.keys(result.hooks)).toContain('PreToolUse')
  })

  it('ignore un hook sans fragment hooks dans la config', () => {
    const hookEmpty = makeHook({ id: 'empty' })
    const result = mergeSettings([hookEmpty])
    expect(result.hooks).toEqual({})
  })
})

describe('toSettingsJson', () => {
  it('retourne un JSON valide', () => {
    const json = toSettingsJson([hookA])
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('le JSON est indenté à 2 espaces', () => {
    const json = toSettingsJson([hookA])
    expect(json).toMatch(/^{\n  "hooks"/)
  })

  it('le contenu correspond à mergeSettings sérialisé', () => {
    const json = toSettingsJson([hookA, hookB])
    expect(JSON.parse(json)).toEqual(mergeSettings([hookA, hookB]))
  })
})

describe('collectScripts', () => {
  it('retourne les scripts des hooks qui ont script_path et code_snippet', () => {
    const scripts = collectScripts([hookA, hookB])
    expect(scripts).toHaveLength(2)
    expect(scripts[0]).toEqual({
      path: '.claude/hooks/format.sh',
      content: '#!/bin/bash\nprettier --write "$FILE"',
    })
  })

  it('exclut les hooks sans script_path ou sans code_snippet', () => {
    const scripts = collectScripts([hookA, hookC])
    expect(scripts).toHaveLength(1)
    expect(scripts[0].path).toBe('.claude/hooks/format.sh')
  })

  it("retourne un tableau vide si aucun hook n'a de script", () => {
    const hookEmpty = makeHook({ id: 'empty' })
    expect(collectScripts([hookEmpty])).toHaveLength(0)
  })
})
