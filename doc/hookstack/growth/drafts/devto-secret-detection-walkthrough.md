---
title: "How a 40-line hook stops Claude Code from leaking your API keys"
tags: claudecode, ai, security, devtools
published: false
---

Claude Code almost leaked my API key to a CI log last week.

I'd asked it to debug a failing test. It decided to echo the environment to narrow down the issue. In a local shell, this is harmless. In a GitHub Actions workflow triggered by a PR, the output would have ended up in the public log — along with every secret in my environment.

It didn't happen. A hook caught it.

Here's the hook, and why it works.

---

## What Claude Code hooks are

Claude Code has a lifecycle. Before it runs a shell command, it fires a `PreToolUse` event. Before it writes a file, same thing. After it finishes, a `Stop` event fires.

You can register a Node.js script against any of these events. Claude reads the script's stdout. If the script returns a JSON object with `{ "decision": "block", "reason": "..." }`, Claude stops, shows the reason, and adjusts — it doesn't just hit a wall.

The whole system lives in `.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/detect-secrets.mjs"
          }
        ]
      }
    ]
  }
}
```

That's the wire-up. Now the hook.

---

## The hook — source file: `.claude/hooks/detect-secrets.mjs`

```js
#!/usr/bin/env node
// Bloc les commandes Bash contenant des secrets potentiels (PreToolUse)
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const SECRET_PATTERNS = [
  /(?:ANTHROPIC|OPENAI|CLAUDE|GEMINI|GROQ)_API_KEY\s*=\s*['"]?\S{20,}/i,
  /sk-(?:ant-|proj-)?[a-zA-Z0-9_-]{32,}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY/,
  /(?:password|passwd|secret|token)\s*=\s*['"][^'"]{6,}/i,
];

export function run(input) {
  const command = input.tool_input?.command ?? '';
  const match = SECRET_PATTERNS.find((p) => p.test(command));
  return match
    ? { decision: 'block', reason: 'Secret potentiel détecté dans la commande. Vérifiez avant de continuer.' }
    : null;
}

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result));
}
```

40 lines. No dependencies. No npm install. Just `fs` and `url` from the Node standard library.

---

## Line by line

**The patterns array** covers the five categories of credential that actually appear in shell commands in the wild:

1. Named AI provider keys: catches `OPENAI_API_KEY=sk-...` or `ANTHROPIC_API_KEY=ant-...` passed directly in a command string.
2. Raw `sk-` prefixed tokens: matches Anthropic and OpenAI key formats by shape, even without the variable name.
3. GitHub personal access tokens: the `ghp_` prefix + 36 alphanumeric chars is the current GitHub PAT format.
4. PEM private keys: catches the header line of any RSA or EC private key pasted into a command.
5. Generic credential assignments: a loose pattern for `password=`, `token=`, `secret=` with a value longer than 6 chars — catches the long tail of internal credentials.

**`export function run(input)`** — the logic is a pure function. It receives the full tool input (Claude sends a JSON object with `tool_input.command` for Bash calls), runs the patterns against the command string, and returns a block decision or null. Pure means testable: you can call `run({ tool_input: { command: '...' } })` in a test without touching stdin or the filesystem.

**The guard block** at the bottom is the only side-effectful code. It reads stdin (Claude's JSON payload), calls `run`, and writes the result to stdout. The `/* v8 ignore */` comment tells the coverage tool to skip it — you test `run`, not the I/O plumbing.

**Returning null** when there is no match is intentional: Claude interprets a missing or empty response as "proceed normally". The hook is invisible on the happy path.

---

## What Claude sees when the hook fires

When the hook returns a block, Claude receives the `reason` string and treats it as an instruction, not just an error. In practice, it re-plans the approach: instead of echoing the full environment, it might suggest checking the variable by name, or printing only the first few characters to confirm it's set.

The reason being actionable — "Secret potentiel détecté dans la commande. Vérifiez avant de continuer." — matters. A vague "blocked" gives Claude nothing to work with. A specific reason lets it adjust intelligently.

---

## Installing manually

1. Copy the script to `.claude/hooks/detect-secrets.mjs` in your project.
2. Add the following to `.claude/settings.json` (create the file if it doesn't exist):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/detect-secrets.mjs"
          }
        ]
      }
    ]
  }
}
```

3. Make the script executable: `chmod +x .claude/hooks/detect-secrets.mjs`

That's it. The hook fires on every Bash call Claude Code makes from this point forward.

---

## Or install it in one command

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection
```

The CLI fetches the hook from the Hookstack registry, writes the `.mjs` to `.claude/hooks/`, and patches `settings.json` automatically. You can also install the write-time variant (catches secrets being hardcoded into files) alongside it:

```bash
npx hookstack-cli@latest install --hooks=pre-bash-secret-detection,pre-write-secret-detection
```

Browse the full catalogue at [hookstack.app](https://www.hookstack.app) — 90 hooks covering 25 lifecycle events, each with a unit test.

---

## If the hook isn't firing

Common reasons:

- The script path in `settings.json` uses a relative path instead of `$CLAUDE_PROJECT_DIR/.claude/hooks/...` — Claude Code resolves this variable to the project root.
- The script lacks a shebang line or isn't executable (run `chmod +x` on it).
- The `matcher` is wrong — for Bash calls, the matcher must be `"Bash"`, not `"bash"` (case-sensitive).
- The script exits with a non-zero code, which Claude Code treats as an error rather than a block decision.

Full troubleshooting guide: [hookstack.app/guides/claude-code-hooks-not-working](https://www.hookstack.app/guides/claude-code-hooks-not-working)

---

The pattern here — a pure `run()` function, injectable deps, a minimal I/O guard — applies to any hook you write. Start with the behaviour you want to enforce, write it as a function, test it, then wire it to the lifecycle. Forty lines is usually enough.

The full source for this hook and 89 others is at [github.com/steve-magne/hookstack](https://github.com/steve-magne/hookstack).
