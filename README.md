<div align="center">

<h1>🪝 Hookit</h1>

<p><strong>Community catalogue of agentic hooks for Claude Code & GitHub Copilot.</strong><br/>
Discover, select, and generate a drop-in <code>settings.json</code> in seconds.</p>

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Motion](https://img.shields.io/badge/Motion-12-FF4154?logo=framer&logoColor=white)](https://motion.dev)
[![Zustand](https://img.shields.io/badge/Zustand-4-FF6B35)](https://github.com/pmndrs/zustand)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## What is Hookit?

**Agentic hooks** are shell scripts that Claude Code and GitHub Copilot run automatically around every tool call — before writing a file, after running a command, on session start. They enforce security rules, auto-format code, run type checks, and pipe notifications to Slack — all without a single manual step.

Hookit is the community registry that makes hooks **discoverable**. Browse by category or event, select the ones you need, and copy a ready-to-paste `settings.json`.

## Features

- **Browse** — filter by category (`security`, `validation`, `workflow`…), provider, or keyword search
- **Select** — add hooks to your basket with one click; selection is persisted in localStorage
- **Generate** — export a valid `settings.json` fragment (or full config) ready to drop into `.claude/`
- **Contribute** — submit a GitHub repo URL; a GitHub Action clones it, runs Claude Code analysis, and opens a PR on the registry
- **Works offline** — fully functional with the local seed; Supabase is optional (GitHub auth + submission persistence)

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) — App Router, Server Components |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS v4 |
| Animations | [Motion](https://motion.dev) (ex-Framer Motion) — springs, split-flap, FLIP |
| State | [Zustand](https://github.com/pmndrs/zustand) — persisted selection |
| Backend (optional) | [Supabase](https://supabase.com) — GitHub auth + submissions |
| CI enrichment | GitHub Actions + Claude Code (`ANTHROPIC_API_KEY`) |
| Package manager | pnpm 9.x |

## Getting started

```bash
git clone https://github.com/steve-magne/hookit.git
cd hookit
pnpm install
pnpm dev          # → http://localhost:3000
```

> No `.env` needed. The POC runs fully in **local seed mode** — catalogue, filters, selection, and config generation work out of the box.

To enable GitHub auth and submission persistence, copy `.env.example` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

## Project structure

```
hookit/
├── src/
│   ├── app/                  # Next.js App Router pages (Server Components)
│   ├── components/           # React components (all 'use client')
│   │   ├── CatalogueExplorer # Search, group toggle, hook list, modal
│   │   ├── HookRow           # Hook list item — hover = preview, click = modal
│   │   ├── HookModal         # Full hook detail (use cases, config, script)
│   │   ├── HookConfigurator  # Selection basket + settings.json generator
│   │   └── SplitFlap         # Split-flap (Solari board) reveal animation
│   ├── lib/
│   │   ├── hooks.ts          # allHooks — reads registry.json
│   │   ├── motion.ts         # Shared motion tokens (springs, variants)
│   │   └── mergeConfig.ts    # Merges selected hooks → valid settings.json
│   ├── store/selection.ts    # Zustand — persisted hook slugs
│   └── types/hook.ts         # Hook type definition
├── registry/
│   └── registry.json         # Single source of truth for the catalogue
├── .claude/
│   ├── settings.json         # Active Claude Code hooks for this project
│   └── hooks/                # Node.js hook scripts (.mjs)
└── .github/
    └── workflows/analyze-repo.yml  # CI: repo submission → PR on registry
```

## Adding a hook to the registry

Add an entry to `registry/registry.json` following the `Hook` type. Key fields:

```jsonc
{
  "slug": "my-hook",
  "name": "My Hook",
  "benefit": "One line — why a dev would install this",
  "description": "What it does",
  "category": "security",        // security | context | validation | notification | workflow | documentation
  "provider": ["claude-code"],
  "hook_type": "PreToolUse",
  "trigger": "Bash",
  "implementation": {
    "type": "settings_json",
    "config": {
      "hooks": {
        "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "node .claude/hooks/my-hook.mjs" }] }]
      }
    }
  }
}
```

> `stack` is optional — only set it if the hook is genuinely ecosystem-specific (e.g. calls `tsc`, `ruff`, or filters on `.py`/`.tsx`). A hook without `stack` is shown to everyone.

## Automated enrichment (CI)

On the repository hosting the registry, set the `ANTHROPIC_API_KEY` secret. The Action triggers on issues labelled `repo-submission`, clones the target repo, runs Claude Code analysis, and opens a PR labelled `auto-generated`.

## Scripts

```bash
pnpm dev          # Dev server (port 3000)
pnpm build        # Production build
pnpm typecheck    # TypeScript check (no emit)
pnpm lint         # ESLint via next lint
pnpm test         # Vitest unit tests
```

## Contributing

PRs welcome — bug fixes, new hooks in `registry/registry.json`, and UI improvements. Open an issue first for large changes.

---

<div align="center">
  <sub>Built by <a href="https://github.com/steve-magne">@steve-magne</a> · MIT License</sub>
</div>
