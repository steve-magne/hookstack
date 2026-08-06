---
type: Architecture
title: Outillage Claude Code — hooks, quality gates, guardrails
description: Pourquoi le repo s'appuie sur des hooks Claude Code pour imposer zéro dette et bloquer les actions dangereuses.
tags: [architecture, hooks, ci, quality, dogfood, coverage]
timestamp: 2026-08-05T00:00:00Z
---

# Dogfood

Le projet est son propre cobaye. Les hooks de la collection (`.claude/hooks/*.mjs`) sont actifs
sur ce dépôt via `.claude/settings.json` — exécutés à chaque session Claude Code, ce qui les
valide en conditions réelles. ~72 hooks du catalogue sont actifs ici, chacun avec un test dans
`tests/hooks/`.

# Pattern obligatoire — `run()` + garde + DI

Tout hook expose une fonction pure `export function run(input, deps = {…})` qui contient la
logique et **retourne** son résultat, sans toucher à stdin/stdout/`process.exit`. Les effets de
bord (`execSync`, `fs`, horloge) passent par des dépendances injectées avec des valeurs par
défaut réelles — c'est ce qui rend le hook testable. Une garde d'entrée fait le marshalling réel
(`/* v8 ignore */`). Voir [/product/hook-101](/product/hook-101.md).

# Garde-fous CI (`.github/workflows/ci.yml`)

Sur chaque PR :
- `pnpm typecheck`
- `pnpm test:coverage` — tests unitaires + **gate de coverage** via `@vitest/coverage-v8`,
  sur la surface unit-testée : `.claude/hooks/**`, `.claude/hooks-timeline.mjs`, `src/lib`,
  `src/store`, `packages/cli/bin/core.mjs`. Seuils : lignes/statements/branches ≥ 80 %,
  fonctions ≥ 75 % (les fabriques de dépendances par défaut des hooks, remplacées par des
  fakes dans les tests, plafonnent structurellement la couverture fonctions à ~76 %). Les
  composants React `src/components/*` ne sont pas testés en environnement node — hors
  périmètre du gate. Les scripts CI annexes (`scan-snyk.mjs`, `sync-codeql.mjs`) sont
  exclus du gate (couverture partielle, hors surface produit). Seuil appliqué en
  **agrégat**.
- `node scripts/check-hook-coverage.mjs` (`pnpm check:hook-coverage`) — gate **par
  hook individuel** : chaque `.claude/hooks/*.mjs` doit avoir ≥ 80 % de couverture
  lignes (consomme `coverage/coverage-summary.json` de l'étape précédente). Liste
  d'exceptions `EXCEPTIONS` pour 16 hooks hérités sous le seuil — une exception
  périmée (hook repassé ≥ 80 % ou fichier disparu) fait échouer le check pour
  forcer son retrait. Détails : [implementation/per-hook-coverage-gate](../implementation/per-hook-coverage-gate.md).
  Le hook de session `stop-per-file-coverage` complète en couvrant les `src/*.ts(x)`
  modifiés (par-fichier, en session).
- `pnpm validate:registry` — valide `registry.json` contre son schéma (`additionalProperties: false` : tout champ non consommé est rejeté) et échoue si un hook dogfoodé
  (script `.mjs` sur disque) n'a pas de test unitaire : Vitest ne mesure que les fichiers
  importés par les tests, un hook sans test échapperait silencieusement au gate de coverage.
- `node .claude/sync-hooks.mjs --check` — échoue si le registre a dérivé des `.mjs`.
- `node .claude/hooks-timeline.mjs --check` — échoue si la timeline `/evolution` a dérivé de l'historique git.
- `node scripts/coverage-badge.mjs --check` (`pnpm coverage:badge`) — échoue si le badge de coverage du README (`public/coverage-badge.svg` + bloc `COVERAGE_BADGE`) a dérivé de `coverage/coverage-summary.json`. Générateur déterministe, même pattern que hooks-timeline : [implementation/coverage-badge](../implementation/coverage-badge.md).

# Garde-fous session

| Hook | Événement | Rôle |
|---|---|---|
| `post-write-biome` | PostToolUse | Lint immédiat après écriture |
| `stop-per-file-coverage` | Stop | Couverture ≥ 80 % des fichiers modifiés |
| `stop-quality-check` | Stop | Bilan qualité (lint couvert par biome) |
| `stop-force-implementation-doc` | Stop | Bloque si du code source est modifié sans `okf/implementation/` mis à jour |
| `stop-registry-drift-check` | Stop | Rejoue `sync-hooks --check` en filet de sécurité |
| `okf-validate-on-change` | FileChanged | Valide le bundle OKF à chaque édition |
| `session-start-okf-staleness` / `stop-okf-staleness-check` | SessionStart / Stop | Rappel d'enrichissement si le bundle OKF est périmé |

Les hooks OKF alimentent l'auto-bonification du bundle (voir
[/meta/self-improvement](/meta/self-improvement.md)). La liste exacte des hooks actifs vit dans
`.claude/settings.json` (généré par sync) ; `EXCLUDED_SLUGS` dans `sync-hooks.mjs` gère les
doublons exclus localement.
