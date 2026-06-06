#!/usr/bin/env node
// Exécute la suite de tests à la fin d'une session (Stop)
import { spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

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
        // pnpm 10+ avec pnpm-workspace.yaml (même sans packages:) traite le répertoire
        // comme une racine workspace et fait échouer `pnpm test` avec "packages field
        // missing or empty". On bypass pnpm et on appelle le binaire local directement.
        if (mgr === 'pnpm' && exists(join(projectDir, 'pnpm-workspace.yaml'))) {
          const parts = scripts.test.trim().split(/\s+/).filter(Boolean);
          const bin = parts[0];                 // ex. 'vitest', 'jest'
          const args = parts.slice(1);          // ex. ['run']
          const binPath = join(projectDir, 'node_modules', '.bin', bin);
          if (bin && exists(binPath)) {
            // Ajoute --run si vitest n'est pas déjà en mode non-watch
            const needsRun = bin === 'vitest' && !args.includes('run') && !args.includes('--run');
            return [binPath, needsRun ? [...args, '--run'] : args];
          }
        }
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
} = {}) {
  const runner = detect({ exists, readFile, projectDir });
  if (!runner) return null;

  const [cmd, args] = runner;
  const result = spawn(cmd, args, {
    cwd: projectDir,
    encoding: 'utf8',
    timeout: 120_000,
    stdio: ['ignore', 'pipe', 'pipe'],
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
