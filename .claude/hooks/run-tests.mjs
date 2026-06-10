#!/usr/bin/env node
// Exécute la suite de tests à la fin d'une session (Stop)
import { spawnSync, execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

/** Résout la racine principale du repo (pas le worktree courant). */
function resolveMainRoot(cwd) {
  try {
    const list = execSync('git worktree list', { encoding: 'utf8', cwd, timeout: 5_000 });
    return list.split('\n')[0]?.split(/\s+/)[0] ?? cwd;
  } catch {
    return cwd;
  }
}

// Détecte le runner de tests adapté au projet.
export function detect({ exists = existsSync, readFile = readFileSync, projectDir } = {}) {
  const pkg = join(projectDir, 'package.json');
  if (exists(pkg)) {
    try {
      const scripts = JSON.parse(readFile(pkg, 'utf8')).scripts ?? {};
      if (scripts.test) {
        const mgr = exists(join(projectDir, 'pnpm-lock.yaml')) ? 'pnpm'
          : exists(join(projectDir, 'bun.lockb')) || exists(join(projectDir, 'bun.lock')) ? 'bun'
          : exists(join(projectDir, 'yarn.lock')) ? 'yarn'
          : 'npm';
        // bun test is non-watch by default and doesn't accept --run
        if (mgr === 'bun') return ['bun', ['test']];
        return [mgr, ['test', '--', '--run']];
      }
    } catch {}
  }
  if (exists(join(projectDir, 'pytest.ini')) || exists(join(projectDir, 'pyproject.toml')))
    return ['python', ['-m', 'pytest', '--tb=short', '-q']];
  if (exists(join(projectDir, 'go.mod'))) return ['go', ['test', './...']];
  return null;
}

export function run({
  exists = existsSync,
  readFile = readFileSync,
  spawn = spawnSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  mainRoot = resolveMainRoot(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()),
} = {}) {
  // Dans un worktree secondaire, lancer les tests depuis la racine principale
  // qui contient node_modules.
  const runDir = exists(join(projectDir, 'node_modules')) ? projectDir : mainRoot;
  const runner = detect({ exists, readFile, projectDir: runDir });
  if (!runner) return null;

  const [cmd, args] = runner;
  const result = spawn(cmd, args, {
    cwd: runDir,
    encoding: 'utf8',
    timeout: 120_000,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CI: 'true' },
  });

  const out = (result.stdout ?? '') + (result.stderr ?? '');
  let message = `[run-tests] Exécution : ${cmd} ${args.join(' ')}\n`;
  if (result.status !== 0) {
    message += `[run-tests] ÉCHEC (exit ${result.status})\n${out.slice(-2000)}\n`;
  } else {
    const last = out.split('\n').filter(Boolean).slice(-5).join('\n');
    message += `[run-tests] ✓ Tests passés\n${last}\n`;
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
