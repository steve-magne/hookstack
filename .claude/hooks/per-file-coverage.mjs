#!/usr/bin/env node
// @hookstack stop-per-file-coverage
// Vérifie la coverage ≥80% par fichier .ts/.tsx modifié (Stop)
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const pid = process.ppid ?? 'unknown';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

const SKIP = /(^|\/)src\/(types|constants|router|main)\//;

export function run({
  exec = defaultExec,
  exists = existsSync,
  readFile = readFileSync,
  writeFile = writeFileSync,
  unlink = unlinkSync,
  cwd = process.cwd(),
  counterFile = `/tmp/.claude-per-cov-count-${pid}`,
  disableFile = `/tmp/.claude-per-cov-disabled-${pid}`,
  covJson = './coverage/coverage-summary.json',
} = {}) {
  if (exists(disableFile)) {
    process.stderr.write(`[per-file-coverage] SUSPENDU (≥3 échecs). rm '${disableFile}' pour réactiver.\n`);
    return { exitCode: 0 };
  }

  if (!exists(covJson)) return { exitCode: 0 };

  const base = exec('git merge-base origin/main HEAD');
  const head = exec('git rev-parse HEAD');
  const raw = base && base !== head
    ? exec(`git diff --name-only ${base} HEAD`)
    : exec('git diff --name-only HEAD');

  let coverage;
  try { coverage = JSON.parse(readFile(covJson, 'utf8')); } catch { return { exitCode: 0 }; }

  const lowCov = [];
  for (const f of raw.split('\n').filter(Boolean)) {
    if (!/(^|\/)src\/.*\.tsx?$/.test(f) || SKIP.test(f)) continue;
    const pct = coverage[`${cwd}/${f}`]?.lines?.pct;
    if (pct != null && pct < 80) lowCov.push({ f, pct });
  }

  if (!lowCov.length) {
    try { unlink(counterFile); } catch {}
    return { exitCode: 0 };
  }

  let count = 0;
  try { count = parseInt(readFile(counterFile, 'utf8').trim(), 10) || 0; } catch {}
  count++;
  writeFile(counterFile, String(count));

  let msg = `[FAIL] Coverage < 80% pour les fichiers modifiés :\n${lowCov.map(({ f, pct }) => `  - ${f}: ${Math.round(pct)}%`).join('\n')}\n→ Ajouter des tests pour atteindre le seuil.\n`;
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
