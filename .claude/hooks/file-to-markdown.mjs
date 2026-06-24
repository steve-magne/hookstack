#!/usr/bin/env node
// @hookstack pre-read-file-to-markdown
// Convertit PDF/DOCX/PPTX et autres fichiers binaires en Markdown avant lecture (PreToolUse Read)
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { extname, basename } from 'path';

const MAX_CHARS = 50_000;

const SUPPORTED = new Set(['pdf', 'docx', 'pptx', 'odt', 'rtf', 'doc', 'ppt', 'xlsx', 'epub', 'html', 'htm']);

function defaultExec(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 30_000 }).trim();
}

function hasBinary(name, exec) {
  try { exec(`which ${name}`); return true; } catch { return false; }
}

export function run(input, { exec = defaultExec, exists = existsSync } = {}) {
  if (input.tool_name !== 'Read') return null;

  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath) return null;

  const ext = extname(filePath).toLowerCase().replace('.', '');
  if (!SUPPORTED.has(ext)) return null;

  if (!exists(filePath)) return null;

  const hasPdftotext = ext === 'pdf' && hasBinary('pdftotext', exec);
  const hasPandoc = hasBinary('pandoc', exec);

  if (!hasPdftotext && !hasPandoc) return null;

  let markdown;
  try {
    if (ext === 'pdf' && hasPdftotext) {
      markdown = exec(`pdftotext "${filePath}" -`);
    } else if (hasPandoc) {
      markdown = exec(`pandoc --to markdown --wrap=none "${filePath}"`);
    } else {
      return null;
    }
  } catch {
    return null;
  }

  if (!markdown?.trim()) return null;

  let content = markdown.trim();
  let truncated = false;
  if (content.length > MAX_CHARS) {
    content = content.slice(0, MAX_CHARS);
    truncated = true;
  }

  const name = basename(filePath);
  const suffix = truncated ? ` (truncated to ${MAX_CHARS} chars)` : '';
  const header = `[file-to-markdown] \`${name}\` converted to Markdown${suffix}:\n\n`;

  return { decision: 'block', reason: header + content };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
