---
type: Playbook
title: Badge de coverage du README — générateur déterministe + drift guard CI
description: scripts/coverage-badge.mjs rend le badge 4 métriques (lines/statements/branches/functions) depuis coverage-summary.json, l'insère dans le README et le CI vérifie sa fraîcheur via --check.
tags: [implementation, ci, coverage, badge, readme]
timestamp: 2026-08-05T00:00:00Z
---

# Badge de coverage du README

## What

Le README racine affiche désormais un **badge de coverage** : un SVG autonome à 4
segments (lines / statements / branches / functions) généré depuis
`coverage/coverage-summary.json` (reporter `json-summary` de vitest, produit par
`pnpm test:coverage`). Chaque valeur est colorée selon les seuils du gate —
vert si ≥ seuil, rouge sinon — avec les mêmes `GATE_THRESHOLDS` que
`vitest.config.ts` (lines/statements/branches ≥ 80 %, functions ≥ 75 %).

## Why this shape

Même pattern que `hooks-timeline.mjs` : un **générateur déterministe** +
un garde-fou `--check` en CI, plutôt qu'un pre-commit qui réécrit des fichiers
en plein commit. Le badge est un artefact **commité** (SVG dans `public/`, bloc
README entre marqueurs `<!-- COVERAGE_BADGE:START/END -->`) ; le CI vérifie
qu'il n'a pas dérivé du summary courant (`--check`, exit 1 sinon). Déterministe :
aucun timestamp « now ».

**Valeurs arrondies à l'entier** — un choix de robustesse : le coverage v8 n'est
pas strictement stable entre plateformes/versions de Node (contrairement à
l'historique git qui pilote hooks-timeline). Une décimale ferait dériver le
badge (écart ≥ 0,05) et casserait la CI sur des PR innocentes ; l'entier absorbe
cette variance (il faudrait ≥ 0,5 point d'écart) tout en affichant les 4
métriques du gate.

## Implementation

- `scripts/coverage-badge.mjs` — fonctions pures exportées + DI :
  `extractMetrics(summary)` (4 métriques arrondies), `textWidth(text)`,
  `renderBadgeSvg(metrics, thresholds)` (SVG 20 px de haut, palette GitHub dark
  `#0a0a0a`, largeur totale arrondie à l'entier), `renderReadmeBlock(metrics)`,
  `injectReadme(readme, block)` (remplace entre marqueurs, sinon insère dans le
  hero avant la démo GIF, fallback avant le premier `## `). `generate()` et
  `main()` orchestrent : écriture, `--dry-run`, `--check`.
- `package.json` — script `coverage:badge`.
- `.github/workflows/ci.yml` — étape « Coverage badge drift guard » juste après
  le gate per-hook (les deux consomment `coverage-summary.json` généré à l'étape
  `pnpm test:coverage`).
- `tests/lib/coverage-badge.test.mjs` — extraction, couleurs selon les seuils,
  contenu du bloc, injection/remplacement idempotent du README.
- `CONTRIBUTING.md` — 7 checks locaux + ligne « Coverage badge » au tableau des gates.

## Out of scope

- Pas de badge shields.io externe : le SVG est autonome et commité (comme
  `public/hooks-timeline.svg`), aucune dépendance réseau au rendu.
- Pas de changement des seuils du gate (miroir exact de `vitest.config.ts`).
- Le badge agrège la surface unit-testée (`.claude/hooks`, `src/lib`, `src/store`,
  `core.mjs`) ; il ne remplace pas le gate per-hook ni `validate:registry`.
