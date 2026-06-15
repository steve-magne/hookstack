#!/usr/bin/env node
// @hookstack stop-generate-changelog
// Génère une entrée de changelog depuis le diff git de la session (Stop)
import { execSync } from 'child_process';
import { appendFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export function run({
  exec,
  append = appendFileSync,
  exists = existsSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
  now = () => new Date().toISOString(),
} = {}) {
  const doExec =
    exec ?? ((cmd) => { try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000, cwd: projectDir }).trim(); } catch { return ''; } });

  const branch = doExec('git branch --show-current');
  const diff = doExec('git diff --stat HEAD~1 HEAD 2>/dev/null || git diff --stat HEAD');
  const commits = doExec('git log -5 --pretty="- %s (%h)"');

  if (!diff && !commits) return null;

  const date = now().split('T')[0];
  const entry = [
    `\n## ${date} — Session sur \`${branch || 'main'}\``,
    '',
    commits ? `### Commits\n${commits}` : '',
    diff ? `### Fichiers modifiés\n\`\`\`\n${diff}\n\`\`\`` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const changelogPath = join(projectDir, 'CHANGELOG.md');
  if (!exists(changelogPath)) {
    return { written: false, message: '[session-changelog] CHANGELOG.md absent — entrée ignorée.\n' };
  }

  append(changelogPath, entry + '\n');
  return { written: true, entry, message: '[session-changelog] ✓ Entrée ajoutée dans CHANGELOG.md\n' };
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  if (result?.message) process.stderr.write(result.message);
}
