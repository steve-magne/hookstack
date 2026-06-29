#!/usr/bin/env node
// @hookstack stop-per-file-lint
// Lint Biome chaque fichier .js/.ts modifié depuis la merge base (Stop)
import { readFileSync, existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const pid = process.ppid ?? 'unknown';

function defaultExec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000 }).trim(); } catch { return ''; }
}

// Signatures indiquant que Biome n'a pas pu DÉMARRER (binaire introuvable, mauvaise
// installation) — à distinguer d'une vraie violation de lint. Biome n'a pas besoin de
// fichier de config pour fonctionner (règles recommandées par défaut), donc une sortie
// vide ou un crash signale un outil indisponible, pas une absence de config.
const BIOME_UNAVAILABLE = /Cannot find module|could not determine executable|command not found|ENOENT/i;

export function isBiomeUnavailable(output) {
  return !output || BIOME_UNAVAILABLE.test(output);
}

// Retourne null si le fichier passe Biome (ou si Biome est indisponible), sinon la sortie d'erreur.
/* v8 ignore next 14 */
function defaultLint(file) {
  try {
    execSync(`npx --no-install biome lint --error-on-warnings "${file}"`, {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 15_000,
    });
    return null;
  } catch (err) {
    const out = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim();
    if (isBiomeUnavailable(out)) return null; // Biome n'a pas démarré → skip, pas un échec
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
    return { exitCode: 0, message: checked ? `✓ Biome: no issues (${checked} file${checked > 1 ? 's' : ''})\n` : '✓ Biome: nothing to check\n' };
  }

  let count = 0;
  try { count = parseInt(readFile(counterFile, 'utf8').trim(), 10) || 0; } catch {}
  count++;
  writeFile(counterFile, String(count));

  let msg = `[FAIL] Biome signale des problèmes sur les fichiers modifiés :\n${failed.map(({ f }) => `  - ${f}`).join('\n')}\n→ Corriger les erreurs de lint (ou \`biome lint --write\`).\n`;
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
