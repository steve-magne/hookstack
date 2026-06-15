# Contributing to Hookstack

Thank you for taking the time to contribute. Hookstack is an open catalogue — every hook you add benefits every developer who installs it.

This guide covers everything you need: local setup, the hook authoring contract, the review process, and the CI gates your PR must pass.

---

## Table of contents

- [Ways to contribute](#ways-to-contribute)
- [Before you start](#before-you-start)
- [Local setup](#local-setup)
- [Adding a hook](#adding-a-hook)
  - [1. Write the script](#1-write-the-script)
  - [2. Write the test](#2-write-the-test)
  - [3. Add registry metadata](#3-add-registry-metadata)
  - [4. Sync and verify](#4-sync-and-verify)
- [Hook conventions](#hook-conventions)
- [CI gates](#ci-gates)
- [Pull request process](#pull-request-process)
- [Reporting bugs and requesting features](#reporting-bugs-and-requesting-features)
- [Inner-sourcing guidelines](#inner-sourcing-guidelines)
- [Decision-making](#decision-making)

---

## Ways to contribute

| What | Where |
|---|---|
| Add a new hook to the catalogue | Fork → branch → PR (see [Adding a hook](#adding-a-hook)) |
| Fix a bug in an existing hook | Same flow — the `.mjs` is the source of truth |
| Improve registry metadata (`benefit`, `description`, `use_cases`) | Edit `registry/registry.json` directly, open a PR |
| Improve the website (`/src`) | Standard Next.js PR — read [DESIGN.md](DESIGN.md) first |
| Improve the CLI (`/packages/cli`) | Update `core.mjs` + tests under `tests/cli/` |
| Report a bug | [Open an issue](https://github.com/steve-magne/hookstack/issues) |
| Request a hook idea | Open an issue with label `hook-request` |

---

## Before you start

- **Read [CLAUDE.md](CLAUDE.md)** — it documents the architecture, the sync workflow, the data model, and the non-negotiable rules. Most questions are answered there.
- **Check open issues and PRs** — your idea may already be in progress.
- **For large changes** (new subsystem, breaking registry schema change, new CLI flag), open a discussion issue *before* writing code. Alignment first saves everyone time.

---

## Local setup

```bash
git clone https://github.com/steve-magne/hookstack.git
cd hookstack

# Node 22 is required (.nvmrc)
nvm use          # or: fnm use / volta install node

pnpm install
pnpm dev         # → http://localhost:3000
```

Verify everything passes before making changes:

```bash
pnpm typecheck
pnpm test
pnpm validate:registry
node .claude/sync-hooks.mjs --check
node .claude/hooks-timeline.mjs --check
```

All five commands must exit 0. If one fails on a clean checkout, open an issue.

---

## Adding a hook

A hook is three things in sync: a `.mjs` script, a Vitest test, and a metadata entry in `registry.json`. The sync script ties them together.

### 1. Write the script

Create `.claude/hooks/<slug>.mjs`. Follow the mandatory pattern:

```js
#!/usr/bin/env node
// @hookstack <slug>   ← injected automatically by sync — do not write this line manually

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Default real dependencies
const defaultExec = (cmd, opts) => { /* … */ };

export function run(input, { exec = defaultExec } = {}) {
  // Pure logic — no stdin/stdout/process.exit here
  // Returns: { decision, reason } | { exitCode, message } | string | null
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
```

Key rules at a glance — see [Hook conventions](#hook-conventions) for the full list.

### 2. Write the test

Create `tests/hooks/<slug>.test.mjs`:

```js
import { describe, it, expect, vi } from 'vitest';
import { run } from '../../.claude/hooks/<slug>.mjs';

describe('<slug>', () => {
  it('blocks when …', () => {
    const result = run({ /* input */ }, { exec: vi.fn() });
    expect(result.decision).toBe('block');
  });

  it('allows when …', () => {
    const result = run({ /* input */ });
    expect(result).toBeNull();
  });
});
```

Coverage requirement: **≥ 80 % of lines in the `.mjs`**. The CI gate `stop-per-file-coverage` enforces this. Run `pnpm test` and check the output.

### 3. Add registry metadata

Append an entry to `registry/registry.json`. Required fields:

```jsonc
{
  "slug": "my-hook",
  "name": "My Hook",
  "benefit": "One line — result-oriented, ≤ 60 chars. Why a dev installs it.",
  "description": "Longer explanation of what it does and when.",
  "category": "quality",          // quality | security | workflow | productivity | context
  "hook_type": "PostToolUse",     // Claude Code lifecycle event
  "trigger": "Write|Edit",        // tool matcher or "*"
  "provider": ["claude"],         // claude | codex | copilot
  "use_cases": [
    "Catches type errors immediately after every file edit.",
    "Surfaces unused imports before they reach review."
  ],
  "implementation": {
    "type": "settings_json",
    "script_path": ".claude/hooks/my-hook.mjs",
    "config": {
      "hooks": {
        "PostToolUse": [
          {
            "matcher": "Write|Edit",
            "hooks": [{ "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/my-hook.mjs" }]
          }
        ]
      }
    }
  },
  "code_snippet": ""   // leave empty — filled by sync
}
```

> **`benefit` is the hero field.** It appears on hover cards and in the modal. Make it punchy and result-oriented ("Catches type errors immediately") not feature-oriented ("Runs tsc").

**`stack` field** — only add it if the hook is genuinely ecosystem-specific. Check your script: if it filters by `.py`/`.tsx?` or calls a non-universal tool (`ruff`, `tsc`, `eslint`), annotate `"stack": ["typescript"]` or `"stack": ["python"]`. Do not infer `stack` from tags alone — read the code.

**External tools** — if your hook requires a CLI tool (`jscpd`, `gh`, `uv`…), add a hint to `PREREQ_HINTS` in [`packages/cli/bin/core.mjs`](packages/cli/bin/core.mjs). The installer will show users how to get the dependency.

### 4. Sync and verify

```bash
node .claude/sync-hooks.mjs        # injects @hookstack fingerprint + fills code_snippet + rebuilds settings.json
pnpm test                          # must stay green
pnpm validate:registry             # schema validation
node .claude/sync-hooks.mjs --check   # must exit 0 (no drift)
```

After committing your `.mjs` (so it has a git date):

```bash
pnpm timeline    # regenerates hooks-timeline.json, the SVG heatmap, and the README block
```

Commit the three generated artefacts too — CI's `--check` flag will catch any drift.

---

## Hook conventions

These are non-negotiable. A PR that violates them will not be merged.

**Structure**

- **One file, one responsibility.** No catch-all hooks that do five things.
- **Export `run(input, deps)`** — all logic lives here. Returns a result value or `null`; never calls `process.exit` or writes to stdout/stderr directly.
- **Inject side effects.** `execSync`, `fs`, `fetch`, timestamps, `process.platform` — all come in via `deps` with real defaults. This is what makes the hook testable without mocking the module system.
- **Entry guard only marshals.** The `if (process.argv[1] === …)` block reads stdin, calls `run`, marshals the result — nothing else. Mark it `/* v8 ignore */`.

**Behavior**

- **`PreToolUse` — blocking, actionable.** If you block, `reason` must tell the developer what to do, not just what was rejected.
- **`PostToolUse` — non-blocking, silent on absence.** A missing tool (`--no-install`) is caught with try/catch and discarded. Never crash Claude Code over an optional check.
- **Timeout every `execSync`.** Pass `{ timeout: 10_000 }` (10 s) or less. A hook that hangs blocks the agent.
- **Filter before running heavy tools.** Check file extensions (`/.tsx?$/.test(filePath)`) before invoking `tsc` or `eslint`.

**Node.js only**

Hooks are `.mjs` — even for Python or Java projects. Node.js is the only runtime guaranteed to be present (Claude Code depends on it). A "Python hook" is a `.mjs` that calls Python tools via `execSync`. Always prefer `uv run <tool>` over calling `ruff`/`pytest`/`pyright` directly: it resolves the project venv automatically.

---

## CI gates

Every PR runs:

| Check | Command | Fails when |
|---|---|---|
| TypeScript | `pnpm typecheck` | Type errors in `/src` or `/packages` |
| Tests | `pnpm test` | Any test fails or coverage < 80 % |
| Registry schema | `pnpm validate:registry` | Unknown field, missing required field, invalid enum |
| Hook drift | `node .claude/sync-hooks.mjs --check` | `code_snippet` in registry diverged from the `.mjs` on disk |
| Timeline drift | `node .claude/hooks-timeline.mjs --check` | Generated artefacts diverged from git history |

All five must be green. Run them locally before pushing to avoid back-and-forth.

---

## Pull request process

1. **Branch** off `main`: `git checkout -b feat/my-hook` (or `fix/`, `docs/`).
2. **Keep PRs focused.** One hook per PR. Fixes to existing hooks should not bundle unrelated changes.
3. **Fill the PR template.** Describe what the hook does, why it's useful, and what edge cases you tested.
4. **Self-review before requesting review.** Go through the [Hook conventions](#hook-conventions) checklist yourself.
5. **CI must be green.** PRs with failing checks are not reviewed.
6. **One approval is required** from a maintainer before merge.
7. **Squash or rebase** — the maintainer will squash on merge to keep the git history clean.

---

## Reporting bugs and requesting features

Use [GitHub Issues](https://github.com/steve-magne/hookstack/issues).

For bugs:
- Include the hook slug, the Claude Code version, and the OS.
- Paste the raw stdin JSON the hook received if possible (enable debug output by running the script directly: `echo '{"…"}' | node .claude/hooks/<slug>.mjs`).

For hook requests:
- Describe the *problem* you want to solve, not the implementation.
- Add label `hook-request`.

---

## Inner-sourcing guidelines

Hookstack follows an inner-sourcing model: contributions are welcome from anyone, and the review process is transparent. A few norms that make this work:

**Catalogue quality over quantity.** A hook that does one thing well and has a test is better than a feature-rich hook without one. When in doubt, start small.

**The `.mjs` is the source of truth.** Never edit `code_snippet` in `registry.json` by hand — it will be overwritten on the next sync. Always go through the `.mjs` → test → sync workflow.

**No silent breaking changes.** The `implementation.config` fragment ships to users' `settings.json` files. A change to an existing hook's config must be backward-compatible or flagged as a breaking change in the PR description.

**Registry schema is strict.** The schema (`registry/registry.schema.json`) has `additionalProperties: false`. If you need a new field, open a discussion first — it requires a schema update, a type update (`src/types/hook.ts`), and a migration of existing entries.

**Docs are part of the change.** If your hook changes the CLI behavior, update [`packages/cli/README.md`](packages/cli/README.md). If it changes a user-facing flow, update [`README.md`](README.md) and the website copy in [`/src`](src/). The three surfaces (GitHub README, website, npm README) must stay consistent.

**Be explicit about scope.** Use `stack` to narrow a hook to an ecosystem — don't let a Python-only hook appear in a TypeScript developer's catalogue. Read the code; don't guess from tags.

---

## Decision-making

- **Unambiguous changes** (new hook that follows conventions, doc fix, bug fix with test): merge after one maintainer approval.
- **Catalog-wide changes** (new category, renamed field, new CLI flag): open an issue for discussion, get lazy consensus (3 days, no objections), then PR.
- **Breaking changes** (registry schema change, hook contract change): requires an explicit decision in the issue, a migration path, and a CHANGELOG entry.

The project has a single maintainer today (@steve-magne). If a PR receives no response in 14 days, ping the maintainer in the issue.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE) that covers this project.
