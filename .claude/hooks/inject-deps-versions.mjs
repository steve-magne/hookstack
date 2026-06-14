#!/usr/bin/env node
// Injecte les versions réelles des dépendances dans chaque prompt (UserPromptSubmit)
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { join } from 'path';

const MAX_ENTRIES = 60; // borne le coût en tokens

function parsePackageJson(raw) {
  let pkg;
  try { pkg = JSON.parse(raw); } catch { return []; }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  return Object.entries(deps).map(([name, version]) => `${name}@${version}`);
}

// Extraction best-effort des dépendances pyproject (PEP 621 [project] et Poetry).
function parsePyproject(raw) {
  const out = [];
  const block = raw.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
  if (block) {
    for (const m of block[1].matchAll(/["']([^"']+)["']/g)) out.push(m[1].trim());
  }
  return out;
}

export function run({ cwd = process.cwd(), readFile = readFileSync, fileExists = existsSync } = {}) {
  const entries = [];
  const pkgPath = join(cwd, 'package.json');
  if (fileExists(pkgPath)) {
    try { entries.push(...parsePackageJson(readFile(pkgPath, 'utf8'))); } catch {}
  }
  const pyPath = join(cwd, 'pyproject.toml');
  if (fileExists(pyPath)) {
    try { entries.push(...parsePyproject(readFile(pyPath, 'utf8'))); } catch {}
  }

  if (entries.length === 0) return null;

  const shown = entries.slice(0, MAX_ENTRIES);
  const more = entries.length > MAX_ENTRIES ? ` (+${entries.length - MAX_ENTRIES} more)` : '';
  return (
    '## Installed dependency versions\n' +
    'Use these exact versions — do not assume newer/older APIs:\n' +
    shown.map((e) => `- ${e}`).join('\n') + more + '\n'
  );
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result) process.stdout.write(result);
}
