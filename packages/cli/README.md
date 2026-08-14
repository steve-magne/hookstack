# hookstack-cli

**Install Claude Code hooks in one command — also for OpenAI Codex and GitHub Copilot.**

[hookstack.app](https://www.hookstack.app) — the community catalogue of Claude Code hooks (and Codex & Copilot hooks). Browse, select, and wire them into your project with one command. The same hooks install for any of the three supported agents; only the config file format differs.

---

## Quick start

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-block-destructive
```

That's it. The CLI fetches the hooks, shows you what will be installed, and patches your `.claude/settings.json`.

Running `install` with no `--hooks` installs the default HookStack — and **detects your project's setup** to pick the right hooks:

- **Stack detection** (language): looks for `package.json`/`pyproject.toml`/etc. and skips default hooks that don't apply — e.g. no Biome hook in a pure Python project. Override with `--stacks=typescript,python`.
- **Contextual detection** (systems): spots an i18n setup, an `okf/` knowledge bundle, a Next.js app, a front-end codebase, or a GitHub-hosted repo, and suggests (interactive) or auto-adds (`--yes`) the matching non-default hooks — see [Smart toolstack detection](#smart-toolstack-detection).

An explicit `--hooks=` list is always installed as-is, never filtered. `--no-detect` opts out of both detection layers.

---

## Usage

```
npx hookstack-cli@latest install --hooks=<slug1>,<slug2>,...
npx hookstack-cli@latest update
npx hookstack-cli@latest contribute

Options:
  --hooks <slugs>    Comma-separated hook slugs (install — required; contribute — optional filter)
  --project          Claude Code, this project — ./.claude (default)
  --global, -g       Claude Code, all projects — ~/.claude
  --codex-project    OpenAI Codex, this project — ./.codex/hooks.json (committed)
  --codex-profile    OpenAI Codex, all projects — ~/.codex/hooks.json
  --copilot          GitHub Copilot — ./.claude with paths adapted for Copilot
  --scope <s>        "project" (default), "global", "copilot",
                     "codex-project", or "codex-profile"
  --with-tests       Also install unit tests into tests/hooks/ — vitest (.mjs) or pytest
                     (Python projects, .py variants) — install, project scope only
  --stack <s>        "auto" (default) — filter hooks to the detected project toolchain;
                     "typescript" / "python" force one stack; "all" disables filtering
  --stacks <list>    Override stack detection (e.g. --stacks=typescript,python)
  --no-detect        Skip all detection (stack + contextual systems), install the full default set
  --yes, -y          Skip prompts (non-interactive / CI)
  --version, -v      Print version
  --help, -h         Show help
```

### Target agents & scopes

The hook code is identical across agents — only the config file it's wired into changes. Pick a target with a flag (or via the interactive menu):

| Flag | Agent | Scope | Config file | Scripts dir |
|---|---|---|---|---|
| `--project` (default) | Claude Code | this project | `.claude/settings.json` | `.claude/hooks/` |
| `--global`, `-g` | Claude Code | all projects | `~/.claude/settings.json` | `~/.claude/hooks/` |
| `--codex-project` | OpenAI Codex | this project | `.codex/hooks.json` (committed) | `.codex/hooks/` |
| `--codex-profile` | OpenAI Codex | all projects | `~/.codex/hooks.json` | `~/.codex/hooks/` |
| `--copilot` | GitHub Copilot | this project | `.claude/` paths adapted | `.claude/hooks/` |

Codex and Claude Code expose the same lifecycle event names (`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`…), so a HookStack hook is portable between them without any change to the script (`.mjs`, or the `.py` variant on a Python install) — the CLI just writes the appropriate config format.

### Interactive mode (default in a terminal)

When run in a terminal the CLI opens an interactive prompt:

1. Asks which **target agent** to install for — the menu order is: This project → All my projects → Codex profile → Codex project → GitHub Copilot
2. Fetches the requested hooks from the registry
3. Shows an **installation summary** (path, category, events, blocking flag)
4. Shows a **security panel** (shell access · network · filesystem writes · Snyk score)
5. Asks for confirmation before writing anything

### Non-interactive mode (`--yes` or piped)

Skips all prompts — useful in CI or dotfile bootstrap scripts.

```bash
# CI bootstrap (Claude Code, project)
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-guard-git-push-main --yes --scope=project

# CI bootstrap with unit tests (avoids SonarQube gating on new files without tests)
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-guard-git-push-main --yes --with-tests

# CI bootstrap for OpenAI Codex (committed ./.codex/hooks.json)
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-guard-git-push-main --yes --scope=codex-project
```

### Smart toolstack detection

On the **default install** (`no --hooks`), besides the language-stack filter above, the CLI probes your project for the non-language systems you actually use and suggests hooks that only make sense when that system is present:

| Signal | Detected when | Hooks added |
|---|---|---|
| `i18n` | a `locales/` / `locale/` / `messages/` / `i18n/` directory exists anywhere in the tree, or an i18n package (`next-intl`, `react-i18next`, `i18next`, `react-intl`…) is in `package.json` | `stop-i18n-validation` — keeps translation files consistent on every session stop |
| `okf` | a top-level `okf/` (or `.okf/`, any case) knowledge bundle exists | `okf-validate-on-change` · `session-start-okf-staleness` · `stop-okf-staleness-check` — validate and keep the OKF bundle fresh |
| `nextjs` | `next` in `package.json`, or a `next.config.{js,mjs,cjs,ts}` at the root | `post-write-nextjs-quality` — catches missing `'use client'`, Pages Router patterns, and missing `next/image`/`next/link` |
| `frontend` | a front-end framework in `package.json` (`react`, `vue`, `svelte`, `astro`, `preact`, `solid-js`, `@angular/core`…) | `post-edit-visual-check` — reminds the agent to verify UI changes actually render |
| `github` | a `.github/` directory, or a git remote pointing at `github.com` | `session-start-github-context` — loads open PRs and branch check status at session start |

- **Interactive** installs ask before adding them (a multi-select, pre-checked — uncheck to skip)
- **`--yes`** installs auto-add them and report what was detected (e.g. `⚡ Detected an i18n/translation system + an OKF knowledge bundle — auto-added: …`)
- Detection is **best-effort**: a probe or fetch failure never aborts the install
- Already-installed hooks are never re-suggested (fingerprint-based)
- Global/profile scopes (`global`, `codex-profile`) skip detection by design — they target any project, so there's nothing to detect against
- Skip it entirely with `--no-detect` (same flag as the stack filter)

---

### Python hooks & Python tests (`.py` + pytest)

On a pure-Python install (detected toolchain, or `--stack=python`), hooks that have a **Python variant** are installed as real `.py` scripts (`python3 $CLAUDE_PROJECT_DIR/.claude/hooks/<slug>.py` in `settings.json`), and `--with-tests` writes **pytest** tests (`tests/hooks/test_<slug>.py`) instead of vitest tests. Vitest tests are **never** installed on Python projects — so the project's CI stays Python-only, with no `npm`/`node` added just to test the hooks.

```bash
# Python project (pyproject.toml present) — hooks land as .py, tests as pytest
npx hookstack-cli@latest install --with-tests
```

Every hook in the default stack carries a Python variant, so a default Python install is **100 % `.py` — zero `.mjs` fallback** (66 Python hooks today — the install summary only prints a `N Python · M .mjs fallback` line when a fallback actually occurs). Hooks outside the default stack (picked explicitly) without a Python variant still fall back to the `.mjs`. `update` compares and refreshes the installed variant (`.py` on Python projects, `.mjs` otherwise).

---

## What gets installed

For each hook the CLI:

- Writes the hook script (`.mjs`, or the `.py` variant on pure-Python installs) to the scripts directory for the chosen agent (`.claude/hooks/`, `~/.claude/hooks/`, `.codex/hooks/`, or `~/.codex/hooks/`)
- Patches the agent's config file (`.claude/settings.json` or `.codex/hooks.json`) to register the hook on the right lifecycle event
- Optionally writes unit tests to `tests/hooks/` when `--with-tests` is passed (or confirmed interactively) — vitest on Node projects, pytest on Python projects

The same hook code is used regardless of agent — Claude Code and Codex share lifecycle event names, so only the config file format changes. No new dependencies are added to your project. Hooks are plain Node.js/Python scripts — no SDK, no agent modification.

---

## Updating

Hooks evolve — bug fixes, new options, the occasional rewrite. To pull the latest version of everything you've already installed:

```bash
npx hookstack-cli@latest update
```

No `--hooks` needed: the CLI scans the scripts directory for the target scope (`.claude/hooks/` by default), reads the `// @hookstack <slug>` (or `# @hookstack <slug>` on Python variants) fingerprint each script carries, and re-fetches exactly those hooks from the live registry. Each hook's metadata (code, config, tests) is served live from [hookstack.app](https://www.hookstack.app) — never bundled in the npm package — so `update` always gets what's currently on the catalogue, no CLI version bump required.

- Scripts whose content changed are overwritten; unchanged ones are left alone and reported separately
- `settings.json` (or `hooks.json` for Codex) is re-merged — it's only actually touched if a hook's config fragment changed, since the merge is idempotent
- Existing test files under `tests/hooks/` are refreshed for hooks that already have one; `update` never creates new test files (use `--with-tests` on `install` for that)

If you installed somewhere other than the default project scope, pass the same scope flag you used to install:

```bash
npx hookstack-cli@latest update --global          # ~/.claude
npx hookstack-cli@latest update --codex-project    # ./.codex/hooks.json
```

---

## Contributing changes back

Tweaked a hook locally and want the catalogue to have it? `contribute` turns that edit into a pull request:

```bash
npx hookstack-cli@latest contribute
```

It scans your installed hooks (same `@hookstack` fingerprint lookup as `update`), finds the ones whose local script (`.mjs`, or the `.py` variant on a Python install) no longer matches the live registry, lets you pick which to send, then opens a PR with your version of those files — forking [steve-magne/hookstack](https://github.com/steve-magne/hookstack) for you, or pushing a branch straight to it when your `gh` account owns the repo (no fork needed). Renamed hook files work too — detection follows the fingerprint, not the filename.

**Unit tests ride along.** If you installed with `--with-tests` and edited the matching test file (`tests/hooks/<slug>.test.mjs` on Node, `tests/hooks/test_<slug>.py` on Python — or wrote one where the catalogue ships none), the modified test file is pushed with its hook — the PR body lists every test included. The upstream repo's CI gate requires ≥ 80 % coverage (vitest on Node, pytest on Python), so shipping the test with the script is what makes a contribution mergeable.

Requires the [GitHub CLI](https://cli.github.com) (`gh`), already authenticated (`gh auth login`).

```bash
npx hookstack-cli@latest contribute --hooks=my-edited-hook   # only contribute specific hooks
npx hookstack-cli@latest contribute --yes                    # non-interactive, sends every modified hook
```

---

## Finding hooks

Browse and filter the full catalogue at **[hookstack.app](https://www.hookstack.app)**:

- Filter by category (`security`, `workflow`, `context`, `validation`…)
- Select the hooks you want — your basket persists in the browser
- Copy the generated `npx hookstack-cli@latest install` command and run it

### Popular hooks

| Slug | Event | What it does |
|---|---|---|
| `pre-bash-secret-detection` | `PreToolUse / Bash` | Blocks commands that would leak API keys |
| `pre-bash-block-destructive` | `PreToolUse / Bash` | Stops `rm -rf /`, `DROP TABLE`, and similar |
| `pre-edit-protect-paths` | `PreToolUse / Write\|Edit` | Keeps `.env` and key files untouched |
| `pre-bash-guard-git-push-main` | `PreToolUse / Bash` | No accidental push straight to `main` |
| `session-start-load-git-context` | `SessionStart` | Every session opens with branch + status |
| `post-write-autoformat` | `PostToolUse / Write\|Edit` | Prettier runs after every file write |
| `notification-slack` | `Notification` | Pings you when the agent needs you |

---

## Requirements

- Node.js ≥ 18
- One of the supported agents installed — Claude Code, OpenAI Codex, or GitHub Copilot (hooks are wired into the agent's lifecycle)

---

## License

MIT — [github.com/steve-magne/hookstack](https://github.com/steve-magne/hookstack)
