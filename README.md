<div align="center">

# Hookstack

**Your AI agent runs fast. Hooks keep it honest.**

A growing catalogue of production-ready lifecycle hooks for Claude Code.  
Browse, select, install with one command — your agent gets guardrails in under a minute.

[![License: MIT](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
[![Hooks](https://img.shields.io/badge/hooks-catalogue-6366f1?style=flat-square)](https://hookstack.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![CodeQL](https://img.shields.io/badge/CodeQL-security-passing?style=flat-square&logo=github&logoColor=white)](https://github.com/steve-magne/hookstack/actions/workflows/codeql.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/steve-magne/hookstack/badge.svg?style=flat-square)](https://snyk.io/test/github/steve-magne/hookstack)

### **[→ hookstack.vercel.app](https://hookstack.vercel.app)**

</div>

---

## Quickstart

Give your agent guardrails in 60 seconds: [Claude Code](#claude-code), [GitHub Copilot](#github-copilot).

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

## Installation

Installation takes under a minute. If you use more than one agent harness, install separately for each.

### Claude Code

```bash
npx hookstack-cli@latest install
```

That's it. The CLI walks you through picking hooks, writes `.claude/hooks/*.mjs`, and patches `.claude/settings.json` — no manual copy-paste, no JSON editing.

Want to fine-tune your Hookstack? Go to **[hookstack.vercel.app](https://hookstack.vercel.app)** — browse the full catalogue, select exactly what you need, and copy the generated command:

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-block-destructive,load-git-context
```

**With unit tests** — add `--with-tests` to generate Vitest tests into `tests/hooks/`:

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,load-git-context --with-tests
```

### GitHub Copilot

Add `--copilot` to generate a `settings.json` with relative paths that Copilot can resolve:

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,load-git-context --copilot
```

Or pick option **3** when the interactive prompt asks "Where to install?".

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
- **pre-bash-block-destructive** — Blocks `rm -rf /`, `DROP TABLE`, direct disk writes, and other foot-guns
- **pre-write-protect-dotenv** — `.env` and key files stay untouched by the agent, always
- **pre-bash-no-push-to-main** — Hard stop on any `git push` targeting `main` or `master`
- **pre-bash-no-force-push** — Prevents `--force` and `--force-with-lease` on any remote push

### Context

- **load-git-context** — Injects current branch, status, and last 5 commits at session start
- **session-summary** — Writes a plain-text summary of what was done at the end of every session
- **worktree-env-init** — Copies `.env`, assigns a free port, runs install — every worktree, every time

### Validation

- **stop-per-file-coverage** — After each session, flags any file touched without test coverage ≥ 80 %
- **stop-per-file-lint** — ESLint runs on every file the agent modified before Stop fires
- **post-write-format** — Prettier + ESLint auto-format silently after every Write or Edit
- **enforce-package-managers** — Blocks `npm` or `yarn` commands when the project uses `pnpm`
- **per-file-type-check** — Runs `tsc --noEmit` on touched TypeScript files before closing

### Notification

- **stop-slack-notify** — Posts a Slack message with the session result and duration
- **stop-push-notify** — Sends a push notification to your phone when a long task finishes
- **stop-git-summary** — Creates a `git` commit message draft from the session diff on Stop

### Workflow

- **pre-bash-confirm-migration** — Asks for confirmation before any database migration command runs
- **post-tool-log** — Appends every tool call and its result to a session log file
- **registry-auto-sync** — Re-syncs `registry.json` whenever a hook `.mjs` is edited (meta: powers this repo)

### Safety

- **pre-bash-no-install-global** — Blocks `npm install -g` and `pip install` outside of a virtualenv
- **pre-bash-no-curl-pipe-sh** — Intercepts `curl … | sh` patterns before they execute
- **pre-write-no-binary** — Prevents writing binary blobs into source-controlled paths

### DX

- **post-test-notify** — Plays a sound and shows a macOS notification when a test run finishes
- **session-cost-tracker** — Tracks token usage per session and writes a weekly CSV summary

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

- **Catalogue**: [hookstack.vercel.app](https://hookstack.vercel.app)
- **Issues**: [github.com/steve-magne/hookstack/issues](https://github.com/steve-magne/hookstack/issues)
- **Contribute a hook**: [hookstack.vercel.app/contribute](https://hookstack.vercel.app/contribute)
- **npm**: [npmjs.com/package/hookstack-cli](https://www.npmjs.com/package/hookstack-cli)

---

<div align="center">
  <sub>Built by <a href="https://github.com/steve-magne">@steve-magne</a> · MIT License · PRs welcome</sub>
</div>
