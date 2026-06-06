#!/usr/bin/env node
// SessionStart : si la session démarre dans un worktree, copie depuis le dépôt principal
// les fichiers ignorés par git qui ressemblent à des configs locales (env, secrets…).
// La liste n'est pas codée en dur : elle est déduite dynamiquement du .gitignore.
import { execSync } from 'child_process';
import { existsSync, copyFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

// Patterns considérés comme artefacts générés — jamais copiés dans le worktree.
// On filtre aussi tout pattern contenant '/' (sous-chemin, ex. .vscode/*).
const ARTIFACT_DENY = [
  /^node_modules\b/i,
  /^dist\b/i,
  /^dist-ssr\b/i,
  /^build\b/i,
  /^\.next\b/i,
  /^out\b/i,
  /^coverage\b/i,
  /^\.cache\b/i,
  /^\.turbo\b/i,
  /^\.vercel\b/i,
  /^__pycache__/i,
  /^target\b/i,
  /^logs\b/i,
  /\.log(\*.*)?$/,           // *.log, npm-debug.log*, yarn-error.log*…
  /debug\.log|error\.log/,
  /\.(tsbuildinfo|map|pyc|class|o|a|so|dll|exe|wasm|jar)$/,
  /^\.DS_Store$/,
  /\.(suo|ntvs|njsproj|sln)$/,
  /\.sw[a-z]$/,              // fichiers swap Vim *.sw?
  /\//,                       // sous-chemins (.vscode/*, .claude/data/…)
];

function isArtifact(pattern) {
  return ARTIFACT_DENY.some(re => re.test(pattern));
}

// Convertit un pattern gitignore (glob simple) en RegExp.
function patternToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

// Résout un pattern vers la liste des noms de fichiers réels qu'il couvre dans mainDir.
function resolvePattern(pattern, mainDir, { exists, readdir }) {
  if (!pattern.includes('*') && !pattern.includes('?')) {
    return exists(join(mainDir, pattern)) ? [pattern] : [];
  }
  try {
    const re = patternToRegex(pattern);
    return readdir(mainDir).filter(f => re.test(f));
  } catch { return []; }
}

export function run({
  exec = defaultExec,
  exists = existsSync,
  copy = copyFileSync,
  readFile = (p) => readFileSync(p, 'utf8'),
  readdir = (p) => readdirSync(p),
} = {}) {
  const worktreeList = exec('git worktree list');
  const mainDir = worktreeList.split('\n')[0]?.split(/\s+/)[0] ?? '';
  const worktreeDir = exec('git rev-parse --show-toplevel');

  if (!mainDir || !worktreeDir || mainDir === worktreeDir) return;

  let gitignoreContent;
  try { gitignoreContent = readFile(join(mainDir, '.gitignore')); }
  catch { return; } // pas de .gitignore → rien à faire

  // Patterns retenus : non vides, non commentaires, non négations, non répertoires, non artefacts
  const patterns = gitignoreContent
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && !l.startsWith('!') && !l.endsWith('/'))
    .filter(l => !isArtifact(l));

  // Résolution et déduplication
  const files = [...new Set(patterns.flatMap(p => resolvePattern(p, mainDir, { exists, readdir })))];

  for (const file of files) {
    const src = join(mainDir, file);
    const dst = join(worktreeDir, file);
    if (exists(src) && !exists(dst)) {
      copy(src, dst);
      process.stderr.write(`Copié : ${file} → ${worktreeDir}\n`);
    }
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  readFileSync(0, 'utf8');
  run();
  // SessionStart : pas de stdout obligatoire (stdout vide = aucun contexte ajouté).
}
