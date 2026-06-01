#!/usr/bin/env node
// Lance sync-hooks.mjs automatiquement quand registry.json est modifié
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const input = JSON.parse(readFileSync(0, 'utf8'));
const filePath = input.tool_input?.file_path ?? '';

if (!filePath.endsWith('registry/registry.json')) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR;
if (!projectDir) process.exit(0);

try {
  const out = execSync(
    ,
    { timeout: 30000, cwd: projectDir, encoding: 'utf8' }
  );
  const summary = out.trim().split('
').slice(-4).join(' | ');
  process.stderr.write();
} catch (e) {
  process.stderr.write();
}
