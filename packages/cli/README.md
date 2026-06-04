# hookstack-cli

**Install Claude Code hooks in one command.**

[hookstack.vercel.app](https://hookstack.vercel.app) — browse a growing catalogue of Claude Code hooks, then run this CLI to wire them into your project.

---

## Quick start

```bash
npx hookstack-cli@latest install --hooks=secret-detection,destructive-command-guard
```

That's it. The CLI fetches the hooks, shows you what will be installed, and patches your `.claude/settings.json`.

---

## Usage

```
npx hookstack-cli@latest install --hooks=<slug1>,<slug2>,...

Options:
  --hooks <slugs>   Comma-separated hook slugs (required)
  --global, -g      Install into ~/.claude instead of ./.claude
  --scope <s>       "project" (default) or "global"
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
npx hookstack-cli@latest install --hooks=secret-detection,git-push-guard --yes --scope=project
```

---

## What gets installed

For each hook the CLI:

- Writes the `.mjs` script to `.claude/hooks/` (or `~/.claude/hooks/` for global scope)
- Patches `.claude/settings.json` to register the hook on the right lifecycle event

No new dependencies are added to your project. Hooks are plain Node.js scripts — no SDK, no agent modification.

---

## Finding hooks

Browse and filter the full catalogue at **[hookstack.vercel.app](https://hookstack.vercel.app)**:

- Filter by category (`security`, `workflow`, `context`, `validation`…)
- Select the hooks you want — your basket persists in the browser
- Copy the generated `npx hookstack-cli@latest install` command and run it

### Popular hooks

| Slug | Event | What it does |
|---|---|---|
| `secret-detection` | `PreToolUse / Bash` | Blocks commands that would leak API keys |
| `destructive-command-guard` | `PreToolUse / Bash` | Stops `rm -rf /`, `DROP TABLE`, and similar |
| `sensitive-file-protection` | `PreToolUse / Write` | Keeps `.env` and key files untouched |
| `git-push-guard` | `PreToolUse / Bash` | No accidental push straight to `main` |
| `git-context-on-startup` | `SessionStart` | Every session opens with branch + status |
| `auto-format-on-save` | `PostToolUse / Write` | ESLint + Prettier run after every file write |
| `slack-notify-on-stop` | `Stop` | Pings you when the long task finishes |

---

## Requirements

- Node.js ≥ 18
- Claude Code installed (hooks are wired into its lifecycle)

---

## License

MIT — [github.com/steve-magne/hookstack](https://github.com/steve-magne/hookstack)
