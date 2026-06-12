# DRAFT — LinkedIn post (atomisation du cornerstone)

> **Statut** : à relire et publier (draft-and-review).
> **Média** : le GIF de démo (~15s) OU une capture du `BLOCKED` array. Natif, uploadé dans le post.
> **Lien** : PAS dans le corps → en **1er commentaire** (LinkedIn enterre les liens sortants).
> **Angle** : équipe/organisation (persona Architecte Platform / AI Champion).
> **Créneau** : mardi–jeudi matin.

---

## Corps du post

Last week, Claude Code was about to run a cleanup command in the wrong directory.

It never ran. A 12-line hook caught it first.

If your team is adopting Claude Code (or Copilot's agent), here's the part that rarely gets standardized: the guardrails. Hooks are lifecycle callbacks the agent runtime fires automatically — before a shell command, after a file edit, when a session starts. They turn an eager agent into a predictable one.

The 5 I now put on every project:

→ Block destructive shell commands before they run (rm -rf, force-push to main, DROP TABLE)
→ Catch leaked API keys before a command executes
→ Load git context (branch, status, commits) at session start
→ Typecheck the moment a file is saved — not later in CI
→ Run the test suite before the agent hands back control

The lesson for teams: these guardrails shouldn't live in one engineer's dotfiles. They should be a shared, versioned standard everyone installs in one command.

That's the problem I've been building an open-source catalogue to solve — 60+ hooks, each with the real code, installable with a single `npx`.

What's the first guardrail you'd want every agent on your team to have?

*(Link in the first comment.)*

---

## 1er commentaire (à coller juste après publication)

The catalogue is here → hookstack.app · code's open at github.com/steve-magne/hookstack

---

## Checklist
- ✅ Story 1ère personne, accroche = le danger évité
- ✅ Angle équipe/standardisation (persona 3)
- ✅ Lien en 1er commentaire, PAS dans le corps
- ✅ Question finale pour l'engagement
- ✅ ~1100 caractères, aéré
- ✅ zéro hype
