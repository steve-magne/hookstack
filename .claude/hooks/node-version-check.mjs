#!/usr/bin/env node
// @hookstack session-start-node-version-check
// Avertit si la version de Node active ne correspond pas à celle attendue (SessionStart)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

function major(v) {
  const m = String(v).match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

// Extrait le major attendu de .nvmrc (ex. "20", "v20.11.1", "lts/iron"→ignoré)
// ou de package.json engines.node (ex. ">=20", "20.x").
function expectedMajor({ cwd, readFile, fileExists }) {
  const nvmrc = join(cwd, '.nvmrc');
  if (fileExists(nvmrc)) {
    try { const m = major(readFile(nvmrc, 'utf8').trim()); if (m) return m; } catch {}
  }
  const pkg = join(cwd, 'package.json');
  if (fileExists(pkg)) {
    try {
      const engines = JSON.parse(readFile(pkg, 'utf8')).engines;
      if (engines?.node) { const m = major(engines.node); if (m) return m; }
    } catch {}
  }
  return null;
}

export function run({
  cwd = process.cwd(),
  nodeVersion = process.version,
  readFile = readFileSync,
  fileExists = existsSync,
} = {}) {
  const want = expectedMajor({ cwd, readFile, fileExists });
  if (want == null) return null;
  const have = major(nodeVersion);
  if (have == null || have === want) return null;
  return (
    `## ⚠️ Node version mismatch\n` +
    `Active: Node ${nodeVersion} — project expects major ${want} (.nvmrc / engines). ` +
    `Run \`nvm use\` (or fnm/volta) before installing or building to avoid version-specific bugs.\n`
  );
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result) process.stdout.write(result);
}
