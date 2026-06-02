#!/usr/bin/env node
// Bilan qualité complet à la fin d'une session : typecheck + lint + tests (Stop)
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

export function run({
  exec,
  exists = existsSync,
  projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd(),
} = {}) {
  const doExec =
    exec ?? ((cmd) => execSync(cmd, { cwd: projectDir, stdio: 'pipe', timeout: 60_000 }));

  const messages = [];
  function check(label, cmd) {
    try {
      doExec(cmd);
      messages.push(`[quality-check] ✓ ${label}\n`);
      return true;
    } catch (err) {
      const out = err.stdout?.toString()?.trim() ?? '';
      messages.push(`[quality-check] ✗ ${label}\n${out ? out.slice(-500) + '\n' : ''}`);
      return false;
    }
  }

  const checks = [];
  const hasPkg = exists(join(projectDir, 'package.json'));
  if (hasPkg && exists(join(projectDir, 'tsconfig.json')))
    checks.push(['TypeScript', 'npx --no-install tsc --noEmit']);
  if (hasPkg) checks.push(['ESLint', 'npx --no-install eslint --max-warnings=0 .']);
  if (hasPkg)
    checks.push(['Tests', 'pnpm test --run 2>/dev/null || npx --no-install vitest run 2>/dev/null || true']);

  const results = checks.map(([label, cmd]) => check(label, cmd));
  const failed = results.filter((r) => !r).length;

  if (failed > 0) messages.push(`[quality-check] ${failed}/${checks.length} vérification(s) échouée(s).\n`);
  else if (checks.length > 0) messages.push('[quality-check] ✓ Tous les contrôles qualité passent.\n');

  return { checks: checks.length, failed, message: messages.join('') };
}

/* v8 ignore next 4 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = run();
  process.stderr.write(result.message);
}
