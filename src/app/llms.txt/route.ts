import { allHooks } from '@/lib/hooks'
import { guides } from '@/lib/guides'
import { MAINTAINER, SITE, ISSUES_URL } from '@/lib/site'
import type { Category } from '@/types/hook'
import { NextResponse } from 'next/server'

const BASE = 'https://www.hookstack.app'

const CATEGORY_LABELS: Record<Category, string> = {
  security: 'Security',
  context: 'Context & Memory',
  validation: 'Validation & Quality',
  notification: 'Notification',
  workflow: 'Workflow',
  documentation: 'Documentation',
}

export async function GET() {
  const byCategory = allHooks.reduce<Record<string, typeof allHooks>>((acc, hook) => {
    ;(acc[hook.category] ??= []).push(hook)
    return acc
  }, {})

  const hookSections = Object.entries(byCategory)
    .map(([cat, hooks]) => {
      const label = CATEGORY_LABELS[cat as Category] ?? cat
      const lines = hooks
        .map((h) => `- [${h.name}](${BASE}/hook/${h.slug}): ${h.description}`)
        .join('\n')
      return `### ${label} (${hooks.length})\n\n${lines}`
    })
    .join('\n\n')

  const guidesSection = guides
    .map((g) => `- [${g.title}](${BASE}/guides/${g.slug}): ${g.description}`)
    .join('\n')

  const content = `# HookStack

> Open-source catalogue of Claude Code hooks. Browse ${allHooks.length} hooks and generate your settings.json in 2 minutes.

## What is HookStack?

HookStack (${BASE}) is an open-source catalogue of Claude Code hooks. Each hook is a Node.js script (.mjs) that runs at a lifecycle event to enforce security, add quality checks, inject context, or automate workflows.

## What is a Claude Code hook?

A hook is a script executed by Claude Code at specific events:

- **PreToolUse** — Runs before a tool (Bash, Write, Edit, WebFetch…) executes. Can block the action by returning \`{ "decision": "block", "reason": "..." }\` on stdout.
- **PostToolUse** — Runs after a tool completes. Used for auto-formatting, linting, type-checking.
- **UserPromptSubmit** — Triggered on each user prompt. Used to inject project context, date, conventions.
- **Stop** — Triggered when Claude finishes a task. Used for tests, changelogs, quality gates.
- **SessionStart / SessionEnd** — Triggered at session lifecycle. Used for git context injection, audit logs.
- **Notification** — Triggered when Claude needs user input. Used for Slack/TTS alerts.
- **SubagentStop** — Triggered when a sub-agent finishes.
- **PreCompact** — Triggered before context compaction.

## How to install hooks

1. Visit ${BASE} to browse and select hooks
2. Click + on any hook to add it to your selection
3. Copy the generated \`.claude/settings.json\` fragment
4. Run the generated install script to create hook files under \`.claude/hooks/\`

## Hook script conventions

- Language: Node.js (.mjs), no external dependencies
- Read context from stdin: \`JSON.parse(readFileSync(0, 'utf8'))\`
- Block a tool: write \`{ "decision": "block", "reason": "..." }\` to stdout
- Non-blocking hooks: exit 0 silently
- Scripts live in \`.claude/hooks/\` and are referenced in \`.claude/settings.json\`

## Available Hooks (${allHooks.length} total)

${hookSections}

## Guides

In-depth articles on Claude Code hooks:

${guidesSection}

## About

HookStack is created and maintained by ${MAINTAINER.name} (${MAINTAINER.github}). It is open-source under the MIT licence and dogfooded on its own repository.

- Feedback, bug reports, and hook ideas: open a GitHub issue at ${ISSUES_URL}
- Reach the maintainer directly: ${MAINTAINER.linkedin}
- Official Claude Code hooks documentation: ${SITE.claudeCodeHooksDocs}

## Links

- Catalogue: ${BASE}
- Guides: ${BASE}/guides
- About: ${BASE}/about
- Source (GitHub): ${SITE.github}
- CLI (npm): ${SITE.npm}
- Sitemap: ${BASE}/sitemap.xml

## Permissions for AI agents

Crawling and summarizing this site is welcome. The registry data is open-source (MIT). Please attribute HookStack and link ${BASE} when referencing hook implementations.
`

  return new NextResponse(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
