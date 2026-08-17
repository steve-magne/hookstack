---
type: Playbook
title: Harness E2E du CLI — install/update/contribute contre un registre local
description: Nouveau tests/cli/e2e.test.mjs : un serveur HTTP local sert le vrai registry.json dans la forme de l'API, et des dépôts git scratch exécutent le CLI réel (install/update/contribute) en mode non-interactif. Plus de coverage automatisée des flows cli.mjs sans réseau ni compte GitHub.
tags: [implementation, cli, tests, e2e, install, update, contribute, dev-deps]
timestamp: 2026-08-17T00:00:00Z
---

# Harness E2E du CLI

## What

`tests/cli/e2e.test.mjs` couvre les flows **non-interactifs** de `cli.mjs`
(`install`, `update`, `contribute` avec `--yes`) de bout en bout :

- un serveur `node:http` (port éphémère) sert `registry/registry.json` sous la
  forme exacte de `src/app/api/hooks/route.ts` (`/api/hooks`, `?slugs=…`) ;
- des dépôts git scratch (`git init` + manifests `package.json`/`tsconfig`) sont
  créés dans `tmpdir()` ;
- le vrai `packages/cli/bin/cli` est lancé via `child_process.spawn` avec
  `HOOKSTACK_API_BASE` pointant sur le serveur local ;
- on assert sur le code de sortie et le filesystem (scripts, `settings.json`,
  `tests/hooks/`, `.git/hooks/pre-commit`, `.github/workflows/`).

11 tests : install explicite (+ companion `lib/`), `--with-tests`, `--pre-commit`,
`--github-action`, install par défaut avec filtre de stack (pas de hook Python
sur un projet TS), update (rien à faire / à jour / restauration d'une édition
locale), contribute (aucun hook → erreur propre, à jour → `Nothing to
contribute`, édition locale → arrêt propre au gate `gh`).

## Why this shape

- **`spawn` async, pas `spawnSync`** : le serveur vit dans le process vitest.
  Un `spawnSync` bloquerait son event loop pendant que l'enfant `fetch` — l'enfant
  pendrait jusqu'au timeout. `spawn` laisse le serveur répondre. C'est le piège
  central de ce harness, documenté ici pour éviter la régression.
- **`contribute` hermétique** : un shim `gh` (`#!/bin/sh; exit 1`, `chmod 755`)
  est préfixé au `PATH` de l'enfant. `requireGhUsername` échoue donc
  déterministiquement (« GitHub CLI (gh) is required ») — jamais de fork/clone
  réseau réel, même si un `gh` authentifié traîne sur la machine. Le cas
  « rien à contribuer » sort avant le gate gh (exit 0 sans gh), donc couvert
  aussi.
- **Vrai registre, pas de fixture** : servir `registry.json` réel teste le
  contrat de données (champs `code_snippet`/`python_*`/`companion_files`) que le
  CLI consomme réellement — une divergence de shape casserait le E2E.
- **devDeps racine** : `@clack/prompts` + `picocolors` sont ajoutés aux
  devDependencies racine. `packages/cli` est un package standalone (pas dans
  `pnpm-workspace.yaml`), donc ses deps runtime n'étaient pas installées dans le
  repo ; Node les résout depuis `packages/cli/bin/` en remontant vers
  `node_modules` racine, ce qui permet de lancer le CLI en-repo.

## Implementation

- `tests/cli/e2e.test.mjs` (vitest, `beforeAll` serveur / `afterAll` close +
  nettoyage des scratch dirs) : `mapHook` (miroir de la route API),
  `scratchRepo`, `ghShim`, `runCli` (async spawn + timeout SIGKILL 60 s).
- `package.json` : `@clack/prompts@^0.9.1` + `picocolors@^1.1.1` en
  devDependencies.
- Aucun changement de code produit — uniquement du test + des deps de dev.

## Validation

- `pnpm vitest run tests/cli/e2e.test.mjs` : 11 ✓ (~2 s).
- `pnpm test` : 128 fichiers, 1166 ✓ (le E2E est collecté par défaut → CI couvert
  automatiquement).
- `pnpm typecheck` · `pnpm validate:registry` · `node .claude/sync-hooks.mjs
  --check` ✓.

## Explicitly out of scope

- Pas de coverage du mode **interactif** (banner, clack, PTY) — cf.
  `pty_drive.py` historique dans les notes de session, hors périmètre CI.
- Pas de test du happy-path `contribute` (fork + push + PR) : il exigerait un
  serveur git/gh fake complet ; le gate gh et la détection des changements sont
  couverts, le plumbing git est couvert par les unitaires de `core.mjs`.
- Pas de `test:e2e` séparé : `pnpm test` collecte le fichier, pas de script
  supplémentaire à maintenir.
