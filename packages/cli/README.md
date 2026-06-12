# hookstack-cli

**Install Claude Code hooks in one command.**

[hookstack.app](https://hookstack.app) — browse a growing catalogue of Claude Code hooks, then run this CLI to wire them into your project.

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
  --hooks <slugs>   Comma-separated hook slugs (required)
  --global, -g      Install into ~/.claude instead of ./.claude
  --copilot         Install into ./.claude with paths adapted for GitHub Copilot
  --scope <s>       "project" (default), "global", or "copilot"
  --with-tests      Also install vitest unit tests into tests/hooks/ (project scope only)
  --yes, -y         Skip prompts (non-interactive / CI)
  --version, -v     Print version
  --help, -h        Show help
```

### Interactive mode (default in a terminal)

When run in a terminal the CLI opens an interactive prompt:

1. Fetches the requested hooks from the registry
2. Shows an **installation summary** (path, category, events, blocking flag)
3. Shows a **security panel** (shell access · network · filesystem writes · Snyk score)
4. Asks for confirmation before writing anything

### Non-interactive mode (`--yes` or piped)

Skips all prompts — useful in CI or dotfile bootstrap scripts.

```bash
# CI bootstrap
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-guard-git-push-main --yes --scope=project

# CI bootstrap with unit tests (avoids SonarQube gating on new files without tests)
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-bash-guard-git-push-main --yes --with-tests
```

---

## What gets installed

For each hook the CLI:

- Writes the `.mjs` script to `.claude/hooks/` (or `~/.claude/hooks/` for global scope)
- Patches `.claude/settings.json` to register the hook on the right lifecycle event
- Optionally writes vitest unit tests to `tests/hooks/` when `--with-tests` is passed (or confirmed interactively)

No new dependencies are added to your project. Hooks are plain Node.js scripts — no SDK, no agent modification.

---

## Finding hooks

Browse and filter the full catalogue at **[hookstack.app](https://hookstack.app)**:

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
- Claude Code installed (hooks are wired into its lifecycle)

---

## License

MIT — [github.com/steve-magne/hookstack](https://github.com/steve-magne/hookstack)
