---
type: Playbook
title: Gate CI — couverture lignes ≥ 80 % par hook individuel
description: En complément du seuil agrégé de vitest, scripts/check-hook-coverage.mjs bloque tout hook dont la couverture lignes < 80 %, avec une liste d'exceptions pour les hooks hérités.
tags: [implementation, ci, coverage, quality, hooks]
timestamp: 2026-08-05T00:00:00Z
---

# Gate CI — couverture lignes ≥ 80 % par hook individuel

## What

Le gate de coverage du CI était **agrégé** : `pnpm test:coverage` échoue si les
moyennes (lignes/statements/branches ≥ 80 %, fonctions ≥ 75 %) passent sous le
seuil — mais un hook individuel peu ou pas testé pouvait se cacher derrière la
moyenne. Nouveau gate **per-hook** : chaque `.claude/hooks/*.mjs` doit avoir
≥ 80 % de couverture lignes, sinon le CI échoue — sauf hooks listés dans une
liste d'exceptions explicite pour les hooks hérités.

## Why this shape

Vitest 4 ne mesure que les fichiers importés par les tests, et le seuil agrégé
lisse les cas particuliers. Le besoin : un hook mal couvert doit **bloquer la
PR**, pas être dilué dans la moyenne. Le hook de session
`stop-per-file-coverage` couvrait déjà le par-fichier mais uniquement pour les
`src/*.ts(x)` modifiés en session — pas pour les hooks, et pas en CI.

Une liste d'exceptions est nécessaire : 16 hooks hérités sont sous le seuil
(57 % à 79,6 % de lignes — TTS, session-*, webfetch, etc.), trop de travail pour
les remettre à niveau dans la même PR. Plutôt qu'un `thresholds.perFile` de
vitest (qui n'a **aucun mécanisme d'exception** et appliquerait le seuil à toute
la surface incluse, y compris `src/lib`), un script déterministe dédié :
`scripts/check-hook-coverage.mjs`, pattern `run()` + DI testable du repo.

## Implementation

- `scripts/check-hook-coverage.mjs` — fonction pure `run({ readDir, readFile,
  exists, hooksDir, summaryPath, threshold, exceptions })` qui lit
  `coverage/coverage-summary.json` (reporter `json-summary` de vitest, généré
  par `pnpm test:coverage`), compare la couverture lignes de chaque
  `.claude/hooks/*.mjs` au seuil, et renvoie `{ exitCode, message }`.
  - **Exclusion** : un hook **absent du résumé** (jamais importé par un test)
    compte comme 0 % → bloquant (filet de sécurité : Vitest ne mesure que les
    fichiers importés).
  - **Exceptions consenties** : constante `EXCEPTIONS` (basenames des 16 hooks
    hérités sous le seuil). Chaque entrée est **auto-périmable** : un hook
    excepté repassé ≥ 80 %, ou une exception pointant vers un fichier disparu,
    fait **échouer** le check avec un message « retire-le de EXCEPTIONS » — la
    liste ne peut que décroître, pas grossir.
- `package.json` — script `check:hook-coverage` (`node scripts/check-hook-coverage.mjs`).
- `.github/workflows/ci.yml` — étape « Per-hook coverage gate » après
  `pnpm test:coverage` (consomme le `coverage-summary.json` généré à l'étape précédente).
- `tests/lib/check-hook-coverage.test.mjs` — 8 cas : passe, bloque sous-seuil,
  exception tolérée, résumé manquant/invalide, hook absent = 0 %, exception
  périmée, exception obsolète.
- `CONTRIBUTING.md` — tableau des gates CI (6 checks) + section « Write the test ».

## Out of scope

- Pas de remise à niveau des 16 hooks hérités (travail séparé ; le gate force
  à retirer les exceptions au fil des améliorations).
- Pas de changement du seuil agrégé vitest (reste lignes/statements/branches
  ≥ 80 %, fonctions ≥ 75 %).
- Pas de modification du hook de session `stop-per-file-coverage` (cible
  `src/*.ts(x)` modifiés ; le gate CI par-hook couvre les hooks).
