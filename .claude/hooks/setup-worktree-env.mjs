#!/usr/bin/env node
// @hookstack worktree-create-setup-env
// SessionStart : si la session démarre dans un worktree, copie depuis le dépôt principal
// les fichiers d'environnement et secrets locaux. Deux passes :
//   1. Liste statique de fichiers racine connus (multi-écosystème)
//   2. Scan récursif (find, profondeur 4) pour couvrir les monorepos (apps/web/.env…)
import { execSync } from 'node:child_process';
import { existsSync, copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

// Fichiers racine copiés explicitement si présents.
// Couvre Node/Bun, Vite, Next.js, CRA, Python dotenv, Ruby on Rails, direnv, Docker Compose.
const ROOT_FILES = [
  // Dotenv standard — tous frameworks JS/TS/Python
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.test',
  '.env.test.local',
  '.env.staging',
  '.env.staging.local',
  '.env.production',
  '.env.production.local',
  '.env.override',            // convention docker-compose
  // direnv
  '.envrc',
  // Ruby on Rails master key
  'config/master.key',
]

// Répertoires exclus du scan récursif monorepo.
const SKIP_DIRS = [
  'node_modules', '.git', 'dist', 'build', '.next', 'out',
  'coverage', '.turbo', '.cache', '__pycache__', 'target', '.venv', 'venv',
]

/**
 * Scan récursif des sous-répertoires (profondeur 2–4) pour trouver les fichiers
 * `.env*` et `.envrc` dans les structures monorepo (apps/web/.env, packages/api/.env…).
 * Utilise `find` via execSync. Injecté en dépendance pour rester testable.
 */
function defaultScanEnvFiles(dir) {
  const excludes = SKIP_DIRS.map(d => `-not -path "*/${d}/*"`).join(' ')
  const cmd = `find "${dir}" -mindepth 2 -maxdepth 4 -type f \\( -name ".env" -o -name ".env.*" -o -name ".envrc" \\) ${excludes} 2>/dev/null`
  try {
    const out = execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim()
    if (!out) return []
    return out.split('\n').map(abs => abs.slice(dir.length + 1))
  } catch { return [] }
}

export function run({
  exec = defaultExec,
  exists = existsSync,
  copy = copyFileSync,
  mkdir = mkdirSync,
  scanEnvFiles = defaultScanEnvFiles,
} = {}) {
  const worktreeList = exec('git worktree list')
  const mainDir = worktreeList.split('\n')[0]?.split(/\s+/)[0] ?? ''
  const worktreeDir = exec('git rev-parse --show-toplevel')

  if (!mainDir || !worktreeDir || mainDir === worktreeDir) return

  // Fusion liste statique + résultats du scan monorepo (déduplication)
  const candidates = [...ROOT_FILES]
  for (const rel of scanEnvFiles(mainDir)) {
    if (!candidates.includes(rel)) candidates.push(rel)
  }

  for (const rel of candidates) {
    const src = join(mainDir, rel)
    const dst = join(worktreeDir, rel)
    if (exists(src) && !exists(dst)) {
      const dstDir = dirname(dst)
      if (!exists(dstDir)) mkdir(dstDir, { recursive: true })
      copy(src, dst)
      process.stderr.write(`Copié : ${rel} → ${worktreeDir}\n`)
    }
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  readFileSync(0, 'utf8')
  run()
  // SessionStart : stdout vide = aucun contexte ajouté.
}
