#!/usr/bin/env node
// @hookstack registry-changed-auto-sync
// Resynchronise registry.json depuis les scripts dogfoodés après édition d'un
// hook .claude/hooks/*.mjs (ou du registre lui-même). (FileChanged *.mjs|registry.json)
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SELF = 'registry-auto-sync.mjs';

function defaultExec(projectDir) {
  return execSync('node .claude/sync-hooks.mjs', {
    timeout: 30_000,
    cwd: projectDir,
    encoding: 'utf8',
  });
}

// Vrai si l'édition doit déclencher une resync (un hook .mjs ou le registre).
function shouldSync(filePath) {
  if (!filePath) return false;
  if (filePath.endsWith(`/${SELF}`)) return false; // évite de se resync soi-même
  if (filePath.endsWith('registry/registry.json')) return true;
  return /\.claude\/hooks\/[^/]+\.mjs$/.test(filePath);
}

// Extrait la racine du projet depuis le chemin du fichier modifié.
// Cas worktree : le fichier peut vivre dans un répertoire différent de CLAUDE_PROJECT_DIR.
function resolveProjectDir(filePath, fallback) {
  const m = filePath.match(/^(.*)\/.claude\/hooks\/[^/]+\.mjs$/);
  if (m) return m[1];
  const r = filePath.match(/^(.*\/)registry\/registry\.json$/);
  if (r) return r[1].replace(/\/$/, '');
  return fallback;
}

export function run(input, { exec = defaultExec, projectDir = process.env.CLAUDE_PROJECT_DIR } = {}) {
  // FileChanged: input.file_path  |  PostToolUse (legacy): input.tool_input?.file_path
  const filePath = input.file_path ?? input.tool_input?.file_path ?? '';
  if (!shouldSync(filePath) || !projectDir) return null;
  const effectiveDir = resolveProjectDir(filePath, projectDir);

  try {
    const out = exec(effectiveDir);
    const summary = out.trim().split('\n').slice(-3).join(' | ');
    return { message: `[registry-auto-sync] ${summary}` };
  } catch (e) {
    return { message: `[registry-auto-sync] échec sync : ${e.message}` };
  }
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(`${result.message}\n`);
}
