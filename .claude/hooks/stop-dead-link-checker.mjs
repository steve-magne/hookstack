#!/usr/bin/env node
// Vérifie les liens morts dans les fichiers Markdown modifiés (Stop).
// Non bloquant — avertit si markdown-link-check détecte des 404/broken links.
// Silencieux si aucun .md/.mdx modifié ou si l'outil est absent.
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

function defaultExec(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', timeout: 60_000, stdio: 'pipe', shell: true, ...opts });
}

export function run(_input, { exec = defaultExec } = {}) {
  // 1. Détecte les fichiers Markdown modifiés depuis la base de la branche
  let diffOutput = '';
  try {
    const base = exec('git merge-base origin/main HEAD 2>/dev/null || git merge-base origin/master HEAD 2>/dev/null || echo HEAD').trim();
    diffOutput = exec(`git diff --name-only ${base} HEAD`);
  } catch {
    try {
      diffOutput = exec('git diff --name-only HEAD');
    } catch {
      return null;
    }
  }

  const mdFiles = diffOutput
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => /\.mdx?$/.test(f));

  if (!mdFiles.length) return null;

  // 2. Lance markdown-link-check sur chaque fichier (--no-progress pour output propre)
  const broken = [];
  for (const file of mdFiles) {
    try {
      exec(`npx --yes markdown-link-check --quiet --no-progress "${file}" 2>&1`);
    } catch (e) {
      const out = (e.stdout ?? '').toString();
      // Extrait les lignes d'erreur (liens morts marqués ✖ ou [✖])
      const errors = out
        .split('\n')
        .filter((l) => /✖|ERROR|dead/.test(l))
        .join('\n')
        .trim();
      if (errors) broken.push(`${file}:\n${errors}`);
    }
  }

  if (!broken.length) return null;

  return {
    message:
      `[dead-link-checker] Dead links found — fix before ending the session:\n` +
      broken.map((b) => `  ${b}`).join('\n\n') +
      '\n',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stderr.write(JSON.stringify(result));
}
