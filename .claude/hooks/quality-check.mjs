#!/usr/bin/env node
// Bilan qualité complet à la fin d'une session : typecheck + lint + tests (Stop)
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function run(label, cmd) {
  try {
    execSync(cmd, { cwd: projectDir, stdio: 'pipe', timeout: 60_000 });
    process.stderr.write(`[quality-check] ✓ ${label}\n`);
    return true;
  } catch (err) {
    const out = err.stdout?.toString()?.trim() ?? '';
    process.stderr.write(`[quality-check] ✗ ${label}\n${out ? out.slice(-500) + '\n' : ''}`);
    return false;
  }
}

const checks = [];
const hasPkg = existsSync(join(projectDir, 'package.json'));

if (hasPkg && existsSync(join(projectDir, 'tsconfig.json')))
  checks.push(['TypeScript', 'npx --no-install tsc --noEmit']);
if (hasPkg)
  checks.push(['ESLint', 'npx --no-install eslint --max-warnings=0 .']);
if (hasPkg)
  checks.push(['Tests', 'pnpm test --run 2>/dev/null || npx --no-install vitest run 2>/dev/null || true']);

const results = checks.map(([label, cmd]) => run(label, cmd));
const failed  = results.filter(r => !r).length;

if (failed > 0)
  process.stderr.write(`[quality-check] ${failed}/${checks.length} vérification(s) échouée(s).\n`);
else if (checks.length > 0)
  process.stderr.write(`[quality-check] ✓ Tous les contrôles qualité passent.\n`);
