#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import * as p from '@clack/prompts'
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

// ── panel rendering ────────────────────────────────────────────────────────

// Truncate to a visible width then pad — operate on PLAIN text only. Color is
// applied afterwards so ANSI codes never throw off column alignment.
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

// Boolean capability cell: pad the plain "yes"/"no" first, then colorize.
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
  p.intro(pc.bgCyan(pc.black(' hookstack-cli ')))

  const s = p.spinner()
  const isDefault = slugs.length === 0
  s.start(isDefault ? 'Fetching default HookStack…' : `Fetching ${plural(slugs.length, 'hook')}`)
  let data
  try {
    data = await fetchHooks(slugs)
  } catch (e) {
    s.stop(pc.red('Fetch failed'))
    p.cancel(e.message)
    process.exit(1)
  }
  const { hooks } = data
  const notFound = slugs.filter(slug => !hooks.find(h => h.slug === slug))
  s.stop(isDefault
    ? `Default HookStack — ${plural(hooks.length, 'hook')}`
    : `Fetched ${plural(hooks.length, 'hook')}`)
  if (notFound.length) p.log.warn(`Unknown slugs skipped: ${notFound.join(', ')}`)
  if (hooks.length === 0) {
    p.cancel('No hooks to install.')
    process.exit(1)
  }

  if (isDefault) {
    p.log.info(`The default HookStack gives your Claude Code setup ${plural(hooks.length, 'battle-tested hook')} covering security, context, validation and workflow.`)
  }

  const scope = await p.select({
    message: 'Where do you want to install?',
    initialValue: args.scope,
    options: [
      { value: 'project', label: 'This project', hint: './.claude — committed with your repo' },
      { value: 'global', label: 'All my projects', hint: '~/.claude — every project on this machine' },
    ],
  })
  if (p.isCancel(scope)) { p.cancel('Cancelled.'); process.exit(0) }

  const dirs = resolveScopeRoot(scope, { cwd: process.cwd(), home: homedir() })

  p.note(summaryPanel(buildSummaryRows(hooks, { root: dirs.root })), `${plural(hooks.length, 'Hook')} to install`)
  p.note(securityPanel(buildSecurityRows(hooks)), 'Security')

  const ok = await p.confirm({ message: `Install ${plural(hooks.length, 'hook')} into ${scope === 'global' ? '~/.claude' : './.claude'}?` })
  if (p.isCancel(ok) || !ok) { p.cancel('Cancelled.'); process.exit(0) }

  const s2 = p.spinner()
  s2.start('Installing…')
  let result
  try {
    result = doInstall(hooks, dirs, scope, p.log)
  } catch (e) {
    s2.stop(pc.red('Install failed'))
    p.cancel(e.message)
    process.exit(1)
  }
  s2.stop(`Wrote ${plural(result.scriptCount, 'script')} + patched settings.json`)

  p.log.info(`Browse more hooks → ${pc.cyan(`${API_BASE}/#catalogue`)}`)
  p.log.info(`⭐  star us → ${pc.cyan(REPO_URL)}`)
  p.outro(pc.green(`✓ ${plural(result.hookCount, 'hook')} installed — restart Claude Code to activate.`))
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
    --scope <s>       "project" (default) or "global"
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

/* v8 ignore next 3 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
