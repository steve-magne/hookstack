// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  parseArgs,
  resolveScopeRoot,
  assertSafeTarget,
  mergeHooks,
  collectIncomingHooks,
  resolveScriptPath,
  isGlobalScope,
  isCodexScope,
  analyzeSecurity,
  snykVerdict,
  shortRepo,
  isBlockingEvent,
  buildSummaryRows,
  buildSecurityRows,
  buildPostInstallHints,
  PREREQ_HINTS,
  extractFingerprint,
  findInstalledSlugs,
  detectScriptChanges,
  doUpdateTests,
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
  it('--copilot bascule en copilot', () => {
    expect(parseArgs(argv('install', '--copilot')).scope).toBe('copilot')
  })
  it('--codex-project bascule en codex-project', () => {
    expect(parseArgs(argv('install', '--codex-project')).scope).toBe('codex-project')
  })
  it('--codex-profile bascule en codex-profile', () => {
    expect(parseArgs(argv('install', '--codex-profile')).scope).toBe('codex-profile')
  })
  it('--scope=codex-project accepté', () => {
    expect(parseArgs(argv('install', '--scope=codex-project')).scope).toBe('codex-project')
  })
  it('--scope=copilot accepté', () => {
    expect(parseArgs(argv('install', '--scope=copilot')).scope).toBe('copilot')
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
    expect(d.format).toBe('claude')
  })
  it('copilot → cwd/.claude (format claude)', () => {
    const d = resolveScopeRoot('copilot', { cwd: '/proj', home: '/home/u' })
    expect(d.settingsPath).toBe('/proj/.claude/settings.json')
    expect(d.format).toBe('claude')
  })
  it('codex-project → cwd/.codex/hooks.json', () => {
    const d = resolveScopeRoot('codex-project', { cwd: '/proj', home: '/home/u' })
    expect(d.root).toBe('/proj')
    expect(d.settingsPath).toBe('/proj/.codex/hooks.json')
    expect(d.hooksDir).toBe('/proj/.codex/hooks')
    expect(d.format).toBe('codex')
  })
  it('codex-profile → home/.codex/hooks.json', () => {
    const d = resolveScopeRoot('codex-profile', { cwd: '/proj', home: '/home/u' })
    expect(d.root).toBe('/home/u')
    expect(d.settingsPath).toBe('/home/u/.codex/hooks.json')
    expect(d.format).toBe('codex')
  })
})

describe('isGlobalScope / isCodexScope', () => {
  it('global et codex-profile sont globaux', () => {
    expect(isGlobalScope('global')).toBe(true)
    expect(isGlobalScope('codex-profile')).toBe(true)
    expect(isGlobalScope('project')).toBe(false)
    expect(isGlobalScope('codex-project')).toBe(false)
  })
  it('codex-project et codex-profile sont codex', () => {
    expect(isCodexScope('codex-project')).toBe(true)
    expect(isCodexScope('codex-profile')).toBe(true)
    expect(isCodexScope('project')).toBe(false)
    expect(isCodexScope('copilot')).toBe(false)
  })
})

describe('resolveScriptPath', () => {
  it('claude : inchangé', () => {
    expect(resolveScriptPath('.claude/hooks/s.mjs', 'project')).toBe('.claude/hooks/s.mjs')
    expect(resolveScriptPath('.claude/hooks/s.mjs', 'copilot')).toBe('.claude/hooks/s.mjs')
  })
  it('codex : relocalise vers .codex/hooks', () => {
    expect(resolveScriptPath('.claude/hooks/s.mjs', 'codex-project')).toBe('.codex/hooks/s.mjs')
    expect(resolveScriptPath('.claude/hooks/s.mjs', 'codex-profile')).toBe('.codex/hooks/s.mjs')
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
  it('idempotent — double install ne duplique pas les commandes', () => {
    const incoming = { PreToolUse: [{ matcher: 'Bash', hooks: [{ command: 'node hook.mjs' }] }] }
    const once = mergeHooks({}, incoming)
    const twice = mergeHooks(once, incoming)
    expect(twice.PreToolUse[0].hooks).toHaveLength(1)
  })
  it('idempotent — plusieurs events simultanés', () => {
    const incoming = {
      PreToolUse: [{ matcher: 'Write', hooks: [{ command: 'node a.mjs' }] }],
      Stop: [{ hooks: [{ command: 'node b.mjs' }] }],
    }
    const once = mergeHooks({}, incoming)
    const twice = mergeHooks(once, incoming)
    expect(twice.PreToolUse[0].hooks).toHaveLength(1)
    expect(twice.Stop[0].hooks).toHaveLength(1)
  })
  it('conserve deux commandes différentes sous le même matcher', () => {
    const existing = { Stop: [{ hooks: [{ command: 'node a.mjs' }] }] }
    const incoming = { Stop: [{ hooks: [{ command: 'node b.mjs' }] }] }
    const m = mergeHooks(existing, incoming)
    expect(m.Stop[0].hooks).toHaveLength(2)
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
  // biome-ignore lint/suspicious/noTemplateCurlyInString: literal shell-style ${VAR} syntax under test, not JS interpolation
  it('copilot : retire aussi la forme ${CLAUDE_PROJECT_DIR}/', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal shell-style ${VAR} syntax under test, not JS interpolation
    const h = [{ slug: 's', config: { hooks: { Stop: [{ hooks: [{ command: 'node ${CLAUDE_PROJECT_DIR}/.claude/hooks/s.mjs' }] }] } } }]
    const out = collectIncomingHooks(h, { scope: 'copilot' })
    expect(out.Stop[0].hooks[0].command).toBe('node .claude/hooks/s.mjs')
  })
  it('codex-project : réécrit .claude/ en .codex/ (relatif)', () => {
    const out = collectIncomingHooks(hooks, { scope: 'codex-project' })
    expect(out.PreToolUse[0].hooks[0].command).toBe('node .codex/hooks/s.mjs')
  })
  it('codex-profile : réécrit vers <home>/.codex/ (absolu)', () => {
    const out = collectIncomingHooks(hooks, { scope: 'codex-profile', globalRoot: '/home/u' })
    expect(out.PreToolUse[0].hooks[0].command).toBe('node /home/u/.codex/hooks/s.mjs')
  })
  // biome-ignore lint/suspicious/noTemplateCurlyInString: literal shell-style ${VAR} syntax under test, not JS interpolation
  it('codex : gère aussi la forme ${CLAUDE_PROJECT_DIR}/', () => {
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal shell-style ${VAR} syntax under test, not JS interpolation
    const h = [{ slug: 's', config: { hooks: { Stop: [{ hooks: [{ command: 'node ${CLAUDE_PROJECT_DIR}/.claude/hooks/s.mjs' }] }] } } }]
    const out = collectIncomingHooks(h, { scope: 'codex-project' })
    expect(out.Stop[0].hooks[0].command).toBe('node .codex/hooks/s.mjs')
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

describe('buildPostInstallHints', () => {
  it('retourne vide si aucun hook avec prérequis', () => {
    expect(buildPostInstallHints([{ slug: 'guard-push-main' }])).toEqual([])
  })

  it('retourne un hint pour stop-duplication-check', () => {
    const hints = buildPostInstallHints([{ slug: 'stop-duplication-check' }])
    expect(hints).toHaveLength(1)
    expect(hints[0].slug).toBe('stop-duplication-check')
    expect(hints[0].hint).toContain('jscpd')
  })

  it('ignore les hooks sans entrée PREREQ_HINTS', () => {
    const hooks = [{ slug: 'detect-secrets' }, { slug: 'stop-duplication-check' }]
    const hints = buildPostInstallHints(hooks)
    expect(hints).toHaveLength(1)
    expect(hints[0].slug).toBe('stop-duplication-check')
  })

  it('PREREQ_HINTS contient une commande pnpm ou npm pour jscpd', () => {
    expect(PREREQ_HINTS['stop-duplication-check']).toMatch(/pnpm|npm/)
  })

  it('retourne un hint pour notification-sound avec brew', () => {
    const hints = buildPostInstallHints([{ slug: 'notification-sound' }])
    expect(hints).toHaveLength(1)
    expect(hints[0].slug).toBe('notification-sound')
    expect(hints[0].hint).toContain('brew install terminal-notifier')
  })

  it('hint notification-sound mentionne le bénéfice click-to-focus', () => {
    expect(PREREQ_HINTS['notification-sound']).toMatch(/click-to-focus/)
  })

  it('retourne les deux hints si les deux hooks sont présents', () => {
    const hooks = [{ slug: 'stop-duplication-check' }, { slug: 'notification-sound' }]
    const hints = buildPostInstallHints(hooks)
    expect(hints).toHaveLength(2)
    expect(hints.map(h => h.slug)).toEqual(['stop-duplication-check', 'notification-sound'])
  })
})

describe('extractFingerprint', () => {
  it('lit le slug en ligne 2', () => {
    expect(extractFingerprint('#!/usr/bin/env node\n// @hookstack my-hook\nconsole.log(1)')).toBe('my-hook')
  })
  it('retourne null si pas de fingerprint', () => {
    expect(extractFingerprint('#!/usr/bin/env node\nconsole.log(1)')).toBeNull()
  })
  it('retourne null sur contenu vide', () => {
    expect(extractFingerprint('')).toBeNull()
    expect(extractFingerprint(undefined)).toBeNull()
  })
})

describe('findInstalledSlugs', () => {
  it('extrait les slugs des .mjs fingerprintés', () => {
    const files = { 'a.mjs': '#!/usr/bin/env node\n// @hookstack hook-a\n', 'b.mjs': '#!/usr/bin/env node\n// @hookstack hook-b\n' }
    const slugs = findInstalledSlugs('/proj/.claude/hooks', {
      readdirSync: () => Object.keys(files),
      readFileSync: p => files[p.split('/').pop()],
    })
    expect(slugs).toEqual(['hook-a', 'hook-b'])
  })
  it('ignore les fichiers non-.mjs et sans fingerprint', () => {
    const files = { 'a.mjs': '#!/usr/bin/env node\nno fingerprint here\n', 'readme.txt': 'x' }
    const slugs = findInstalledSlugs('/proj/.claude/hooks', {
      readdirSync: () => Object.keys(files),
      readFileSync: p => files[p.split('/').pop()],
    })
    expect(slugs).toEqual([])
  })
  it('retourne [] si le dossier n’existe pas', () => {
    const slugs = findInstalledSlugs('/missing', {
      readdirSync: () => { throw new Error('ENOENT') },
      readFileSync: () => '',
    })
    expect(slugs).toEqual([])
  })
})

describe('detectScriptChanges', () => {
  it('classe en changed si le contenu disque diffère', () => {
    const hooks = [{ slug: 'a', script_path: '.claude/hooks/a.mjs', code_snippet: 'new code' }]
    const { changed, unchanged } = detectScriptChanges(hooks, 'project', '/proj', {
      readFileSync: () => 'old code',
    })
    expect(changed).toEqual(['a'])
    expect(unchanged).toEqual([])
  })
  it('classe en unchanged si le contenu disque est identique', () => {
    const hooks = [{ slug: 'a', script_path: '.claude/hooks/a.mjs', code_snippet: 'same' }]
    const { changed, unchanged } = detectScriptChanges(hooks, 'project', '/proj', {
      readFileSync: () => 'same',
    })
    expect(changed).toEqual([])
    expect(unchanged).toEqual(['a'])
  })
  it('traite un fichier absent comme changed', () => {
    const hooks = [{ slug: 'a', script_path: '.claude/hooks/a.mjs', code_snippet: 'new' }]
    const { changed } = detectScriptChanges(hooks, 'project', '/proj', {
      readFileSync: () => { throw new Error('ENOENT') },
    })
    expect(changed).toEqual(['a'])
  })
  it('ignore les hooks settings-only (sans script)', () => {
    const hooks = [{ slug: 'a' }]
    const { changed, unchanged } = detectScriptChanges(hooks, 'project', '/proj', { readFileSync: () => '' })
    expect(changed).toEqual([])
    expect(unchanged).toEqual([])
  })
})

describe('doUpdateTests', () => {
  it('réécrit seulement les fichiers de test déjà présents', () => {
    const written = {}
    const hooks = [
      { slug: 'has-test', test_snippet: 'test a' },
      { slug: 'no-existing-file', test_snippet: 'test b' },
      { slug: 'no-snippet' },
    ]
    const result = doUpdateTests(hooks, '/proj', {
      existsSync: p => p.endsWith('has-test.test.mjs'),
      writeFileSync: (p, content) => { written[p] = content },
      join: (...parts) => parts.join('/'),
    })
    expect(result.testCount).toBe(1)
    expect(written['/proj/tests/hooks/has-test.test.mjs']).toBe('test a')
    expect(written['/proj/tests/hooks/no-existing-file.test.mjs']).toBeUndefined()
  })
})
