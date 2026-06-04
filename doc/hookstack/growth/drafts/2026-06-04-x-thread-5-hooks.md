# DRAFT — X / Twitter thread (atomisation du cornerstone)

> **Statut** : à relire et publier (draft-and-review).
> **Média** : tweet 1 = GIF de démo (~15s, sélection → npx → install). Tweet 2 = capture du `BLOCKED` array.
> **CTA unique** : dernier tweet uniquement (lien repo). Pas de lien avant.
> **Créneau** : mardi–jeudi, 9–11h ET. Répondre aux replies dans l'heure.
> **Hashtags** : 0 (max 1 si vraiment pertinent).

---

**1/** *(joindre le GIF de démo)*

Claude Code almost ran a cleanup command in the wrong directory last week.

It never ran. A 12-line hook caught it first.

Here are the 5 Claude Code hooks I now run on every project 🧵

**2/** *(joindre la capture du BLOCKED array)*

1. Block destructive commands — before they run.

A `PreToolUse` hook inspects every shell command and refuses the dangerous ones: `rm -rf /`, force-push to main, `DROP TABLE`, raw disk writes.

Cost of being wrong once: your disk. Cost of the hook: a regex.

**3/**

2. Catch leaked secrets before execution.

Scans every command for API keys & tokens before it runs. Blocks it before the key ever lands in your shell history or a log.

Catch the leak before it leaks.

**4/**

3. Load git context at session start.

The moment a session opens, it injects branch + status + latest commits into the agent.

No more "which branch am I on?" The agent starts where you actually are.

**5/**

4. Typecheck the instant a file is saved.

`tsc --noEmit` runs after every .ts edit, errors go straight back to the agent.

Caught in the same loop — not 20 min later in CI.

**6/**

5. Don't hand back until tests are green.

A `Stop` hook runs the suite when the agent thinks it's done. Red? Back to work.

"Done" starts meaning done.

**7/**

All five in one command:

npx hookstack-cli@latest install

Writes the hooks into .claude/hooks and patches settings.json. Restart Claude Code, they're live.

**8/** *(le seul tweet avec lien)*

They're part of an open-source catalogue — 60+ Claude Code hooks, each with the real code.

Browse + grab yours: github.com/steve-magne/hookstack

⭐ if it's useful — it genuinely helps others find it.

---

## Checklist
- ✅ Accroche tweet 1 = le danger évité
- ✅ Média sur tweet 1 et 2
- ✅ 1 seul CTA, dernier tweet
- ✅ zéro hype, orienté résultat
- ✅ slugs/commande vérifiés
