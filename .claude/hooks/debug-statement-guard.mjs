#!/usr/bin/env node
// @hookstack post-write-debug-statement-guard
// Signale les instructions de debug oubliées après une écriture (PostToolUse Write|Edit)
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';

// Par famille de fichiers : motif -> libellé. Non bloquant, purement informatif.
const RULES = [
  { ext: /\.(?:[mc]?[jt]sx?)$/, patterns: [
    [/\bconsole\.(?:log|debug|trace)\s*\(/, 'console.log/debug'],
    [/\bdebugger\b\s*;?/, 'debugger'],
  ] },
  { ext: /\.py$/, patterns: [
    [/^\s*print\s*\(/m, 'print('],
    [/\bbreakpoint\s*\(\s*\)/, 'breakpoint()'],
    [/\b(?:import\s+pdb|pdb\.set_trace\s*\()/, 'pdb'],
  ] },
  { ext: /\.rs$/, patterns: [
    [/\bdbg!\s*\(/, 'dbg!'],
  ] },
];

function isTestFile(p) {
  return /(?:\.|_|\b)(?:test|spec)\.[mc]?[jt]sx?$/.test(p) || /(?:^|\/)test_|_test\.py$/.test(p);
}

export function run(input, { readFile = readFileSync, fileExists = existsSync } = {}) {
  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath || !fileExists(filePath) || isTestFile(filePath)) return null;

  const rule = RULES.find((r) => r.ext.test(filePath));
  if (!rule) return null;

  let content;
  try { content = readFile(filePath, 'utf8'); } catch { return null; }

  const found = rule.patterns.filter(([re]) => re.test(content)).map(([, label]) => label);
  if (found.length === 0) return null;

  return {
    message:
      `[debug-statement] ${filePath} contient des traces de debug oubliées : ${found.join(', ')}. ` +
      'Retirez-les avant de commiter.\n',
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result?.message) process.stderr.write(result.message);
}
