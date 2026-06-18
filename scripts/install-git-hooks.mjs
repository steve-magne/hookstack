#!/usr/bin/env node
// Installe les git hooks locaux. Lancé automatiquement par `pnpm install` via
// le script "prepare" de package.json — pas besoin de l'appeler manuellement.
import { writeFileSync, chmodSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// git rev-parse --git-common-dir gère worktrees ET repos classiques
let commonDir;
try {
  commonDir = execSync('git rev-parse --git-common-dir', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {
  // Pas dans un repo git (CI qui ne fait pas checkout, etc.) — skip silencieusement
  process.exit(0);
}

const GIT_HOOKS_DIR = resolve(ROOT, commonDir, 'hooks');

if (!existsSync(GIT_HOOKS_DIR)) {
  // Hooks dir absent (rare) — on skip
  process.exit(0);
}

const PRE_COMMIT = resolve(GIT_HOOKS_DIR, 'pre-commit');

const script = `#!/bin/sh
# Régénère hooks/hooks.json si le registre ou un script .mjs a changé dans le stage.
# Installé automatiquement par pnpm install (scripts.prepare).

CHANGED=$(git diff --cached --name-only 2>/dev/null || true)

if echo "$CHANGED" | grep -qE '(registry/registry\\.json|\\.claude/hooks/.*\\.mjs)'; then
  node .claude/sync-hooks.mjs
  git add hooks/hooks.json .claude/settings.json
fi
`;

writeFileSync(PRE_COMMIT, script, 'utf8');
chmodSync(PRE_COMMIT, 0o755);
console.log('✓ git hook pre-commit installé (.git/hooks/pre-commit)');
