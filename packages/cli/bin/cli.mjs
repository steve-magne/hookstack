#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'fs'
import { createInterface } from 'readline'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pc from 'picocolors'
import {
  parseArgs,
  resolveScopeRoot,
  mergeHooks,
  assertSafeTarget,
  collectIncomingHooks,
  buildSummaryRows,
  buildSecurityRows,
} from './core.mjs'

const API_BASE = process.env.HOOKSTACK_API_BASE || 'https://hookstack.vercel.app'
const REPO_URL = 'github.com/steve-magne/hookstack'
const __dirname = dirname(fileURLToPath(import.meta.url))
const VERSION = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8')).version

async function fetchHooks(slugs) {
  const url = slugs.length === 0
    ? `${API_BASE}/api/hooks`
    : `${API_BASE}/api/hooks?slugs=${slugs.map(encodeURIComponent).join(',')}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${body}`)
  }
  return res.json()
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(question, a => { rl.close(); resolve(a.trim()) }))
}

// ── panel rendering ────────────────────────────────────────────────────────

function truncPad(value, width) {
  const s = String(value ?? '')
  return (s.length > width ? s.slice(0, width - 1) + '…' : s).padEnd(width)
}

export function summaryPanel(rows) {
  const lines = []
  for (const r of rows) {
    lines.push(pc.cyan(r.path ?? `${r.name} (settings only)`))
    const meta = [
      r.category,
      r.events.join(', ') + (r.blocking ? pc.yellow(' · can block') : ''),
      r.matcher ? `matcher: ${r.matcher}` : null,
    ].filter(Boolean).join(pc.dim(' · '))
    lines.push('  ' + pc.dim(meta))
    if (r.source) lines.push('  ' + pc.dim(`source: ${r.source}`))
  }
  return lines.join('\n')
}

function capCell(on, width) {
  const text = (on ? 'yes' : 'no').padEnd(width)
  return on ? pc.yellow(text) : pc.dim(text)
}

const SNYK_COLOR = { high: pc.red, medium: pc.yellow, low: pc.cyan, safe: pc.green, unknown: pc.dim }

export function securityPanel(rows) {
  const W = { name: 26, cap: 8, snyk: 10 }
  const header = pc.dim(
    ''.padEnd(W.name) + 'Shell'.padEnd(W.cap) + 'Net'.padEnd(W.cap) +
    'Writes'.padEnd(W.cap) + 'Snyk'.padEnd(W.snyk),
  )
  const body = rows.map(r =>
    truncPad(r.name, W.name) +
    capCell(r.shell, W.cap) +
    capCell(r.network, W.cap) +
    capCell(r.fsWrite, W.cap) +
    (SNYK_COLOR[r.snyk.level] ?? pc.dim)(truncPad(r.snyk.label, W.snyk)),
  )
  const anyUnknown = rows.some(r => r.snyk.level === 'unknown')
  const footer = [
    '',
    pc.dim('Shell = runs commands · Net = network access · Writes = filesystem writes'),
    anyUnknown ? pc.dim('Snyk "—" = not scanned yet') : null,
    pc.dim(`Details: ${API_BASE}/hook/<slug>`),
  ].filter(v => v !== null).join('\n')
  return [header, ...body, footer].join('\n')
}

// ── install ──────────────────────────────────────────────────────────────

function doInstall(hooks, dirs, scope, log) {
  mkdirSync(dirs.claudeDir, { recursive: true })
  mkdirSync(dirs.hooksDir, { recursive: true })

  let settings = {}
  if (existsSync(dirs.settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(dirs.settingsPath, 'utf8'))
    } catch {
      log.warn('Could not parse existing settings.json — starting fresh')
    }
  }

  const incoming = collectIncomingHooks(hooks, { scope, globalRoot: dirs.root })
  settings.hooks = mergeHooks(settings.hooks ?? {}, incoming)
  writeFileSync(dirs.settingsPath, JSON.stringify(settings, null, 2) + '\n')

  let scriptCount = 0
  for (const hook of hooks) {
    if (!hook.script_path || !hook.code_snippet) continue
    assertSafeTarget(dirs.root, hook.script_path)
    const dest = join(dirs.root, hook.script_path)
    mkdirSync(join(dest, '..'), { recursive: true })
    writeFileSync(dest, hook.code_snippet, 'utf8')
    scriptCount++
  }

  return { hookCount: hooks.length, scriptCount }
}

// ── flows ──────────────────────────────────────────────────────────────────

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

async function interactiveInstall(slugs, args) {
  const isDefault = slugs.length === 0
  console.log(pc.bgCyan(pc.black(' hookstack-cli ')))
  console.log(isDefault ? '\nFetching default HookStack…' : `\nFetching ${plural(slugs.length, 'hook')}…`)

  let data
  try {
    data = await fetchHooks(slugs)
  } catch (e) {
    console.error(pc.red(`\n✗ Fetch failed: ${e.message}`))
    process.exit(1)
  }
  const { hooks } = data
  const notFound = slugs.filter(slug => !hooks.find(h => h.slug === slug))
  console.log(isDefault
    ? `✓ Default HookStack — ${plural(hooks.length, 'hook')}`
    : `✓ Fetched ${plural(hooks.length, 'hook')}`)
  if (notFound.length) console.warn(`  ! Unknown slugs skipped: ${notFound.join(', ')}`)
  if (hooks.length === 0) {
    console.error('\n✗ No hooks to install.')
    process.exit(1)
  }

  // Scope selection
  let scope = args.scope
  console.log('\n  Where to install?')
  console.log(`  ${pc.cyan('1')}  This project              ${pc.dim('./.claude — committed with your repo')}`)
  console.log(`  ${pc.cyan('2')}  All my projects           ${pc.dim('~/.claude — every project on this machine')}`)
  console.log(`  ${pc.cyan('3')}  This GitHub Copilot project  ${pc.dim('./.claude — settings.json adapted, committed with your repo')}`)
  const defaultChoice = scope === 'global' ? '2' : scope === 'copilot' ? '3' : '1'
  const scopeAnswer = await ask(`  → [${defaultChoice}]: `)
  if (scopeAnswer === '2' || scopeAnswer === 'global') scope = 'global'
  else if (scopeAnswer === '3' || scopeAnswer === 'copilot') scope = 'copilot'
  else if (scopeAnswer === 'q') { console.log('Cancelled.'); process.exit(0) }
  else scope = 'project'

  const dirs = resolveScopeRoot(scope, { cwd: process.cwd(), home: homedir() })

  console.log(`\n  ${pc.bold(`${plural(hooks.length, 'Hook')} to install`)}`)
  console.log(summaryPanel(buildSummaryRows(hooks, { root: dirs.root })))
  console.log(`\n  ${pc.bold('Security')}`)
  console.log(securityPanel(buildSecurityRows(hooks)))

  const scopeLabel = scope === 'global' ? '~/.claude' : scope === 'copilot' ? './.claude (GitHub Copilot mode)' : './.claude'
  const confirmAnswer = await ask(`\n  Install ${plural(hooks.length, 'hook')} into ${scopeLabel}? [Y/n]: `)
  if (confirmAnswer.toLowerCase() === 'n' || confirmAnswer.toLowerCase() === 'no') {
    console.log('Cancelled.')
    process.exit(0)
  }

  console.log('\nInstalling…')
  let result
  try {
    result = doInstall(hooks, dirs, scope, { warn: m => console.warn(`  ! ${m}`) })
  } catch (e) {
    console.error(pc.red(`\n✗ Install failed: ${e.message}`))
    process.exit(1)
  }

  console.log(`  ✓ ${dirs.settingsPath}`)
  console.log(`\n  Browse more hooks → ${pc.cyan(`${API_BASE}/#catalogue`)}`)
  console.log(`  ⭐  star us → ${pc.cyan(REPO_URL)}`)
  console.log(pc.green(`\n✓ ${plural(result.hookCount, 'hook')} installed — restart Claude Code to activate.\n`))
}

async function directInstall(slugs, args) {
  const isDefault = slugs.length === 0
  console.log(isDefault ? '\nInstalling default HookStack…' : `\nFetching ${plural(slugs.length, 'hook')}…`)
  let data
  try {
    data = await fetchHooks(slugs)
  } catch (e) {
    console.error(`\n✗ Failed: ${e.message}`)
    process.exit(1)
  }
  const { hooks } = data
  const notFound = slugs.filter(slug => !hooks.find(h => h.slug === slug))
  if (notFound.length) console.warn(`  ! Unknown slugs (skipped): ${notFound.join(', ')}`)
  if (hooks.length === 0) {
    console.error('\n✗ No hooks to install.')
    process.exit(1)
  }
  const dirs = resolveScopeRoot(args.scope, { cwd: process.cwd(), home: homedir() })
  const log = { warn: m => console.warn(`  ! ${m}`) }
  const result = doInstall(hooks, dirs, args.scope, log)
  console.log(`  ✓ ${dirs.settingsPath}`)
  console.log(`\n✅ ${plural(result.hookCount, 'hook')} installed · star us → ${REPO_URL}`)
  console.log('   Restart Claude Code to activate.\n')
}

const HELP = `
  hookstack — Claude Code hook installer

  Usage:
    npx hookstack-cli@latest install              # install the default HookStack
    npx hookstack-cli@latest install --hooks=<slug1>,<slug2>,...  # custom selection

  Options:
    --hooks <slugs>   Comma-separated list of hook slugs (omit for default set)
    --global, -g      Install into ~/.claude instead of ./.claude
    --copilot         Install into ./.claude with paths adapted for GitHub Copilot
    --scope <s>       "project" (default), "global", or "copilot"
    --yes, -y         Skip prompts (non-interactive install)
    --version, -v     Show version
    --help, -h        Show this help

  Browse hooks at https://hookstack.vercel.app
`

async function main() {
  const args = parseArgs(process.argv)

  if (args.version) { console.log(VERSION); return }
  if (args.help) { console.log(HELP); return }

  const command = args.command ?? 'install'
  if (command !== 'install') {
    console.error(`✗ Unknown command: ${command}`)
    console.error('  Run --help for usage.')
    process.exit(1)
  }

  const interactive = Boolean(process.stdout.isTTY) && !args.yes
  if (interactive) await interactiveInstall(args.hooks, args)
  else await directInstall(args.hooks, args)
}

/* v8 ignore next 4 */
const _argv1 = (() => { try { return realpathSync(process.argv[1]) } catch { return process.argv[1] } })()
if (_argv1 === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(pc.red(`\n✗ ${err.message || err}`)); process.exit(1) })
}
