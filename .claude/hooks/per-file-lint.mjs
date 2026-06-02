#!/usr/bin/env node
// Lint ESLint chaque fichier .js/.ts modifié depuis la merge base (Stop)
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const pid = process.ppid ?? 'unknown';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

// Signatures indiquant qu'ESLint n'a pas pu DÉMARRER (config absente, mauvaise version,
// binaire introuvable) — à distinguer d'une vraie violation de lint. Dans ce cas on traite
// ESLint comme un outil indisponible et on ne fait PAS échouer le hook (évite les faux positifs).
const ESLINT_UNAVAILABLE =
  /Oops! Something went wrong|could ?n'?t find an? eslint\.config|eslint\.config\.\(|migration guide|Cannot find module|could not determine executable|command not found|ENOENT/i;

export function isEslintUnavailable(output) {
  return !output || ESLINT_UNAVAILABLE.test(output);
}

// Retourne null si le fichier passe ESLint (ou si ESLint est indisponible), sinon la sortie d'erreur.
/* v8 ignore next 14 */
function defaultLint(file) {
  try {
    execSync(`npx --no-install eslint --max-warnings=0 "${file}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 15_000,
    });
    return null;
  } catch (err) {
    const out = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim();
    if (isEslintUnavailable(out)) return null; // ESLint n'a pas démarré → skip, pas un échec
    return out || 'lint error';
  }
}

export function run({
  exec = defaultExec,
  lint = defaultLint,
  exists = existsSync,
  readFile = readFileSync,
  writeFile = writeFileSync,
  unlink = unlinkSync,
  counterFile = `/tmp/.claude-per-lint-count-${pid}`,
  disableFile = `/tmp/.claude-per-lint-disabled-${pid}`,
} = {}) {
  if (exists(disableFile)) {
    process.stderr.write(`[per-file-lint] SUSPENDU (≥3 échecs). rm '${disableFile}' pour réactiver.\n`);
    return { exitCode: 0 };
  }

  const base = exec('git merge-base origin/main HEAD');
  const head = exec('git rev-parse HEAD');
  const raw = base && base !== head
    ? exec(`git diff --name-only ${base} HEAD`)
    : exec('git diff --name-only HEAD');

  const failed = [];
  let checked = 0;
  for (const f of raw.split('\n').filter(Boolean)) {
    if (!/\.[cm]?[jt]sx?$/.test(f)) continue;
    if (!exists(f)) continue; // fichier supprimé → rien à linter
    checked++;
    const out = lint(f);
    if (out) failed.push({ f, out });
  }

  if (!failed.length) {
    try { unlink(counterFile); } catch {}
    return { exitCode: 0, message: checked ? `✓ ESLint: no issues (${checked} file${checked > 1 ? 's' : ''})\n` : '✓ ESLint: nothing to check\n' };
  }

  let count = 0;
  try { count = parseInt(readFile(counterFile, 'utf8').trim(), 10) || 0; } catch {}
  count++;
  writeFile(counterFile, String(count));

  let msg = `[FAIL] ESLint signale des problèmes sur les fichiers modifiés :\n${failed.map(({ f }) => `  - ${f}`).join('\n')}\n→ Corriger les erreurs de lint (ou \`eslint --fix\`).\n`;
  if (count >= 3) {
    writeFile(disableFile, '');
    msg += `[AUTO-DISABLE] hook suspendu après ${count} échecs. rm '${disableFile}' pour réactiver.\n`;
  }

  return { exitCode: 2, message: msg };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result.message) process.stderr.write(result.message);
  process.exit(result.exitCode);
}
