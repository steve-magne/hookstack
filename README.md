<div align="center">

# Hookstack

**Your AI agent runs fast. Hooks keep it honest.**

A growing catalogue of production-ready lifecycle hooks for Claude Code.  
Browse, select, install with one command — your agent gets guardrails in under a minute.

[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Hooks](https://img.shields.io/badge/hooks-catalogue-6366f1?style=flat-square)](https://www.hookstack.app/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![CodeQL](https://img.shields.io/badge/CodeQL-security-passing?style=flat-square&logo=github&logoColor=white)](https://github.com/steve-magne/hookstack/actions/workflows/codeql.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/steve-magne/hookstack/badge.svg?style=flat-square)](https://snyk.io/test/github/steve-magne/hookstack)

### **[→ hookstack.app](https://www.hookstack.app/)**

<img src="public/demo-hookstack.gif" alt="HookStack Mode Demo" width="600"/>

</div>

---

## Promise

Install a production-ready Claude Code HookStack in one command - Up and running in 60 seconds.

---

## Installation

Installation takes under a minute.

```bash
npx hookstack-cli@latest install
```

That's it. The CLI walks you through picking hooks, writes `.claude/hooks/*.mjs`, and patches `.claude/settings.json`, `tests/*` associated if needed — no manual copy-paste, no JSON editing.

Want to fine-tune your Hookstack? Go to **[hookstack.app](https://www.hookstack.app/)** — browse the full catalogue, select exactly what you need, and copy the generated command:

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-block-destructive,session-start-load-git-context
```

---

## How it works

The moment your agent starts a session, it knows absolutely nothing about your environment. It doesn't know which branch you're on, doesn't know your `.env` has secrets, doesn't know that `rm -rf /` is a terrible idea. It just runs.

Hooks change that.

A hook is an ordinary Node.js script wired into the Claude Code lifecycle via your `settings.json`. No SDK, no plugin system — just events. When the agent is about to run a shell command, a `PreToolUse` hook fires first. It reads the full command, and it can **block** it. When the agent writes a file, a `PostToolUse` hook can reformat it automatically. When a long task finishes, a `Stop` hook can ping your phone.

Hookstack is the catalogue of these scripts — written, tested, and ready to install. You pick the ones you want, run one `npx` command, and your project gets a `.claude/hooks/` folder and a patched `settings.json`. Done.

The result: your agent still moves fast. It just can't do the dumb things anymore.

---

## Sponsorship

If Hookstack has saved your production secrets or stopped a runaway `rm -rf`, I'd love it if you'd [give the repo a star](https://github.com/steve-magne/hookstack) or [sponsor the work](https://github.com/sponsors/steve-magne).

Thanks!
— Steve

---

## The Lifecycle

Hooks fire at 26 distinct points in the Claude Code agent loop. Here is how the most important ones fit together:

**1. SessionStart — set the stage**

Fires the instant a session opens. Use it to inject context: current branch, recent commits, open issues. Your agent starts informed instead of cold.

**2. PreToolUse — intercept before it's too late**

Fires *before* any tool executes and can block it outright. The right place for security: secrets in commands, destructive filesystem ops, pushes to `main`, writes to `.env`. The agent sees your `reason` and adjusts — it doesn't just get a wall.

**3. PostToolUse — observe and react**

Fires *after* a tool completes, non-blocking. Run ESLint + Prettier after every file write. Record what the agent touched. Validate that the file it wrote actually parses. The agent keeps moving; the hook handles the cleanup.

**4. Stop / StopFailure — close the loop**

Fires when the agent finishes (success or failure). Ping Slack. Send a push notification. Write a session summary to disk. The work is done — now you find out about it.

**5. WorktreeCreate — bootstrap new environments**

Fires when a new worktree is created. Copy `.env`, assign a free port, run `pnpm install`. Every worktree starts ready, not broken.

---

## What's Inside

### Security

- **pre-bash-secret-detection** — Catches API keys, tokens, and passwords before any shell command runs
- **pre-write-secret-detection** — Blocks the agent from hardcoding a secret into any file it writes
- **pre-bash-block-destructive** — Blocks `rm -rf /`, `DROP TABLE`, direct disk writes, and other foot-guns
- **pre-edit-protect-paths** — `.env` and key files stay untouched by the agent, always
- **pre-read-env-guard** — `.env` secrets never enter the model context in the first place
- **pre-bash-guard-git-push-main** — Hard stop on any `git push` targeting `main` or `master`

### Context

- **session-start-load-git-context** — Injects current branch, status, and last commit at session start
- **session-start-github-context** — Open PRs and CI check status loaded before you ask
- **worktree-create-setup-env** — Copies `.env`, assigns a free port, runs install — every worktree, every time
- **pre-read-file-to-markdown** — Read any PDF, DOCX or PPTX as clean Markdown — slash token usage

### Validation

- **stop-per-file-coverage** — After each session, flags any file touched without test coverage ≥ 80 %
- **stop-per-file-lint** — ESLint runs on every file the agent modified before Stop fires
- **post-write-autoformat** — Prettier auto-formats silently after every Write or Edit
- **pre-bash-enforce-package-managers** — Blocks `npm` or `yarn` commands when the project uses `pnpm`
- **post-edit-typecheck** — Runs `tsc --noEmit` on touched TypeScript files right after an edit
- **post-edit-conflict-marker-check** — Leftover merge conflict markers caught the moment a file is written

### Notification

- **notification-slack** — Pings your Slack when the agent needs you mid-session
- **stop-sound** — A completion chime the moment Claude finishes
- **stop-tts-completion** — Get told out loud the moment work is done

### Workflow

- **session-start-worktree-if-main** — Start a session on `main` and you're moved to a fresh worktree
- **post-bash-command-log** — A full history of every command Claude ran
- **registry-changed-auto-sync** — Re-syncs `registry.json` whenever a hook `.mjs` is edited (meta: powers this repo)

### Documentation

- **stop-generate-changelog** — An automatic changelog of what the agent shipped, session by session

---

## Philosophy

- **Hooks are not plugins.** They are ordinary shell scripts. No SDK, no agent modification — just events and `settings.json`.
- **Block early, not late.** A `PreToolUse` hook that stops a bad command costs nothing. A runaway `rm -rf` costs everything.
- **Zero overhead by default.** Hooks that don't match exit in milliseconds. A `PostToolUse` hook that can't find ESLint is silent, not crashing.
- **Tested like production code.** Every hook in the catalogue ships with a Vitest unit test. The CI gate rejects any hook without coverage ≥ 80 %.
- **Dogfooded.** The hooks in this catalogue are active on this very repository. They run on every Claude Code session that touches `hookstack`. Bugs surface fast.

---

## Contributing

### Via a pull request

1. Fork the repository
2. Write your hook as `.claude/hooks/<slug>.mjs` following the [conventions below](#hook-conventions)
3. Add a test in `tests/hooks/<slug>.test.mjs` and verify `pnpm test` passes
4. Add the metadata entry to `registry/registry.json` (see the schema in [CLAUDE.md](CLAUDE.md))
5. Run `node .claude/sync-hooks.mjs` to propagate the code into `code_snippet`
6. Submit a PR — CI runs `pnpm typecheck`, `pnpm test`, and a drift check

### Hook conventions (short version)

- One file, one responsibility. No catch-all hooks.
- Export `run(input, deps = {})` — pure logic, injectable fakes, returns a result or `null`.
- The entry-point guard reads stdin, calls `run`, marshalls — nothing else.
- `PreToolUse` hooks must provide an actionable `reason`, not just "blocked".
- `PostToolUse` hooks must be non-blocking: tool-absent errors are silent.
- Timeout every `execSync` call — no hook should hang indefinitely.

Full conventions: [CLAUDE.md → Conventions hooks](CLAUDE.md#conventions-hooks-claude-code).

---

## Run locally

```bash
git clone https://github.com/steve-magne/hookstack.git
cd hookstack
pnpm install
pnpm dev          # → http://localhost:3000
```

```bash
# pnpm typecheck   \
# pnpm lint         > Don't need those — Hookstack does it for you.
# pnpm test        /
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

## Updating

```bash
npx hookstack-cli@latest update
```

The CLI re-fetches each installed hook from the registry and overwrites the local `.mjs`. Your `settings.json` is not touched unless the config fragment changed.

---

## Community

Hookstack is built by [Steve Magne](https://github.com/steve-magne) with contributions from the Claude Code community.

- **Catalogue**: [hookstack.app](https://www.hookstack.app/)
- **Issues**: [github.com/steve-magne/hookstack/issues](https://github.com/steve-magne/hookstack/issues)
- **Contribute a hook**: [hookstack.app/contribute](https://www.hookstack.app/contribute)
- **npm**: [npmjs.com/package/hookstack-cli](https://www.npmjs.com/package/hookstack-cli)

---

<div align="center">
  <sub>Built by <a href="https://github.com/steve-magne">@steve-magne</a> · MIT License · PRs welcome</sub>
</div>
