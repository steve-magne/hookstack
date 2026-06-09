#!/usr/bin/env node
// Résume les grands fichiers JSON/CSV/JSONL avant lecture pour économiser le contexte (PreToolUse Read)
import { readFileSync, existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { extname, basename } from 'path';

const BYTE_THRESHOLD = 50_000;
const CSV_PREVIEW_ROWS = 5;
const JSONL_PREVIEW_LINES = 3;

function inferJsonSchema(value, depth = 0) {
  if (depth > 2) return typeof value;
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    const inner = value.length ? inferJsonSchema(value[0], depth + 1) : 'unknown';
    return `Array<${inner}> (${value.length} items)`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value).slice(0, 12);
    const fields = keys.map((k) => `${k}: ${inferJsonSchema(value[k], depth + 1)}`);
    const extra = Object.keys(value).length > 12 ? ` … +${Object.keys(value).length - 12} more` : '';
    return `{ ${fields.join(', ')}${extra} }`;
  }
  return typeof value;
}

function summarizeJson(raw, filePath) {
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }

  const lines = raw.split('\n').length;
  const bytes = Buffer.byteLength(raw, 'utf8');
  const name = basename(filePath);

  if (Array.isArray(parsed)) {
    const schema = parsed.length ? inferJsonSchema(parsed[0]) : 'empty';
    return `[json-csv-compact] \`${name}\` — JSON array (${parsed.length} items, ${lines} lines, ${(bytes / 1024).toFixed(1)} KB)\nItem schema: ${schema}`;
  }

  const schema = inferJsonSchema(parsed);
  return `[json-csv-compact] \`${name}\` — JSON object (${lines} lines, ${(bytes / 1024).toFixed(1)} KB)\nSchema: ${schema}`;
}

function summarizeCsv(raw, filePath) {
  const lines = raw.split('\n').filter((l) => l.trim());
  if (!lines.length) return null;

  const name = basename(filePath);
  const headers = lines[0];
  const preview = lines.slice(1, 1 + CSV_PREVIEW_ROWS);
  const total = lines.length - 1;

  const cols = headers.split(',').length;
  const rows = [headers, ...preview].join('\n');
  return `[json-csv-compact] \`${name}\` — CSV (${total} rows, ${cols} columns)\nFirst ${preview.length} rows:\n\`\`\`\n${rows}\n\`\`\``;
}

function summarizeJsonl(raw, filePath) {
  const lines = raw.split('\n').filter((l) => l.trim());
  if (!lines.length) return null;

  const name = basename(filePath);
  const preview = lines.slice(0, JSONL_PREVIEW_LINES).map((l) => {
    try { return inferJsonSchema(JSON.parse(l)); } catch { return l.slice(0, 80); }
  });

  return `[json-csv-compact] \`${name}\` — JSONL (${lines.length} lines)\nFirst ${preview.length} line schemas:\n${preview.map((s, i) => `  ${i + 1}. ${s}`).join('\n')}`;
}

export function run(input, { readFile = readFileSync, exists = existsSync, stat = statSync } = {}) {
  if (input.tool_name !== 'Read') return null;

  const filePath = input.tool_input?.file_path ?? '';
  if (!filePath) return null;

  const ext = extname(filePath).toLowerCase().replace('.', '');
  if (!['json', 'csv', 'jsonl', 'tsv', 'ndjson'].includes(ext)) return null;

  if (!exists(filePath)) return null;

  let size;
  try { size = stat(filePath).size; } catch { return null; }
  if (size < BYTE_THRESHOLD) return null;

  let raw;
  try { raw = readFile(filePath, 'utf8'); } catch { return null; }

  let summary;
  if (ext === 'json') summary = summarizeJson(raw, filePath);
  else if (ext === 'csv' || ext === 'tsv') summary = summarizeCsv(raw, filePath);
  else summary = summarizeJsonl(raw, filePath);

  if (!summary) return null;

  return { decision: 'block', reason: summary };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
