#!/usr/bin/env node
// Génère une entrée de changelog depuis le diff git de la session (Stop)
import { execSync } from 'child_process';
import { appendFileSync, existsSync } from 'fs';
import { join } from 'path';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function exec(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 10_000, cwd: projectDir }).trim(); } catch { return ''; }
}

const branch  = exec('git branch --show-current');
const diff    = exec('git diff --stat HEAD~1 HEAD 2>/dev/null || git diff --stat HEAD');
const commits = exec('git log -5 --pretty="- %s (%h)"');

if (!diff && !commits) process.exit(0);

const date    = new Date().toISOString().split('T')[0];
const entry   = [
  `\n## ${date} — Session sur \`${branch || 'main'}\``,
  '',
  commits ? `### Commits\n${commits}` : '',
  diff    ? `### Fichiers modifiés\n\`\`\`\n${diff}\n\`\`\`` : '',
].filter(Boolean).join('\n');

const changelogPath = join(projectDir, 'CHANGELOG.md');
if (!existsSync(changelogPath)) {
  process.stderr.write('[session-changelog] CHANGELOG.md absent — entrée ignorée.\n');
  process.exit(0);
}

appendFileSync(changelogPath, entry + '\n');
process.stderr.write(`[session-changelog] ✓ Entrée ajoutée dans CHANGELOG.md\n`);
