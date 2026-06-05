// Pure, dependency-free logic for the hookstack CLI.
// Everything here is side-effect free and unit-tested in isolation; the
// interactive I/O (clack/picocolors, fs, fetch) lives in cli.mjs. This mirrors
// the project's "pure run() + thin I/O guard" hook convention.
import { join, resolve, relative, isAbsolute } from 'path'

const BLOCKING_EVENTS = new Set([
  'PreToolUse',
  'UserPromptSubmit',
  'PreCompact',
  'PermissionRequest',
])

// Matches $CLAUDE_PROJECT_DIR and ${CLAUDE_PROJECT_DIR}.
export const PROJECT_DIR_RE = /\$\{?CLAUDE_PROJECT_DIR\}?/g

function splitList(raw) {
  return raw.split(',').map(s => s.trim()).filter(Boolean)
}

export function parseArgs(argv) {
  const args = argv.slice(2)
  const result = {
    command: null,
    hooks: [],
    help: false,
    version: false,
    scope: 'project',
    yes: false,
    withTests: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') { result.help = true; continue }
    if (arg === '--version' || arg === '-v') { result.version = true; continue }
    if (arg === '--yes' || arg === '-y') { result.yes = true; continue }
    if (arg === '--with-tests') { result.withTests = true; continue }
    if (arg === '--global' || arg === '-g') { result.scope = 'global'; continue }
    if (arg === '--project') { result.scope = 'project'; continue }
    if (arg === '--copilot') { result.scope = 'copilot'; continue }
    if (arg.startsWith('--scope=')) {
      const v = arg.slice('--scope='.length)
      if (v === 'global' || v === 'project') result.scope = v
      continue
    }
    if (arg.startsWith('--hooks=')) { result.hooks = splitList(arg.slice('--hooks='.length)); continue }
    if (arg === '--hooks' && args[i + 1]) { result.hooks = splitList(args[++i]); continue }
    if (!result.command) result.command = arg
  }

  return result
}

// Resolves where .claude/ lives for a given scope. Project → cwd; global → home.
export function resolveScopeRoot(scope, { cwd, home }) {
  const root = scope === 'global' ? home : cwd
  const claudeDir = join(root, '.claude')
  return {
    scope,
    root,
    claudeDir,
    hooksDir: join(claudeDir, 'hooks'),
    settingsPath: join(claudeDir, 'settings.json'),
  }
}

// Rejects target paths that would escape destDir, even if the registry JSON was
// tampered with. Adapted from hyperframes' installer.assertSafeTarget.
export function assertSafeTarget(destDir, target) {
  if (isAbsolute(target)) {
    throw new Error(`Unsafe path "${target}": absolute paths are not allowed.`)
  }
  if (/(^|[/\\])\.\.([/\\]|$)/.test(target)) {
    throw new Error(`Unsafe path "${target}": ".." segments are not allowed.`)
  }
  if (/^[A-Za-z]:[/\\]/.test(target)) {
    throw new Error(`Unsafe path "${target}": Windows drive letters are not allowed.`)
  }
  const resolved = resolve(destDir, target)
  const rel = relative(resolve(destDir), resolved)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error(`Unsafe path "${target}": resolves outside ${destDir}.`)
  }
}

// Merges incoming settings.json hook fragments into existing ones, grouping by
// event then by matcher (no overwrite). Same contract as src/lib/mergeConfig.
export function mergeHooks(existing, incoming) {
  const merged = structuredClone(existing)
  for (const [event, entries] of Object.entries(incoming)) {
    merged[event] ??= []
    for (const entry of entries) {
      const found = merged[event].find(e => (e.matcher ?? '') === (entry.matcher ?? ''))
      if (found) found.hooks.push(...entry.hooks)
      else merged[event].push({ ...entry, hooks: [...entry.hooks] })
    }
  }
  return merged
}

// Gathers the hook fragments from an API hook list into a single event→entries
// map. For global scope, rewrites $CLAUDE_PROJECT_DIR to the absolute global
// root so commands resolve outside any project. For copilot scope, strips
// $CLAUDE_PROJECT_DIR/ so paths become relative (GitHub Copilot compatible).
export function collectIncomingHooks(hooks, { scope = 'project', globalRoot } = {}) {
  const incoming = {}
  for (const hook of hooks) {
    const fragment = hook.config?.hooks
    if (!fragment) continue
    for (const [event, entries] of Object.entries(fragment)) {
      incoming[event] ??= []
      for (const entry of entries) {
        incoming[event].push({
          ...entry,
          hooks: entry.hooks.map(h => {
            if (!h.command || typeof h.command !== 'string') return h
            if (scope === 'global' && globalRoot)
              return { ...h, command: h.command.replace(PROJECT_DIR_RE, globalRoot) }
            if (scope === 'copilot')
              return { ...h, command: h.command.replace(/\$\{?CLAUDE_PROJECT_DIR\}?\//g, '') }
            return h
          }),
        })
      }
    }
  }
  return incoming
}

export function isBlockingEvent(event) {
  return BLOCKING_EVENTS.has(event)
}

// Honest static read of what a hook's code does — no external service.
export function analyzeSecurity(codeSnippet) {
  const code = codeSnippet ?? ''
  const has = (...patterns) => patterns.some(re => re.test(code))
  return {
    shell: has(/\b(execSync|execFileSync|execFile|exec|spawnSync|spawn|fork)\s*\(/, /child_process/),
    network: has(
      /\bfetch\s*\(/,
      /['"]node:(https?|net|dgram|dns)['"]/,
      /\brequire\(\s*['"](https?|net|dgram|dns)['"]\s*\)/,
      /\bfrom\s+['"](node:)?https?['"]/,
    ),
    fsWrite: has(
      /\b(writeFileSync|writeFile|appendFileSync|appendFile|rmSync|unlinkSync|unlink|mkdirSync|renameSync|rename|rmdirSync|cpSync)\s*\(/,
    ),
  }
}

// Maps a stored Snyk scan ({high, medium, low}) to a short verdict label.
// Returns the "unknown" placeholder when no scan data is available yet.
export function snykVerdict(snyk) {
  if (!snyk || typeof snyk !== 'object') return { label: '—', level: 'unknown' }
  const { high = 0, medium = 0, low = 0 } = snyk
  if (high > 0) return { label: 'High Risk', level: 'high' }
  if (medium > 0) return { label: 'Med Risk', level: 'medium' }
  if (low > 0) return { label: 'Low Risk', level: 'low' }
  return { label: 'Safe', level: 'safe' }
}

// Maps a stored CodeQL scan to a short verdict label.
export function codeqlVerdict(codeql) {
  if (!codeql || typeof codeql !== 'object') return { label: '—', level: 'unknown' }
  const { critical = 0, high = 0, medium = 0, low = 0 } = codeql
  if (critical > 0 || high > 0) return { label: 'High Risk', level: 'high' }
  if (medium > 0) return { label: 'Med Risk', level: 'medium' }
  if (low > 0) return { label: 'Low Risk', level: 'low' }
  return { label: 'Safe', level: 'safe' }
}

export function shortRepo(url) {
  if (!url) return null
  return String(url)
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
}

// Writes test files for installed hooks into <projectRoot>/tests/hooks/.
// Only hooks that have a test_snippet are written; others are silently skipped.
export function doInstallTests(hooks, projectRoot, { mkdirSync, writeFileSync, join }) {
  const testsDir = join(projectRoot, 'tests', 'hooks')
  mkdirSync(testsDir, { recursive: true })
  let testCount = 0
  for (const hook of hooks) {
    if (!hook.test_snippet) continue
    const dest = join(testsDir, `${hook.slug}.test.mjs`)
    writeFileSync(dest, hook.test_snippet, 'utf8')
    testCount++
  }
  return { testCount }
}

// Display rows for the "Installation Summary" panel.
export function buildSummaryRows(hooks, { root }) {
  return hooks.map(h => {
    const events = h.config?.hooks ? Object.keys(h.config.hooks) : []
    return {
      slug: h.slug,
      name: h.name ?? h.slug,
      path: h.script_path ? join(root, h.script_path) : null,
      category: h.category ?? null,
      events,
      blocking: events.some(isBlockingEvent),
      matcher: h.trigger ?? null,
      source: shortRepo(h.community_examples?.[0]?.repo),
    }
  })
}

// Display rows for the "Installation Summary" panel: description + static capabilities + verdicts.
export function buildSecurityRows(hooks) {
  return hooks.map(h => ({
    slug: h.slug,
    name: h.name ?? h.slug,
    benefit: h.benefit ?? null,
    ...analyzeSecurity(h.code_snippet),
    snyk: snykVerdict(h.security?.snyk),
    codeql: codeqlVerdict(h.security?.codeql),
  }))
}
