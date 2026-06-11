#!/usr/bin/env node
// Vérifie la duplication de code à l'arrêt de session via jscpd (Stop).
// Non bloquant — avertit si le seuil est dépassé, silencieux si jscpd absent.
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const MIN_TOKENS = 50;   // blocs < 50 tokens ignorés (évite les faux positifs sur boilerplate)
const THRESHOLD = 5;     // % de duplication max avant avertissement

function defaultExec(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 30_000, stdio: 'pipe' });
}

function findSrcDirs({ exists = existsSync } = {}) {
  return ['src', 'lib', 'tests', 'app'].filter((d) => exists(d));
}

export function run(_input, { exec = defaultExec, exists = existsSync } = {}) {
  const dirs = findSrcDirs({ exists });
  if (!dirs.length) return null;

  try {
    const output = exec(
      `jscpd --min-tokens ${MIN_TOKENS} --threshold ${THRESHOLD} --reporters console ${dirs.join(' ')} 2>&1`,
    );
    // jscpd sort "Found X clones..." quand des duplications sont détectées
    if (output && /found \d+ clone/i.test(output)) {
      return { message: `[duplication-check] Code duplication detected:\n${output}` };
    }
    return null;
  } catch (e) {
    // Duplication détectée et seuil dépassé → jscpd exit 1 avec stdout utile
    const out = e.stdout ?? '';
    if (out && /found \d+ clone/i.test(out)) {
      return { message: `[duplication-check] Code duplication detected:\n${out}` };
    }
    // jscpd absent ou autre erreur → silence
    return null;
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stderr.write(JSON.stringify(result));
}
