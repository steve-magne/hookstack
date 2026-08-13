# hookstack-cli

**Install Claude Code hooks in one command — also for OpenAI Codex and GitHub Copilot.**

[hookstack.app](https://www.hookstack.app) — the community catalogue of Claude Code hooks (and Codex & Copilot hooks). Browse, select, and wire them into your project with one command. The same hooks install for any of the three supported agents; only the config file format differs.

---

## Quick start

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-block-destructive
```

That's it. The CLI fetches the hooks, shows you what will be installed, and patches your `.claude/settings.json`.

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
  --with-tests       Also install vitest unit tests into tests/hooks/ (install, project scope only)
  --stack <s>        "auto" (default) — filter hooks to the detected project toolchain;
                     "typescript" / "python" force one stack; "all" disables filtering
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

Codex and Claude Code expose the same lifecycle event names (`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`…), so a HookStack hook is portable between them without any change to the `.mjs` — the CLI just writes the appropriate config format.

### Interactive mode (default in a terminal)

When run in a terminal the CLI opens an interactive prompt:

1. Asks which **target agent** to install for — the menu order is: This project → All my projects → Codex profile → Codex project → GitHub Copilot
2. Fetches the requested hooks from the registry
3. Shows an **installation summary** (path, category, events, blocking flag)
4. Shows a **security panel** (shell access · network · filesystem writes · Snyk score)
5. Asks for confirmation before writing anything

### Language-aware installs

The CLI detects the project's toolchain before installing and keeps only hooks that match it — so a Python repo never receives hooks that shell out to `npm`/`tsc`/`biome`, and a TypeScript repo never receives hooks that shell out to `uv`/`ruff`/`pytest`:

| Detection | Markers | Default install gets |
|---|---|---|
| TypeScript/Node | `package.json`, `tsconfig.json` | universal hooks + TypeScript hooks (`biome`, `tsc`, `pnpm`, Next.js SEO…) |
| Python | `pyproject.toml`, `requirements.txt`, `setup.py`, `setup.cfg`, `Pipfile`, `uv.lock`, `poetry.lock` | universal hooks + Python hooks (`ruff format`, `ruff check`, `pyright`, `pytest`, `uv` guard) |
| Both (monorepo) | markers of both | universal + TypeScript + Python |
| Neither (Rust, Go…) | — | universal hooks only |

Universal hooks (no declared stack) are language-neutral by contract and always install. `stop-quality-check` and `task-completed-test-gate` are themselves language-aware: they run `tsc`/`biome` on TypeScript projects and `ruff`/`pyright`/`pytest` via `uv` on Python projects. Use `--stack` to override the detection:

```bash
npx hookstack-cli@latest install --stack=typescript   # force the TypeScript set
npx hookstack-cli@latest install --stack=python       # force the Python set
npx hookstack-cli@latest install --stack=all          # no filtering (previous behavior)
```

### Python hooks & Python tests (`.py` + pytest)

On a pure-Python install (detected toolchain, or `--stack=python`), hooks that have a **Python variant** are installed as real `.py` scripts (`python3 $CLAUDE_PROJECT_DIR/.claude/hooks/<slug>.py` in `settings.json`), and `--with-tests` writes **pytest** tests (`tests/hooks/test_<slug>.py`) instead of vitest tests. Vitest tests are **never** installed on Python projects — so the project's CI stays Python-only, with no `npm`/`node` added just to test the hooks.

```bash
# Python project (pyproject.toml present) — hooks land as .py, tests as pytest
npx hookstack-cli@latest install --with-tests
```

Hooks without a Python variant yet fall back to the `.mjs` script (reported in the install summary — python variants are landing progressively). To add a variant for a hook, transcribe the logic to `.claude/hooks/<slug>.py` (stdlib only) + `tests/hooks/test_<slug>.py`, set `implementation.python_script_path`, and run the sync.

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

---

## What gets installed

For each hook the CLI:

- Writes the `.mjs` script to the scripts directory for the chosen agent (`.claude/hooks/`, `~/.claude/hooks/`, `.codex/hooks/`, or `~/.codex/hooks/`)
- Patches the agent's config file (`.claude/settings.json` or `.codex/hooks.json`) to register the hook on the right lifecycle event
- Optionally writes vitest unit tests to `tests/hooks/` when `--with-tests` is passed (or confirmed interactively)
- Filters the set to the project's detected toolchain (see [Language-aware installs](#language-aware-installs)) unless `--stack=all` is passed — an explicit `--hooks=` list is filtered too, and skipped slugs are reported

The same hook `.mjs` is used regardless of agent — Claude Code and Codex share lifecycle event names, so only the config file format changes. No new dependencies are added to your project. Hooks are plain Node.js scripts — no SDK, no agent modification.

---

## Updating

Hooks evolve — bug fixes, new options, the occasional rewrite. To pull the latest version of everything you've already installed:

```bash
npx hookstack-cli@latest update
```

No `--hooks` needed: the CLI scans the scripts directory for the target scope (`.claude/hooks/` by default), reads the `// @hookstack <slug>` fingerprint each script carries, and re-fetches exactly those hooks from the live registry. Each hook's metadata (code, config, tests) is served live from [hookstack.app](https://www.hookstack.app) — never bundled in the npm package — so `update` always gets what's currently on the catalogue, no CLI version bump required.

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

It scans your installed hooks (same `@hookstack` fingerprint lookup as `update`), finds the ones whose local `.mjs` no longer matches the live registry, lets you pick which to send, then forks [steve-magne/hookstack](https://github.com/steve-magne/hookstack), pushes a branch with your version of those files, and opens the PR for you.

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
