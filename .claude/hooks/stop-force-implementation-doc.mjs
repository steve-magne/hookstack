#!/usr/bin/env node
// Bloque la fin de session si du code source a été modifié sans qu'un fichier
// doc/implementation/ ait été créé ou mis à jour. Garantit zéro dette de doc. (Stop)
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

function defaultExec(cmd, opts) {
  return execSync(cmd, { encoding: 'utf8', timeout: 10_000, ...opts });
}

const CODE_EXTS = /\.(ts|tsx|mjs|cjs|js|jsx|css|scss|sass|py|go|rs|java|rb|php|swift|kt)$/;
const SKIP_PATH =
  /^(node_modules\/|\.git\/|dist\/|build\/|out\/|\.next\/|tests?\/|__tests?__\/|doc\/|docs\/|\.claude\/|public\/)/;
const SKIP_NAME = /(\.(test|spec)\.[a-z]+$|\.json$|\.md$|\.lock$|\.txt$|\.env)/;

function isSourceFile(p) {
  return CODE_EXTS.test(p) && !SKIP_PATH.test(p) && !SKIP_NAME.test(p);
}

function isImplDoc(p) {
  return p.startsWith('doc/implementation/');
}

export function run(_input, {
  exec = defaultExec,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  let files;
  try {
    const modified = exec('git diff --name-only HEAD', { cwd: projectDir });
    const untracked = exec('git ls-files --others --exclude-standard', { cwd: projectDir });
    files = [
      ...new Set(
        [...modified.split('\n'), ...untracked.split('\n')]
          .map((l) => l.trim())
          .filter(Boolean),
      ),
    ];
  } catch {
    return null; // pas un dépôt git ou git absent → no-op
  }

  if (!files.some(isSourceFile)) return null;
  if (files.some(isImplDoc)) return null;

  return {
    exitCode: 2,
    message:
      `[force-implementation-doc] Source code was modified but doc/implementation/ was not updated.\n` +
      `→ Create or update doc/implementation/<feature-name>.md explaining your technical choices\n` +
      `  and the implementation before ending this session.\n`,
  };
}

/* v8 ignore next 6 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
  if (result?.exitCode) process.exit(result.exitCode);
}
