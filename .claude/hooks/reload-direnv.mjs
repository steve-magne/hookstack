#!/usr/bin/env node
// Recharge direnv quand le répertoire de travail change (CwdChanged)
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';

const input = JSON.parse(readFileSync(0, 'utf8'));
const newCwd = input.cwd ?? input.new_cwd ?? process.cwd();

const envrc = `${newCwd}/.envrc`;
if (!existsSync(envrc)) process.exit(0);

try {
  execSync('direnv allow .', { cwd: newCwd, stdio: 'ignore', timeout: 5_000 });
  process.stderr.write(`[reload-direnv] direnv rechargé dans ${newCwd}\n`);
} catch {
  // direnv absent — non bloquant
}
