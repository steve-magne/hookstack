---
type: Architecture
title: Outillage Claude Code — hooks, quality gates, guardrails
description: Pourquoi le repo s'appuie sur des hooks Claude Code pour imposer zéro dette et bloquer les actions dangereuses.
tags: [architecture, hooks, ci, quality, dogfood]
timestamp: 2026-06-30T00:00:00Z
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
- `pnpm typecheck` + `pnpm test`
- `pnpm validate:registry` — valide `registry.json` contre son schéma (`additionalProperties: false` : tout champ non consommé est rejeté).
- `node .claude/sync-hooks.mjs --check` — échoue si le registre a dérivé des `.mjs`.
- `node .claude/hooks-timeline.mjs --check` — échoue si la timeline `/evolution` a dérivé de l'historique git.

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
