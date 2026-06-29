#!/usr/bin/env node
// @hookstack stop-run-tests
// Exécute la suite de tests à la fin d'une session (Stop)
import { spawnSync, execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fichiers purement documentaires/binaires : ne peuvent pas casser la suite de tests.
const DOC_ONLY = /\.(md|mdx|markdown|txt|rst|adoc|svg|png|jpe?g|gif|webp|ico|pdf|lock)$|(^|\/)LICENSE/i;

/** Fichiers modifiés en attente (staged + unstaged + untracked), ou null hors git. */
function defaultChanged(cwd) {
  try {
    const out = execSync('git status --porcelain', { encoding: 'utf8', cwd, timeout: 5_000 });
    return out.split('\n').filter(Boolean).map((l) => {
      const p = l.slice(3);
      return p.includes(' -> ') ? p.split(' -> ').pop() : p;
    });
  } catch {
    return null; // hors dépôt git → ne pas court-circuiter (comportement historique)
  }
}

/** Résout la racine principale du repo (pas le worktree courant). */
function resolveMainRoot(cwd) {
  try {
    const list = execSync('git worktree list', { encoding: 'utf8', cwd, timeout: 5_000 });
    return list.split('\n')[0]?.split(/\s+/)[0] ?? cwd;
  } catch {
    return cwd;
  }
}

// Devine le runner JS depuis le script `test` et les dépendances.
function testRunnerFamily(pkgJson) {
  const scriptText = pkgJson.scripts?.test ?? '';
  const deps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
  if (/\bvitest\b/.test(scriptText) || deps.vitest) return 'vitest';
  if (/\bjest\b/.test(scriptText) || deps.jest) return 'jest';
  return 'unknown';
}

// Détecte le runner de tests adapté au projet.
// `scoped` (git disponible) → ne rejoue que les tests liés aux changements en attente
// pour vitest/jest. Sinon (ou runner inconnu) → suite complète, comme historiquement.
// Python est volontairement absent : le hook dédié `stop-pytest` le couvre (xdist),
// les empiler relancerait pytest deux fois en fin de session.
export function detect({ exists = existsSync, readFile = readFileSync, projectDir, scoped = false } = {}) {
  const pkg = join(projectDir, 'package.json');
  if (exists(pkg)) {
    try {
      const json = JSON.parse(readFile(pkg, 'utf8'));
      const scripts = json.scripts ?? {};
      if (scripts.test) {
        const mgr = exists(join(projectDir, 'pnpm-lock.yaml')) ? 'pnpm'
          : exists(join(projectDir, 'bun.lockb')) || exists(join(projectDir, 'bun.lock')) ? 'bun'
          : exists(join(projectDir, 'yarn.lock')) ? 'yarn'
          : 'npm';
        // bun test is non-watch by default and doesn't accept --run
        if (mgr === 'bun') return ['bun', ['test']];
        const family = testRunnerFamily(json);
        // vitest --changed / jest --onlyChanged se basent eux-mêmes sur git
        if (scoped && family === 'vitest') return [mgr, ['test', '--', '--run', '--changed']];
        if (scoped && family === 'jest') return [mgr, ['test', '--', '--onlyChanged']];
        return [mgr, ['test', '--', '--run']];
      }
    } catch {}
  }
  if (exists(join(projectDir, 'go.mod'))) return ['go', ['test', './...']];
  return null;
}

export function run({
  exists = existsSync,
  readFile = readFileSync,
  spawn = spawnSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  mainRoot = resolveMainRoot(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()),
  changed = defaultChanged(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()),
} = {}) {
  // Rien en attente, ou uniquement des fichiers docs/binaires → relancer toute
  // la suite à chaque fin de session ne sert à rien. (changed === null → hors git,
  // on garde le comportement historique et on lance.)
  if (changed && (changed.length === 0 || changed.every((f) => DOC_ONLY.test(f)))) return null;

  // Dans un worktree secondaire, lancer les tests depuis la racine principale
  // qui contient node_modules.
  const runDir = exists(join(projectDir, 'node_modules')) ? projectDir : mainRoot;
  // Cibler les tests liés aux changements seulement si git est dispo ET si les tests
  // tournent dans le même arbre que les changements. En worktree secondaire (runDir =
  // racine principale), vitest --changed lirait le mauvais git → on garde la suite complète.
  const scoped = Array.isArray(changed) && runDir === projectDir;
  const runner = detect({ exists, readFile, projectDir: runDir, scoped });
  if (!runner) return null;

  const [cmd, args] = runner;
  const result = spawn(cmd, args, {
    cwd: runDir,
    encoding: 'utf8',
    timeout: 300_000,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: 'true' },
  });

  const out = (result.stdout ?? '') + (result.stderr ?? '');
  const affected = args.includes('--changed') || args.includes('--onlyChanged');
  let message = `[run-tests] Exécution : ${cmd} ${args.join(' ')}\n`;
  if (result.status !== 0) {
    message += `[run-tests] ÉCHEC (exit ${result.status})\n${out.slice(-2000)}\n`;
  } else {
    const last = out.split('\n').filter(Boolean).slice(-5).join('\n');
    const ok = affected ? '✓ Tests liés aux changements passés' : '✓ Tests passés';
    message += `[run-tests] ${ok}\n${last}\n`;
  }
  return { runner, status: result.status, message };
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result) {
    process.stderr.write(result.message);
    if (result.status !== 0) process.exit(2);
  }
}
