#!/usr/bin/env node
// @hookstack pre-edit-protect-lockfiles
// Bloque les éditions directes de fichiers de lock (PreToolUse Write|Edit)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const LOCKFILES = [
  /pnpm-lock\.yaml$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /Gemfile\.lock$/,
  /poetry\.lock$/,
  /Pipfile\.lock$/,
  /composer\.lock$/,
  /Cargo\.lock$/,
];

export function run(input) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath) return null;
  const match = LOCKFILES.find((p) => p.test(filePath));
  return match
    ? {
        decision: 'block',
        reason: `Lock file ${filePath} must not be edited directly. Run the package manager instead (pnpm install, npm install, cargo build…).`,
      }
    : null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
