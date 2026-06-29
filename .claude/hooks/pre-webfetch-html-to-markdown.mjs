#!/usr/bin/env node
// @hookstack pre-webfetch-html-to-markdown
// Convertit les pages HTML en Markdown avant traitement WebFetch (PreToolUse WebFetch)
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const MAX_CHARS = 30_000;

function defaultFetchUrl(url) {
  return execSync('curl -sL --max-time 10 --user-agent "Mozilla/5.0" "$HOOK_URL"', {
    encoding: 'utf8',
    timeout: 15_000,
    env: { ...process.env, HOOK_URL: url },
  }).trim();
}

function defaultConvertHtml(html) {
  return execSync('pandoc -f html -t markdown --wrap=none', {
    input: html,
    encoding: 'utf8',
    timeout: 10_000,
  }).trim();
}

function defaultHasPandoc() {
  try { execSync('which pandoc', { encoding: 'utf8', timeout: 2_000 }); return true; } catch { return false; }
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function run(input, {
  fetchUrl = defaultFetchUrl,
  convertHtml = defaultConvertHtml,
  hasPandoc = defaultHasPandoc,
} = {}) {
  if (input.tool_name !== 'WebFetch') return null;

  const url = input.tool_input?.url ?? '';
  if (!url || !/^https?:\/\//i.test(url)) return null;

  let html;
  try { html = fetchUrl(url); } catch { return null; }
  if (!html?.trim()) return null;

  // Uniquement les pages HTML — laisser passer JSON, binaires, etc.
  if (!/<html|<!doctype\s+html/i.test(html.slice(0, 2000))) return null;

  let markdown;
  try {
    markdown = hasPandoc() ? convertHtml(html) : stripHtml(html);
  } catch {
    try { markdown = stripHtml(html); } catch { return null; }
  }

  if (!markdown?.trim()) return null;

  let content = markdown.trim();
  let truncated = false;
  if (content.length > MAX_CHARS) {
    content = content.slice(0, MAX_CHARS);
    truncated = true;
  }

  let domain;
  try { domain = new URL(url).hostname; } catch { domain = url; }
  const suffix = truncated ? ` (truncated to ${MAX_CHARS} chars)` : '';

  return {
    decision: 'block',
    reason: `[webfetch-html-to-markdown] \`${domain}\` converted to Markdown${suffix}:\n\n${content}`,
  };
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
