// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  parseArgs,
  resolveScopeRoot,
  assertSafeTarget,
  mergeHooks,
  collectIncomingHooks,
  analyzeSecurity,
  snykVerdict,
  shortRepo,
  isBlockingEvent,
  buildSummaryRows,
  buildSecurityRows,
} from '../../packages/cli/bin/core.mjs'

const argv = (...a) => ['node', 'cli.mjs', ...a]

describe('parseArgs', () => {
  it('parse --hooks= en liste', () => {
    expect(parseArgs(argv('install', '--hooks=a,b , c')).hooks).toEqual(['a', 'b', 'c'])
  })
  it('parse --hooks séparé', () => {
    expect(parseArgs(argv('install', '--hooks', 'a,b')).hooks).toEqual(['a', 'b'])
  })
  it('défaut scope project', () => {
    expect(parseArgs(argv('install')).scope).toBe('project')
  })
  it('--global bascule en global', () => {
    expect(parseArgs(argv('install', '--global')).scope).toBe('global')
  })
  it('--scope=global', () => {
    expect(parseArgs(argv('install', '--scope=global')).scope).toBe('global')
  })
  it('--scope invalide ignoré', () => {
    expect(parseArgs(argv('install', '--scope=root')).scope).toBe('project')
  })
  it('-y active yes', () => {
    expect(parseArgs(argv('install', '-y')).yes).toBe(true)
  })
  it('flags version/help', () => {
    expect(parseArgs(argv('-v')).version).toBe(true)
    expect(parseArgs(argv('-h')).help).toBe(true)
  })
  it('premier token libre = commande', () => {
    expect(parseArgs(argv('install')).command).toBe('install')
  })
})

describe('resolveScopeRoot', () => {
  it('project → cwd/.claude', () => {
    const d = resolveScopeRoot('project', { cwd: '/proj', home: '/home/u' })
    expect(d.root).toBe('/proj')
    expect(d.settingsPath).toBe('/proj/.claude/settings.json')
    expect(d.hooksDir).toBe('/proj/.claude/hooks')
  })
  it('global → home/.claude', () => {
    const d = resolveScopeRoot('global', { cwd: '/proj', home: '/home/u' })
    expect(d.root).toBe('/home/u')
    expect(d.settingsPath).toBe('/home/u/.claude/settings.json')
  })
})

describe('assertSafeTarget', () => {
  it('accepte un chemin sous la racine', () => {
    expect(() => assertSafeTarget('/proj', '.claude/hooks/x.mjs')).not.toThrow()
  })
  it('rejette un chemin absolu', () => {
    expect(() => assertSafeTarget('/proj', '/etc/passwd')).toThrow(/absolute/)
  })
  it('rejette les segments ..', () => {
    expect(() => assertSafeTarget('/proj', '../../etc/x')).toThrow(/\.\./)
  })
  it('rejette une lettre de lecteur Windows', () => {
    expect(() => assertSafeTarget('/proj', 'C:\\evil')).toThrow(/Windows|absolute/)
  })
})

describe('mergeHooks', () => {
  it('fusionne par matcher sans écraser', () => {
    const existing = { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'a' }] }] }
    const incoming = { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'b' }] }] }
    const m = mergeHooks(existing, incoming)
    expect(m.PreToolUse[0].hooks).toHaveLength(2)
  })
  it('crée un nouvel event', () => {
    const m = mergeHooks({}, { Stop: [{ hooks: [{ command: 'x' }] }] })
    expect(m.Stop).toHaveLength(1)
  })
  it('ne mute pas existing', () => {
    const existing = { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'a' }] }] }
    mergeHooks(existing, { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'b' }] }] })
    expect(existing.PreToolUse[0].hooks).toHaveLength(1)
  })
})

describe('collectIncomingHooks', () => {
  const hooks = [{
    slug: 's',
    config: { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'node $CLAUDE_PROJECT_DIR/.claude/hooks/s.mjs' }] }] } },
  }]
  it('project : conserve $CLAUDE_PROJECT_DIR', () => {
    const out = collectIncomingHooks(hooks, { scope: 'project' })
    expect(out.PreToolUse[0].hooks[0].command).toContain('$CLAUDE_PROJECT_DIR')
  })
  it('global : réécrit vers la racine absolue', () => {
    const out = collectIncomingHooks(hooks, { scope: 'global', globalRoot: '/home/u' })
    expect(out.PreToolUse[0].hooks[0].command).toBe('node /home/u/.claude/hooks/s.mjs')
  })
  it('copilot : retire $CLAUDE_PROJECT_DIR/', () => {
    const out = collectIncomingHooks(hooks, { scope: 'copilot' })
    expect(out.PreToolUse[0].hooks[0].command).toBe('node .claude/hooks/s.mjs')
  })
  it('copilot : retire aussi la forme ${CLAUDE_PROJECT_DIR}/', () => {
    const h = [{ slug: 's', config: { hooks: { Stop: [{ hooks: [{ command: 'node ${CLAUDE_PROJECT_DIR}/.claude/hooks/s.mjs' }] }] } } }]
    const out = collectIncomingHooks(h, { scope: 'copilot' })
    expect(out.Stop[0].hooks[0].command).toBe('node .claude/hooks/s.mjs')
  })
  it('ignore les hooks sans fragment config', () => {
    expect(collectIncomingHooks([{ slug: 'x' }], {})).toEqual({})
  })
})

describe('analyzeSecurity', () => {
  it('détecte le shell', () => {
    expect(analyzeSecurity('execSync("ls")').shell).toBe(true)
    expect(analyzeSecurity("import { spawn } from 'child_process'").shell).toBe(true)
  })
  it('détecte le réseau', () => {
    expect(analyzeSecurity('await fetch(url)').network).toBe(true)
    expect(analyzeSecurity("import https from 'node:https'").network).toBe(true)
  })
  it('détecte les écritures fs', () => {
    expect(analyzeSecurity('writeFileSync(p, x)').fsWrite).toBe(true)
  })
  it('code anodin → tout faux', () => {
    expect(analyzeSecurity('const x = 1 + 1')).toEqual({ shell: false, network: false, fsWrite: false })
  })
  it('snippet absent → tout faux', () => {
    expect(analyzeSecurity(undefined).shell).toBe(false)
  })
})

describe('snykVerdict', () => {
  it('absent → placeholder', () => {
    expect(snykVerdict(undefined)).toEqual({ label: '—', level: 'unknown' })
  })
  it('0 finding → Safe', () => {
    expect(snykVerdict({ high: 0, medium: 0, low: 0 }).level).toBe('safe')
  })
  it('priorité high > medium > low', () => {
    expect(snykVerdict({ high: 1, medium: 5, low: 9 }).level).toBe('high')
    expect(snykVerdict({ high: 0, medium: 2, low: 9 }).level).toBe('medium')
    expect(snykVerdict({ high: 0, medium: 0, low: 1 }).level).toBe('low')
  })
})

describe('shortRepo', () => {
  it('raccourcit une URL github', () => {
    expect(shortRepo('https://github.com/disler/claude-code-hooks-mastery')).toBe('disler/claude-code-hooks-mastery')
  })
  it('retire .git final', () => {
    expect(shortRepo('https://github.com/a/b.git')).toBe('a/b')
  })
  it('null → null', () => {
    expect(shortRepo(null)).toBeNull()
  })
})

describe('isBlockingEvent', () => {
  it('PreToolUse bloque, PostToolUse non', () => {
    expect(isBlockingEvent('PreToolUse')).toBe(true)
    expect(isBlockingEvent('PostToolUse')).toBe(false)
  })
})

describe('buildSummaryRows', () => {
  it('compose chemin, events, blocking et source', () => {
    const rows = buildSummaryRows([{
      slug: 's',
      name: 'S',
      script_path: '.claude/hooks/s.mjs',
      category: 'security',
      trigger: 'Bash',
      config: { hooks: { PreToolUse: [{ hooks: [] }] } },
      community_examples: [{ repo: 'https://github.com/a/b' }],
    }], { root: '/proj' })
    expect(rows[0]).toMatchObject({
      path: '/proj/.claude/hooks/s.mjs',
      blocking: true,
      matcher: 'Bash',
      source: 'a/b',
      events: ['PreToolUse'],
    })
  })
})

describe('buildSecurityRows', () => {
  it('combine analyse locale et verdict snyk', () => {
    const rows = buildSecurityRows([{
      slug: 's',
      name: 'S',
      code_snippet: 'execSync("x")',
      security: { snyk: { high: 0, medium: 1, low: 0 } },
    }])
    expect(rows[0].shell).toBe(true)
    expect(rows[0].snyk.level).toBe('medium')
  })
})
