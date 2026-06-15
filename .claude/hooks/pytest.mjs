#!/usr/bin/env node
// @hookstack stop-pytest
// Exécute pytest à la fin d'une session Python (Stop)
import { existsSync } from 'fs';
import { spawnSync, execSync } from 'child_process';
import { fileURLToPath } from 'url';

const PYTHON_MARKERS = ['pyproject.toml', 'setup.py', 'pytest.ini', 'setup.cfg'];
const PY = /\.py$/;
const PY_CFG = /(^|\/)(pyproject\.toml|pytest\.ini|setup\.cfg|setup\.py)$/;

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

export function run({
  exists = existsSync,
  spawn = spawnSync,
  cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  changed = defaultChanged(process.env.CLAUDE_PROJECT_DIR ?? process.cwd()),
} = {}) {
  const isPython = PYTHON_MARKERS.some(f => exists(`${cwd}/${f}`));
  if (!isPython) return null;

  // Aucun .py (ni config pytest) modifié → inutile de relancer toute la suite.
  if (changed && !changed.some((f) => PY.test(f) || PY_CFG.test(f))) return null;

  const hasXdist = spawn('uv', ['run', 'python', '-c', 'import xdist'], {
    encoding: 'utf8',
    timeout: 10_000,
    cwd,
    stdio: 'ignore',
  }).status === 0;

  const pytestArgs = hasXdist
    ? ['run', 'pytest', '-n', 'auto', '--tb=short', '-q']
    : ['run', 'pytest', '--tb=short', '-q'];

  const result = spawn('uv', pytestArgs, {
    encoding: 'utf8',
    timeout: 300_000,
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
