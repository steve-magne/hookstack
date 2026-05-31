#!/usr/bin/env node
// Exécute la suite de tests à la fin d'une session (Stop)
import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function detect() {
  const pkg = join(projectDir, 'package.json');
  if (existsSync(pkg)) {
    try {
      const scripts = JSON.parse(readFileSync(pkg, 'utf8')).scripts ?? {};
      if (scripts.test) return ['pnpm', ['test', '--run']];
    } catch {}
  }
  if (existsSync(join(projectDir, 'pytest.ini')) || existsSync(join(projectDir, 'pyproject.toml')))
    return ['python', ['-m', 'pytest', '--tb=short', '-q']];
  if (existsSync(join(projectDir, 'go.mod')))
    return ['go', ['test', './...']];
  return null;
}

const runner = detect();
if (!runner) process.exit(0);

const [cmd, args] = runner;
process.stderr.write(`[run-tests] Exécution : ${cmd} ${args.join(' ')}\n`);

const result = spawnSync(cmd, args, {
  cwd: projectDir,
  encoding: 'utf8',
  timeout: 120_000,
  stdio: ['ignore', 'pipe', 'pipe'],
});

const out = (result.stdout ?? '') + (result.stderr ?? '');
if (result.status !== 0) {
  process.stderr.write(`[run-tests] ÉCHEC (exit ${result.status})\n${out.slice(-2000)}\n`);
} else {
  const last = out.split('\n').filter(Boolean).slice(-5).join('\n');
  process.stderr.write(`[run-tests] ✓ Tests passés\n${last}\n`);
}
