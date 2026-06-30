---
type: Playbook
title: i18n-validation — find qui timeout sur les worktrees
description: Le hook Stop i18n-validation explosait en ETIMEDOUT à chaque session car son find parcourait les node_modules des .claude/worktrees. Correction du prune + silence défensif.
tags: [implementation, hooks, fix, performance]
timestamp: 2026-06-30T00:00:00Z
---

# i18n-validation — find qui timeout sur les worktrees

## What

Le hook Stop `i18n-validation.mjs` crachait une erreur `spawnSync /bin/sh
ETIMEDOUT` à chaque fin de session. Cause : son `find` des fichiers de
traduction ne prunait que `./node_modules` (racine), pas les `node_modules`
nichés sous `.claude/worktrees/*/` — des milliers de JSON en double qui
faisaient expirer le `execSync` (timeout 5 s).

## Fix

- **Prune complet** : `find . \( -name node_modules -o -name .git -o -path
  "./.claude/worktrees" \) -prune`. Prune tous les `node_modules` à toute
  profondeur + les worktrees. Mesuré : 16 JSON en 14 ms (vs timeout avant).
- **Silence défensif** : le `find` est wrappé dans un `try/catch` qui rend
  `null`. Un Stop hook non bloquant ne doit jamais crasher bruyamment sur un
  échec d'environnement (timeout, find absent) — il rend la main.

## Where

- `.claude/hooks/i18n-validation.mjs` — commande `find` + `try/catch`.
- `tests/hooks/i18n-validation.test.mjs` — cas « find timeout → null silencieux ».
- `registry/registry.json` — `code_snippet` resyncé.

## Trade-off

Le `-path "./.claude/worktrees"` est spécifique à la convention de worktrees de
ce repo. Dans un projet utilisateur sans `.claude/worktrees`, la branche ne
matche rien et coûte zéro — sans effet de bord. Le prune `-name node_modules`
généralise à tout repo multi-`node_modules` (monorepo).
