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
      if (scripts.test) return ['pnpm', ['test', '--run']];
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
