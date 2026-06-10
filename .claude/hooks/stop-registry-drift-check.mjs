#!/usr/bin/env node
// Filet de sécurité : vérifie au Stop que registry.json est synchrone avec les
// .mjs sur disque (sync-hooks --check). Attrape une sync auto qui aurait échoué
// silencieusement en cours de session, avant que la CI ne rejette la PR. (Stop)
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

function makeDefaultExec(projectDir) {
  return () =>
    execSync('node .claude/sync-hooks.mjs --check', {
      timeout: 30_000,
      cwd: projectDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
}

export function run({
  exec,
  exists = existsSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  // Projet sans sync-hooks (hook installé ailleurs que sur Hookstack) → no-op
  if (!exists(join(projectDir, '.claude/sync-hooks.mjs'))) return null;

  const doExec = exec ?? makeDefaultExec(projectDir);
  try {
    doExec();
    return null; // synchrone → silencieux
  } catch (e) {
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.toString().trim().slice(-1000);
    return {
      exitCode: 2,
      message:
        `[registry-drift-check] registry.json a dérivé des .mjs sur disque :\n${out}\n` +
        `→ Lancer 'node .claude/sync-hooks.mjs' pour resynchroniser avant de terminer.\n`,
    };
  }
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result?.message) process.stderr.write(result.message);
  if (result?.exitCode) process.exit(result.exitCode);
}
