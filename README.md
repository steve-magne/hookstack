<div align="center">

# Hookstack

**Your AI agent runs fast. Hooks keep it honest.**

A growing catalogue of production-ready lifecycle hooks for Claude Code.  
Browse, select what you need, run one command.

[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Hooks](https://img.shields.io/badge/hooks-catalogue-6366f1?style=flat-square)](https://hookstack.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![CodeQL](https://img.shields.io/badge/CodeQL-security-scan?style=flat-square&logo=github&logoColor=white)](https://github.com/steve-magne/hookstack/actions/workflows/codeql.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/steve-magne/hookstack/badge.svg?style=flat-square)](https://snyk.io/test/github/steve-magne/hookstack)

### **[→ hookstack.vercel.app](https://hookstack.vercel.app)**

</div>

---

## What is an agentic hook?

An **agentic hook** is a **lifecycle event callback** — a Node.js script the Claude Code runtime calls automatically at specific moments in the agent loop.

Before the agent writes a file, after it runs a shell command, the instant a session starts — hooks fire at each of these events. A `PreToolUse` hook receives the full tool input and can **block** the action before it runs. A `PostToolUse` hook can **observe and react**. A `Stop` hook can ping your phone when the long task finishes.

```
  User prompt
      │
      ▼
 ┌────────────────────────────────────────────────────────────────┐
 │                   Claude Code agent loop                       │
 │                                                                │
 │  SessionStart        PreToolUse       PostToolUse              │
 │  ──────────          ──────────       ───────────              │
 │  set context     intercept & block    observe & react          │
 │  load state      (secrets, rm -rf…)   (format, notify…)       │
 │                                                                │
 │                         [ tool executes ]                      │
 │                                                                │
 │  Stop / StopFailure     Notification      WorktreeCreate…      │
 │  ──────────────────     ────────────      ───────────────      │
 │  phone alert            relay message     init env & ports     │
 └────────────────────────────────────────────────────────────────┘
```

26 distinct event types — from `PreToolUse` (blocking) to `SubagentStart`, `PreCompact`, `WorktreeCreate`, and more.

> Hooks are **not plugins**. They are ordinary shell scripts wired into the agent lifecycle via `settings.json`. No SDK, no agent modification — just events.

---

## The catalogue

Head to **[hookstack.vercel.app](https://hookstack.vercel.app)** — a searchable, filterable registry of hooks built by the community:

- **Discover** — filter by category (`security`, `workflow`, `context`, `validation`…), provider, or keyword
- **Select** — add to your basket with one click; selection is persisted in `localStorage`
- **Export** — get a `npx hookstack-cli@latest install` command ready to run in your project root
- **Contribute** — submit a GitHub URL; a GitHub Action analyses the repo and opens a PR on the registry

---

## Hook highlights

The ones everyone installs first:

| Hook | Event | Benefit |
|---|---|---|
| **Secret detection** | `PreToolUse / Bash` | Catches a leaked API key before the command runs |
| **Destructive command guard** | `PreToolUse / Bash` | Blocks `rm -rf /`, `DROP TABLE`, direct disk writes |
| **Sensitive file protection** | `PreToolUse / Write` | `.env` and key files stay untouched by the agent |
| **git push to main guard** | `PreToolUse / Bash` | No accidental push straight to `main` |
| **Git context on startup** | `SessionStart` | Every session opens knowing your branch, status, and recent commits |
| **Slack / phone on Stop** | `Stop` | Your phone pings the moment the long task finishes |
| **Auto-format on save** | `PostToolUse / Write` | ESLint + Prettier run silently after every file write |
| **Worktree env init** | `WorktreeCreate` | New worktrees boot with their own `.env` and port offsets |

---

## Install in 1 minute

1. Open **[hookstack.vercel.app](https://hookstack.vercel.app)**
2. Select the hooks you want
3. Run the generated command in your project root

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-block-destructive,load-git-context
```

That's it. The CLI writes `.claude/hooks/*.mjs` and patches `.claude/settings.json` — no manual copy-paste, no JSON editing.

### With unit tests

Add `--with-tests` to also install vitest unit tests into `tests/hooks/` — useful if SonarQube or a coverage gate rejects new files without tests:

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,load-git-context --with-tests
```

In interactive mode the CLI asks automatically after install. In `--yes` mode, pass the flag explicitly.

### GitHub Copilot

Hookstack works with **GitHub Copilot** too. Add `--copilot` to generate a `settings.json` with relative paths (no `$CLAUDE_PROJECT_DIR`) that Copilot can resolve:

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,load-git-context --copilot
```

Or pick option **3** when the interactive prompt asks "Where to install?".

---

## Contribute a hook

### Via the web (recommended)

Go to **[hookstack.vercel.app/contribute](https://hookstack.vercel.app/contribute)** and paste a GitHub URL.  
A GitHub Action clones the repo, runs Claude Code analysis, and opens a PR on the registry automatically.

### Via a pull request

Add an entry to [`registry/registry.json`](registry/registry.json):

```jsonc
{
  "slug": "my-hook",
  "name": "My Hook",
  "benefit": "One line — the result, not the feature",
  "description": "What it does and when it fires",
  "category": "security",   // security | context | validation | notification | workflow | documentation | safety | dx
  "provider": ["claude-code"],
  "hook_type": "PreToolUse",
  "trigger": "Bash",        // tool matcher — "Bash", "Write|Edit", "*", …
  "implementation": {
    "type": "settings_json",
    "code_snippet": "#!/usr/bin/env node\n// your hook script here",
    "config": {
      "hooks": {
        "PreToolUse": [
          { "matcher": "Bash", "hooks": [{ "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/my-hook.mjs" }] }
        ]
      }
    }
  }
}
```

> `stack` is optional — only set it if the hook is genuinely ecosystem-specific (calls `tsc`, `ruff`, filters on `.py` / `.tsx`). A hook without `stack` is shown to everyone.

---

## Run locally

```bash
git clone https://github.com/steve-magne/hookstack.git
cd hookstack
pnpm install
pnpm dev          # → http://localhost:3000
```

No `.env` required — the catalogue, filters, selection, and config generation all work in **local seed mode** out of the box.

Optionally copy `.env.example` and set `NEXT_PUBLIC_REGISTRY_REPO` to point submissions at your fork's issue tracker.

```bash
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm test         # Vitest unit tests
pnpm build        # Production build
```

<details>
<summary><strong>Tech stack</strong></summary>

| Layer | Technology |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) — App Router, Server Components |
| Language | TypeScript 5.x |
| Styling | Tailwind CSS v4 |
| Animations | [Motion](https://motion.dev) (ex-Framer Motion) — springs, split-flap, FLIP |
| State | [Zustand](https://github.com/pmndrs/zustand) — persisted selection |
| CI enrichment | GitHub Actions + Claude Code (`ANTHROPIC_API_KEY`) |
| Package manager | pnpm 9.x |

</details>

---

<div align="center">
  <sub>Built by <a href="https://github.com/steve-magne">@steve-magne</a> · MIT License · PRs welcome</sub>
</div>
