#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'fs'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pc from 'picocolors'
import * as p from '@clack/prompts'
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

// ── ASCII banner ──────────────────────────────────────────────────────────────

const BANNER = pc.cyan([
  '██╗  ██╗ ██████╗  ██████╗ ██╗  ██╗███████╗████████╗ █████╗  ██████╗██╗  ██╗',
  '██║  ██║██╔═══██╗██╔═══██╗██║ ██╔╝██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝',
  '███████║██║   ██║██║   ██║█████╔╝ ███████╗   ██║   ███████║██║     █████╔╝ ',
  '██╔══██║██║   ██║██║   ██║██╔═██╗ ╚════██║   ██║   ██╔══██║██║     ██╔═██╗ ',
  '██║  ██║╚██████╔╝╚██████╔╝██║  ██╗███████║   ██║   ██║  ██║╚██████╗██║  ██╗',
  '╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝',
].join('\n'))

// ── panel content builders ────────────────────────────────────────────────────

export function summaryPanel(rows) {
  const lines = []
  for (const r of rows) {
    lines.push(pc.cyan(r.path ?? `${r.name} (settings only)`))
    const meta = [
      r.category,
      r.events.join(', ') + (r.blocking ? pc.yellow(' · ⚡ can block') : ''),
      r.matcher ? `matcher: ${r.matcher}` : null,
    ].filter(Boolean).join(pc.dim(' · '))
    lines.push(pc.dim('  ' + meta))
    if (r.source) lines.push(pc.dim(`  source: ${r.source}`))
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

function truncPad(value, width) {
  const s = String(value ?? '')
  return (s.length > width ? s.slice(0, width - 1) + '…' : s).padEnd(width)
}

function capCell(on, width) {
  const text = (on ? 'yes' : 'no').padEnd(width)
  return on ? pc.yellow(text) : pc.dim(text)
}

const SNYK_COLOR = { high: pc.red, medium: pc.yellow, low: pc.cyan, safe: pc.green, unknown: pc.dim }

export function securityPanel(rows) {
  const W = { name: 28, cap: 8, snyk: 10 }
  const header = pc.dim(
    ''.padEnd(W.name) + 'Shell'.padEnd(W.cap) + 'Net'.padEnd(W.cap) +
    'Writes'.padEnd(W.cap) + 'Snyk',
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

// ── install ───────────────────────────────────────────────────────────────────

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

// ── flows ─────────────────────────────────────────────────────────────────────

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

function onCancel() {
  p.cancel('Installation cancelled.')
  process.exit(0)
}

async function interactiveInstall(slugs, args) {
  console.log('\n' + BANNER + '\n')
  p.intro(pc.bold('hooks') + pc.dim(`  Claude Code hook installer  v${VERSION}`))

  // Fetch
  const spin = p.spinner()
  spin.start(slugs.length === 0 ? 'Fetching default HookStack…' : `Fetching ${plural(slugs.length, 'hook')}…`)
  let data
  try {
    data = await fetchHooks(slugs)
  } catch (e) {
    spin.stop(pc.red(`Fetch failed: ${e.message}`), 1)
    process.exit(1)
  }
  const { hooks } = data
  const notFound = slugs.filter(slug => !hooks.find(h => h.slug === slug))
  spin.stop(`Selected ${pc.bold(String(hooks.length))} hook${hooks.length === 1 ? '' : 's'}`)
  if (notFound.length) p.log.warn(`Unknown slugs skipped: ${notFound.join(', ')}`)
  if (hooks.length === 0) { p.cancel('No hooks to install.'); process.exit(1) }

  // Scope
  let scope = args.scope
  const scopeResult = await p.select({
    message: 'Where to install?',
    options: [
      {
        value: 'project',
        label: 'This project',
        hint: './.claude  —  committed with your repo',
      },
      {
        value: 'global',
        label: 'All my projects',
        hint: '~/.claude  —  every project on this machine',
      },
      {
        value: 'copilot',
        label: 'GitHub Copilot project',
        hint: './.claude  —  paths adapted for Copilot',
      },
    ],
    initialValue: scope,
  })
  if (p.isCancel(scopeResult)) return onCancel()
  scope = scopeResult

  const dirs = resolveScopeRoot(scope, { cwd: process.cwd(), home: homedir() })
  const summaryRows = buildSummaryRows(hooks, { root: dirs.root })
  const secRows = buildSecurityRows(hooks)

  // Panels
  p.note(summaryPanel(summaryRows), 'Installation Summary')
  p.note(securityPanel(secRows), 'Security Assessment')

  // Confirm
  const scopeLabel = scope === 'global' ? '~/.claude' : scope === 'copilot' ? './.claude (Copilot mode)' : './.claude'
  const confirmed = await p.confirm({
    message: `Install ${plural(hooks.length, 'hook')} into ${pc.cyan(scopeLabel)}?`,
  })
  if (p.isCancel(confirmed) || !confirmed) return onCancel()

  // Install
  const spin2 = p.spinner()
  spin2.start('Installing…')
  let result
  try {
    result = doInstall(hooks, dirs, scope, { warn: m => p.log.warn(m) })
  } catch (e) {
    spin2.stop(pc.red(`Install failed: ${e.message}`), 1)
    process.exit(1)
  }
  spin2.stop(`Installed ${pc.bold(String(result.hookCount))} hook${result.hookCount === 1 ? '' : 's'}`)

  // Result panel
  const resultLines = [
    pc.green(`✓ ${dirs.settingsPath}`),
    result.scriptCount > 0
      ? pc.green(`✓ ${result.scriptCount} script${result.scriptCount === 1 ? '' : 's'} written to ${dirs.hooksDir}`)
      : null,
    '',
    `Browse more hooks  ${pc.cyan(`${API_BASE}/#catalogue`)}`,
    `⭐  Star us         ${pc.cyan(REPO_URL)}`,
  ].filter(v => v !== null).join('\n')

  p.note(resultLines, 'Resume installation')
  p.outro(pc.green('Done!') + pc.dim("  You've just HookStacked your agent workflow."))
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
