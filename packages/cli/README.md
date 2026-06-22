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

Options:
  --hooks <slugs>    Comma-separated hook slugs (required)
  --project          Claude Code, this project — ./.claude (default)
  --global, -g       Claude Code, all projects — ~/.claude
  --codex-project    OpenAI Codex, this project — ./.codex/hooks.json (committed)
  --codex-profile    OpenAI Codex, all projects — ~/.codex/hooks.json
  --copilot          GitHub Copilot — ./.claude with paths adapted for Copilot
  --scope <s>        "project" (default), "global", "copilot",
                     "codex-project", or "codex-profile"
  --with-tests       Also install vitest unit tests into tests/hooks/ (project scope only)
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

The same hook `.mjs` is used regardless of agent — Claude Code and Codex share lifecycle event names, so only the config file format changes. No new dependencies are added to your project. Hooks are plain Node.js scripts — no SDK, no agent modification.

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
