#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const API_BASE = 'https://claudehooks.vercel.app'
const VERSION = '0.1.0'

function parseArgs(argv) {
  const args = argv.slice(2)
  const result = { command: null, hooks: [], help: false, version: false }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') { result.help = true; continue }
    if (arg === '--version' || arg === '-v') { result.version = true; continue }
    if (arg.startsWith('--hooks=')) {
      result.hooks = arg.slice('--hooks='.length).split(',').filter(Boolean)
      continue
    }
    if (arg === '--hooks' && args[i + 1]) {
      result.hooks = args[++i].split(',').filter(Boolean)
      continue
    }
    if (!result.command) result.command = arg
  }

  return result
}

function mergeHooks(existing, incoming) {
  const merged = JSON.parse(JSON.stringify(existing))
  for (const [event, entries] of Object.entries(incoming)) {
    merged[event] ??= []
    for (const entry of entries) {
      const found = merged[event].find(e => (e.matcher ?? '') === (entry.matcher ?? ''))
      if (found) {
        found.hooks.push(...entry.hooks)
      } else {
        merged[event].push({ ...entry, hooks: [...entry.hooks] })
      }
    }
  }
  return merged
}

async function fetchHooks(slugs) {
  const url = `${API_BASE}/api/hooks?slugs=${slugs.join(',')}`
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`API error ${res.status}: ${body}`)
  }
  return res.json()
}

async function install(slugs, root) {
  console.log(`\nFetching ${slugs.length} hook${slugs.length > 1 ? 's' : ''}…`)

  let data
  try {
    data = await fetchHooks(slugs)
  } catch (e) {
    console.error(`\n✗ Failed to fetch hooks: ${e.message}`)
    process.exit(1)
  }

  const { hooks } = data
  const notFound = slugs.filter(s => !hooks.find(h => h.slug === s))
  if (notFound.length > 0) {
    console.warn(`  ! Unknown slugs (skipped): ${notFound.join(', ')}`)
  }
  if (hooks.length === 0) {
    console.error('\n✗ No hooks to install.')
    process.exit(1)
  }

  const claudeDir = join(root, '.claude')
  const settingsPath = join(claudeDir, 'settings.json')
  const hooksDir = join(claudeDir, 'hooks')

  mkdirSync(claudeDir, { recursive: true })
  mkdirSync(hooksDir, { recursive: true })

  let settings = {}
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
      console.log('  Found existing settings.json — merging…')
    } catch {
      console.warn('  ! Could not parse settings.json — starting fresh')
    }
  }

  const incomingHooks = {}
  for (const hook of hooks) {
    const fragment = hook.config?.hooks
    if (!fragment) continue
    for (const [event, entries] of Object.entries(fragment)) {
      incomingHooks[event] ??= []
      incomingHooks[event].push(...entries)
    }
  }

  settings.hooks = mergeHooks(settings.hooks ?? {}, incomingHooks)
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
  console.log('  ✓ .claude/settings.json updated')

  let scriptCount = 0
  for (const hook of hooks) {
    if (!hook.script_path || !hook.code_snippet) continue
    const dest = join(root, hook.script_path)
    mkdirSync(join(dest, '..'), { recursive: true })
    writeFileSync(dest, hook.code_snippet, 'utf8')
    scriptCount++
    console.log(`  ✓ ${hook.script_path}`)
  }

  console.log(`\n✅ Installed ${hooks.length} hook${hooks.length > 1 ? 's' : ''}${scriptCount > 0 ? ` + ${scriptCount} script${scriptCount > 1 ? 's' : ''}` : ''}.`)
  console.log('   Restart Claude Code to activate.\n')
}

async function main() {
  const { command, hooks, help, version } = parseArgs(process.argv)

  if (version) {
    console.log(VERSION)
    return
  }

  if (help || (!command && hooks.length === 0)) {
    console.log(`
  hookstack — Claude Code hook installer

  Usage:
    npx hookstack-cli-cli install --hooks=<slug1>,<slug2>,...

  Options:
    --hooks <slugs>   Comma-separated list of hook slugs
    --version, -v     Show version
    --help, -h        Show this help

  Browse hooks at https://claudehooks.vercel.app
`)
    return
  }

  if (command === 'install' || command === null) {
    if (hooks.length === 0) {
      console.error('✗ No hooks specified. Use --hooks=<slug1>,<slug2>')
      console.error('  Browse hooks at https://claudehooks.vercel.app')
      process.exit(1)
    }
    await install(hooks, process.cwd())
    return
  }

  console.error(`✗ Unknown command: ${command}`)
  console.error('  Run --help for usage.')
  process.exit(1)
}

main()
