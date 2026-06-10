#!/usr/bin/env node
// Exécute pytest à la fin d'une session Python (Stop)
import { existsSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const PYTHON_MARKERS = ['pyproject.toml', 'setup.py', 'pytest.ini', 'setup.cfg'];

export function run({
  exists = existsSync,
  spawn = spawnSync,
  cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  const isPython = PYTHON_MARKERS.some(f => exists(`${cwd}/${f}`));
  if (!isPython) return null;

  const result = spawn('uv', ['run', 'pytest', '--tb=short', '-q'], {
    encoding: 'utf8',
    timeout: 120_000,
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const out = (result.stdout ?? '') + (result.stderr ?? '');
  const status = result.status ?? 1;
  const message = status !== 0
    ? `[pytest] ÉCHEC (exit ${status})\n${out.slice(-2000)}\n`
    : `[pytest] ✓ Tests passés\n${out.split('\n').filter(Boolean).slice(-5).join('\n')}\n`;

  return { status, message };
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result) {
    process.stderr.write(result.message);
    if (result.status !== 0) process.exit(2);
  }
}
