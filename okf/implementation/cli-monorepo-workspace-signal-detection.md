---
type: Playbook
title: CLI install — détection de signaux workspace-aware (monorepo)
description: Deux détections (readPackageDeps, hasNextConfig) ne regardaient que la racine du repo et manquaient les dépendances/config vivant dans un package de workspace (apps/web, apps/mobile) — un monorepo React + React Native perdait le signal frontend malgré une stack 100% front. Corrigé par une résolution des membres du workspace (npm/yarn workspaces + pnpm-workspace.yaml) réutilisée par les deux détections.
tags: [implementation, cli, install, detection, monorepo, workspace, signals]
timestamp: 2026-09-02T00:00:00Z
---

# CLI install — détection de signaux workspace-aware (monorepo)

## Problème

Signalé sur un monorepo pnpm réel (`apps/web` React/Vite, `apps/mobile`
Expo/React Native, `packages/shared`, workspaces déclarés dans
`pnpm-workspace.yaml`) : `npx hookstack-cli@latest install` n'installait pas
`post-edit-visual-check` (hook du signal `frontend`) alors que le projet est
100 % React + React Native. Cause : `readPackageDeps` (utilisé par les
signaux `frontend`/`i18n`(deps)/`tests`(deps)) et `hasNextConfig` (signal
`nextjs`) ne lisaient/listaient **que la racine** — `react`/`react-dom`
vivent dans `apps/web/package.json`, jamais hissés à la racine (root
`package.json` n'a que des devDependencies génériques type
eslint/vite/typescript). Un `next.config.ts` niché dans un package de
workspace aurait le même sort (signal `nextjs`, cf.
[cli-install-detection-ux](cli-install-detection-ux.md), jamais atteint).

Seule `hasI18nDir` s'en sortait déjà (marche récursive profondeur ≤5, cf.
[cli-smart-toolstack-detection](cli-smart-toolstack-detection.md)) — les deux
détections *basées fichier racine uniquement* (deps de package.json, existence
de next.config.*) étaient les seules aveugles au workspace.

Investigation initiale : les hooks Next.js-only (`seo-next-image-guard`,
`seo-page-metadata-guard`) n'étaient PAS le bug — ce repo n'utilise pas
Next.js du tout (Vite + Expo), leur exclusion via le signal `nextjs` était
correcte et déjà documentée en [cli-install-detection-ux](cli-install-detection-ux.md).
Le vrai bug, généralisable, est la portée racine-seule de la détection.

## Résolution

`packages/cli/bin/core.mjs` — nouvelle résolution des membres du workspace,
réutilisée par les deux détections concernées :

- `readPackageJsonWorkspaceGlobs` / `readPnpmWorkspaceGlobs` : lisent les
  globs déclarés (`package.json#workspaces`, `pnpm-workspace.yaml#packages`).
- `expandWorkspaceGlob` : n'expanse que la forme dominante en pratique
  (`<prefix>/*` → sous-dossiers immédiats) ; chemin exact sans `*` passe tel
  quel ; tout le reste (`**`, étoile en milieu de segment) est ignoré — pas de
  moteur de glob complet pour un champ qui est une liste plate partout où ça
  compte.
- `resolveWorkspaceDirs(root, { readFileSync, readdirSync })` : combine les
  deux sources, retourne la liste des dossiers absolus.
- `readAllPackageDeps` : union des deps de la racine + de chaque membre —
  remplace `readPackageDeps` aux deux call sites (`hasTestsSignal`,
  `detectProjectSignals`).
- `hasNextConfig(root, { readFileSync, readdirSync })` : vérifie la racine
  **et** chaque membre du workspace (signature étendue, un seul call site).

## Why this shape

- Même architecture que les notes précédentes : fonctions pures + DI dans
  `core.mjs`, pas de nouvelle dépendance (pas de lib YAML — le format réel de
  `pnpm-workspace.yaml` est toujours une liste plate sous une clé).
- `resolveWorkspaceDirs` peut retourner des dossiers sans `package.json` — les
  lecteurs downstream gèrent déjà l'absence de fichier (try/catch existant),
  pas de garde supplémentaire nécessaire.
- Comportement racine-seule (mono-package) strictement inchangé :
  `resolveWorkspaceDirs` retourne `[]` sans champ `workspaces` ni
  `pnpm-workspace.yaml` — tous les tests `detectProjectSignals` existants
  passent sans modification.

## Explicitly out of scope

- Pas de moteur de glob complet (`**`, brace expansion) — non observé dans les
  workspaces réels.
- `hasOkfDir`/`hasRegistrySignal`/`hasDocsSignal`/`hasTestsSignal` (dossier)
  restent racine-seule : ce sont des marqueurs de repo (pas de package) où la
  racine est la bonne portée par construction.
- Pas de détection pour `update`/`contribute` (cf.
  [cli-full-autonomy-detection](cli-full-autonomy-detection.md)).

## Validation

- `tests/cli/core.test.mjs` : 5 nouveaux cas dans `detectProjectSignals`
  (frontend via workspace npm/yarn, nextjs via workspace, frontend via
  `pnpm-workspace.yaml`, aucun faux positif, résilience glob illisible).
- `pnpm test` (1197/1198 — seul échec : `okf.test.mjs` staleness liée au
  changement de date système pendant la session, sans rapport) ·
  `pnpm typecheck` · `pnpm validate:registry` ·
  `node .claude/sync-hooks.mjs --check` ✓.
