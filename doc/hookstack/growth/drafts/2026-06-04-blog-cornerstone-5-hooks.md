# DRAFT — Cornerstone article (dev.to + blog)

> **Statut** : à relire et publier (draft-and-review). Canal : dev.to (canonical) + blog perso.
> **Visuel maître** : 1 GIF de démo (~15s) en tête — sélection de hooks sur hookstack.app → la commande `npx` se construit → install dans un terminal → `✓ Installed`.
> **CTA unique** : lien repo en fin d'article (« code's open »).
> **Atomise vers** : `2026-06-04-x-thread-5-hooks.md`, `2026-06-04-linkedin-5-hooks.md`.

---

## Titre

**The 5 Claude Code hooks I run on every project**

*(alt: « 5 Claude Code hooks that caught real bugs before they shipped »)*

## Sous-titre / dek

Claude Code can run a script at every step of the agent loop — before a shell command, after a file edit, when a session starts. Here are the five I install on day one of every project, and the actual problems they've caught.

---

## Article

> **[GIF de démo ici]** — sélection → `npx` → install en 15 secondes.

A few weeks ago, Claude Code was about to run a cleanup command in the wrong directory. Not malicious — just an agent doing what agents do, a little too eagerly. The command never ran. A 12-line hook caught it first.

That's what hooks are: **lifecycle callbacks the Claude Code runtime fires automatically** — before a tool runs, after a file is written, when a session starts or stops. A `PreToolUse` hook sees the full tool input and can **block** the action. A `PostToolUse` hook reacts to what just happened. They turn an eager agent into a reliable one.

I now run the same core set on every repo. Here are the five that earn their place.

### 1. Block destructive commands — before they run

`PreToolUse` on `Bash`. The agent proposes a shell command; this hook inspects it and refuses the dangerous ones outright.

```js
const BLOCKED = [
  [/rm\s+-rf?\s+\/(?:\s|$)/,                         'rm -rf / blocked'],
  [/git\s+push\s+.*--force(?:-with-lease)?\s+.*(?:main|master)/, 'force-push to main blocked'],
  [/DROP\s+(?:TABLE|DATABASE)\s+\w+/i,               'DROP TABLE/DATABASE blocked'],
  [/>\s*\/dev\/(?:sda|nvme|disk)\d*/i,               'raw disk write blocked'],
  [/chmod\s+-R\s+777\s+\//i,                         'recursive chmod 777 on / blocked'],
];

export function run(input) {
  const command = input.tool_input?.command ?? '';
  const blocked = BLOCKED.find(([pattern]) => pattern.test(command));
  return blocked
    ? { decision: 'block', reason: `Destructive command blocked: ${blocked[1]}` }
    : null;
}
```

**Why it's first:** the cost of being wrong once is your disk. The cost of the hook is a regex check.

### 2. Catch leaked secrets before execution

`PreToolUse` on `Bash`. Scans every command for API keys, tokens and plaintext passwords. If a secret pattern shows up in a command about to run (and land in your shell history, or a log), it's blocked.

**The result:** *catch a leaked API key before it ever runs* — not after it's already in a log aggregator.

### 3. Load git context at session start

`SessionStart`. The moment a session opens, it injects your repo state — current branch, `git status`, latest commits — straight into the agent's context.

**The result:** *every session starts knowing your repo state*. No more "which branch am I on?" round-trips. The agent picks up where you actually are.

### 4. Typecheck the instant a file is saved

`PostToolUse` on `Write|Edit`. Runs `tsc --noEmit` after any `.ts`/`.tsx` edit and feeds errors straight back to the agent.

**The result:** *type errors caught the moment a file is saved* — fixed in the same loop, not 20 minutes later in CI.

### 5. Don't hand back until tests are green

`Stop`. When the agent thinks it's done, this runs the test suite first. Red? It sends the agent back to work before returning control to you.

**The result:** *won't hand back until the test suite is green*. "Done" starts meaning done.

---

### Installing all five in one command

I used to copy a `settings.json` between repos and re-paste the scripts. Now it's one command:

```bash
npx hookstack-cli@latest install --hooks=pre-bash-block-destructive,pre-bash-secret-detection,session-start-load-git-context,post-edit-typecheck,stop-run-tests
```

It writes the `.mjs` files into `.claude/hooks/` and patches `.claude/settings.json`. Restart Claude Code and they're live.

Want the recommended starter set instead of picking by hand? Just:

```bash
npx hookstack-cli@latest install
```

---

### One catalogue, community-maintained

These five are a slice of a larger catalogue — 60+ hooks for Claude Code & GitHub Copilot, each with the real code and the use case. It's open-source, and it grows as people submit the hooks from their own repos.

Browse them: **hookstack.app**

If you build your own hook worth sharing, the catalogue takes submissions. The repo's open: **github.com/steve-magne/hookstack** — a star helps other people find it.

---

## Notes de publication

- **Créneau** : mardi–jeudi matin (dev.to a plus de reach en semaine).
- **Tags dev.to** : `claude`, `ai`, `devtools`, `productivity`.
- **Canonical** : publier sur le blog perso d'abord, puis dev.to avec `canonical_url` vers le blog (SEO).
- **Checklist** : ✅ GIF en tête · ✅ 1 seul CTA (repo) en fin · ✅ accroche = le danger évité · ✅ zéro hype · ✅ slugs vérifiés contre le registre.
