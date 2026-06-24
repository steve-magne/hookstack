#!/usr/bin/env node
// fetch-doc-sources.mjs <url> [registry.json]
// Fetches a documentation page or blog post and extracts hook-relevant text content.
// Output: JSON { source_type, url, title, content, existing_slugs }

import { readFileSync } from 'node:fs'

const [,, url, registryPath = 'registry/registry.json'] = process.argv

if (!url) {
  process.stdout.write(`${JSON.stringify({ error: 'Usage: fetch-doc-sources.mjs <url> [registry.json]' })}\n`)
  process.exit(0)
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => `\n## ${content.replace(/<[^>]+>/g, '')}\n`)
    .replace(/<(pre|code)[^>]*>([\s\S]*?)<\/\1>/gi, (_, _tag, content) => `\n\`\`\`\n${content.replace(/<[^>]+>/g, '')}\n\`\`\`\n`)
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\n{4,}/g, '\n\n')
    .trim()
}

function extractTitle(html) {
  const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
  if (og) return og[1].trim()
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return title ? title[1].trim() : url
}

// Focus sur les sections pertinentes aux hooks/automatisation
function focusOnHookContent(text) {
  const hookKeywords = [
    'hook', 'automation', 'automate', 'trigger', 'event', 'pre-tool', 'post-tool',
    'command', 'script', 'workflow', 'automatique', 'déclencher', 'bloquer',
    'PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Notification', 'Stop',
  ]
  const lines = text.split('\n')
  const scored = lines.map((line, i) => {
    const lower = line.toLowerCase()
    const score = hookKeywords.reduce((s, kw) => s + (lower.includes(kw.toLowerCase()) ? 1 : 0), 0)
    return { line, i, score }
  })

  // Garde toujours les sections avec score élevé + contexte local (±5 lignes)
  const keepSet = new Set()
  scored.forEach(({ score, i }) => {
    if (score > 0) for (let j = Math.max(0, i - 5); j <= Math.min(lines.length - 1, i + 5); j++) keepSet.add(j)
  })

  // Si moins de 20% des lignes sont pertinentes, garder tout (doc peut être entièrement dédiée)
  if (keepSet.size < lines.length * 0.2) return text

  return [...keepSet].sort((a, b) => a - b).map(i => lines[i]).join('\n')
}

try {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'HookstackAnalyzer/1.0 (catalog enrichment)' },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  })

  if (!res.ok) {
    process.stdout.write(`${JSON.stringify({ error: `HTTP ${res.status} pour ${url}` })}\n`)
    process.exit(0)
  }

  const contentType = res.headers.get('content-type') ?? ''
  const html = await res.text()
  const title = extractTitle(html)

  let content
  if (contentType.includes('text/html')) {
    content = focusOnHookContent(stripHtml(html))
  } else {
    // Markdown, texte brut, etc.
    content = html.slice(0, 60000)
  }

  const MAX_CHARS = 50000
  const truncated = content.length > MAX_CHARS
    ? `${content.slice(0, MAX_CHARS)}\n\n[...contenu tronqué à 50 000 caractères]`
    : content

  let existingSlugs = []
  try { existingSlugs = JSON.parse(readFileSync(registryPath, 'utf8')).map(h => h.slug) } catch {}

  process.stdout.write(`${JSON.stringify({
    source_type: 'documentation',
    url,
    title,
    content: truncated,
    existing_slugs: existingSlugs,
  })}\n`)
} catch (err) {
  process.stdout.write(`${JSON.stringify({ error: err.message })}\n`)
  process.exit(0)
}
