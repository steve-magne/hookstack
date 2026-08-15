---
type: Playbook
title: Freebuff — rafraîchir main avant chaque session worktree
description: Le startupScript Freebuff `git pull` échouait sur les worktrees frais (branche sans upstream) et chaque session partait d'un main local périmé — nouveau script fetch + fast-forward sur origin/main, sûr dans tous les cas.
tags: [implementation, workflow, git, freebuff]
timestamp: 2026-08-15T00:00:00Z
---

# Freebuff — rafraîchir main avant chaque session worktree

## What

Freebuff (desktop, worktrees isolés) démarre chaque session en créant un
worktree depuis la branche `main` locale, puis exécute le `startupScript` du
projet (`.freebuff/settings.json` — machine locale, gitignoré, hors repo).
Avec `"startupScript": "git pull"` :

1. **Crash** : la branche `freebuff/<slug>` est créée **sans upstream** →
   `git pull` échoue avec « There is no tracking information for the current
   branch » (le fameux exit 1 au démarrage de session).
2. **Base périmée** : le worktree est créé depuis le `main` local jamais
   rafraîchi (8 commits derrière `origin/main` au moment du fix) — chaque
   session repart du passé.

## Fix

Nouveau `startupScript` (single-line, POSIX sh, compatible avec le runner
de l'app) :

```json
{
  "preloadedSkills": [],
  "startupScript": "git fetch origin main --quiet; root=\"$(cd \"$(git rev-parse --git-common-dir)/..\" && pwd -P)\"; git -C \"$root\" merge --ff-only origin/main --quiet; if git rev-parse @{u} >/dev/null 2>&1; then git pull --ff-only --quiet; else git merge --ff-only origin/main --quiet; fi"
}
```

- **Fetch** : `git fetch origin main` — une seule branche, minimal.
- **Rafraîchit le `main` local** dans le dépôt principal : résolu via
  `git rev-parse --git-common-dir/..` — piège : `--git-common-dir` renvoie le
  dossier `.git` lui-même, pas la racine du worktree principal (erreur
  « this operation must be run in a work tree » au premier essai). Les
  *prochains* worktres sont ainsi créés déjà frais.
- **Worktree frais** (branche sans upstream) : `git merge --ff-only
  origin/main` — la branche vient d'être créée, zéro commit local, rien à
  perdre ; elle se cale sur le dernier `origin/main`.
- **Session reprise** (upstream présent) : `git pull --ff-only`.

## Where

- `.freebuff/settings.json` du dépôt principal — la seule surface de config
  exposée par l'app (vérifié dans `desktop-v2.db` : tables `projects`,
  `threads`, `messages`, pas d'option « fetch avant création »).
- Note : `okf/implementation/freebuff-startup-script-refresh-main.md`.

## Trade-off

Le script ne peut pas agir *avant* la création du worktree (Freebuff crée
puis exécute) : le worktree frais est déplacé sur `origin/main` immédiatement
après — effet équivalent au plan « rafraîchir main d'abord », à une session
près (celle en cours est quand même rafraîchie par le merge).

Échecs tous non destructifs : les merges sont `--ff-only`, donc si `main`
porte des commits locaux ou des changements non commités, le refresh refuse
proprement et la session démarre quand même sur sa base. Si le travailleur a
des changements non commités, ils sont préservés (reset `--hard` interdit ici,
par choix).

Un fetch *avant* la création du worktree relèverait d'une évolution de
l'app Freebuff elle-même (feature request) — le script est le meilleur
compromis configurable.
