#!/usr/bin/env node
// Scans every hook's source with Snyk Code (SAST) and writes per-hook severity
// counts into registry.json (implementation.security.snyk). Meant to run in CI
// with SNYK_TOKEN set — never on an end user's machine. See CLAUDE.md "Sécurité".
//
//   node .claude/scan-snyk.mjs            # scan + write registry.json
//   node .claude/scan-snyk.mjs --dry-run  # scan + print, no write
//
// The scan happens our side so `npx hookstack-cli` stays token-free for users.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs'
import { execFileSync } from 'child_process'
import { tmpdir } from 'os'
import { join, basename } from 'path'
import { fileURLToPath } from 'url'

const REGISTRY_PATH = new URL('../registry/registry.json', import.meta.url)

// SARIF level → Snyk severity bucket.
const LEVEL_TO_SEVERITY = { error: 'high', warning: 'medium', note: 'low' }

// Parse Snyk Code SARIF output into { '<file>.mjs': { high, medium, low } }.
// Pure: no I/O, unit-tested.
export function parseSnykFindings(sarif) {
  const counts = {}
  const bump = (file, sev) => {
    counts[file] ??= { high: 0, medium: 0, low: 0 }
    counts[file][sev] += 1
  }
  for (const run of sarif?.runs ?? []) {
    for (const result of run.results ?? []) {
      const sev = LEVEL_TO_SEVERITY[result.level] ?? 'low'
      for (const loc of result.locations ?? []) {
        const uri = loc?.physicalLocation?.artifactLocation?.uri
        if (uri) bump(basename(uri), sev)
      }
    }
  }
  return counts
}

// Maps file-keyed counts back to hook slugs, ensuring every scanned hook gets a
// record (zero findings → a clean {0,0,0}, which the CLI renders as "Safe").
export function attachVerdicts(hooks, fileCounts, scannedAt) {
  const updated = []
  for (const hook of hooks) {
    if (!hook.implementation?.code_snippet) continue
    const key = `${hook.slug}.mjs`
    const found = fileCounts[key] ?? { high: 0, medium: 0, low: 0 }
    hook.implementation.security ??= {}
    hook.implementation.security.snyk = { ...found, scannedAt }
    updated.push(hook.slug)
  }
  return updated
}

function readRegistry() {
  const raw = readFileSync(REGISTRY_PATH, 'utf8')
  const data = JSON.parse(raw)
  const hooks = Array.isArray(data) ? data : data.hooks
  return { data, hooks }
}

function runSnyk(dir) {
  try {
    const out = execFileSync('snyk', ['code', 'test', dir, '--sarif'], {
      encoding: 'utf8',
      timeout: 300_000,
      maxBuffer: 64 * 1024 * 1024,
    })
    return { sarif: JSON.parse(out), code: 0 }
  } catch (e) {
    // Exit 1 = issues found (still valid SARIF on stdout). Exit 3 = no supported
    // files. ENOENT = snyk not installed. Anything else = real error.
    if (e.code === 'ENOENT') {
      console.warn('! snyk CLI not found — skipping (install snyk + set SNYK_TOKEN in CI).')
      process.exit(0)
    }
    if (e.status === 1 && typeof e.stdout === 'string') {
      try { return { sarif: JSON.parse(e.stdout), code: 1 } } catch { /* fall through */ }
    }
    if (e.status === 3) {
      console.warn('! snyk found no supported files to scan.')
      process.exit(0)
    }
    console.error(`✗ snyk code test failed (exit ${e.status ?? '?'}): ${String(e.stderr || e.message).slice(0, 500)}`)
    process.exit(1)
  }
}

function main(argv) {
  const dryRun = argv.includes('--dry-run')
  const { data, hooks } = readRegistry()

  const tmp = mkdtempSync(join(tmpdir(), 'hookstack-snyk-'))
  try {
    let written = 0
    for (const hook of hooks) {
      const snippet = hook.implementation?.code_snippet
      if (!snippet) continue
      writeFileSync(join(tmp, `${hook.slug}.mjs`), snippet, 'utf8')
      written++
    }
    if (written === 0) {
      console.warn('! No hooks with code_snippet to scan.')
      return
    }
    console.log(`Scanning ${written} hooks with Snyk Code…`)

    const { sarif } = runSnyk(tmp)
    const fileCounts = parseSnykFindings(sarif)
    const scannedAt = new Date().toISOString()
    const updated = attachVerdicts(hooks, fileCounts, scannedAt)

    const flagged = Object.entries(fileCounts).filter(([, c]) => c.high || c.medium || c.low)
    console.log(`✓ Scanned ${updated.length} hooks — ${flagged.length} with findings.`)
    for (const [file, c] of flagged) {
      console.log(`   ${file}: ${c.high} high · ${c.medium} medium · ${c.low} low`)
    }

    if (dryRun) {
      console.log('\n(dry-run) registry.json not written.')
      return
    }
    writeFileSync(REGISTRY_PATH, `${JSON.stringify(data, null, 2)}\n`)
    console.log('✓ registry.json updated.')
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2))
}
