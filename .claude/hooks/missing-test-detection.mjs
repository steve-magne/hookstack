#!/usr/bin/env node
// Détecte les fichiers sources modifiés sans test correspondant (Stop)
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { basename } from 'path';
import { fileURLToPath } from 'url';

const pid = process.ppid ?? 'unknown';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

export function run({
  exec = defaultExec,
  exists = existsSync,
  readFile = readFileSync,
  writeFile = writeFileSync,
  unlink = unlinkSync,
  counterFile = `/tmp/.claude-missing-tests-count-${pid}`,
  disableFile = `/tmp/.claude-missing-tests-disabled-${pid}`,
} = {}) {
  if (exists(disableFile)) {
    process.stderr.write(`[missing-test-detection] SUSPENDU (≥3 échecs). rm '${disableFile}' pour réactiver.\n`);
    return { exitCode: 0 };
  }

  const base = exec('git merge-base origin/main HEAD');
  const head = exec('git rev-parse HEAD');
  const raw = base && base !== head
    ? exec(`git diff --name-only ${base} HEAD`)
    : exec('git diff --name-only HEAD');

  const missing = [];
  for (const f of raw.split('\n').filter(Boolean)) {
    if (!/^src\/(lib|store|hooks)\/[^/]+\.ts$/.test(f)) continue;
    const name = basename(f, '.ts');
    const found = exec(`find src -name "${name}.test.ts" -o -name "${name}.spec.ts"`);
    if (!found) missing.push(f);
  }

  if (!missing.length) {
    try { unlink(counterFile); } catch {}
    return { exitCode: 0 };
  }

  let count = 0;
  try { count = parseInt(readFile(counterFile, 'utf8').trim(), 10) || 0; } catch {}
  count++;
  writeFile(counterFile, String(count));

  let msg = `[FAIL] Tests manquants pour les fichiers modifiés :\n${missing.map(f => `  - ${f}`).join('\n')}\n→ Créer les fichiers de test correspondants.\n`;
  if (count >= 3) {
    writeFile(disableFile, '');
    msg += `[AUTO-DISABLE] hook suspendu après ${count} échecs. rm '${disableFile}' pour réactiver.\n`;
  }

  return { exitCode: 2, message: msg };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result.message) process.stdout.write(result.message);
  process.exit(result.exitCode);
}
