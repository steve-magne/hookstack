---
type: Playbook
title: Comptes de hooks des docs — générateur + drift guard CI
description: scripts/readme-hook-counts.mjs vérifie que les chiffres cités dans les docs à état courant (READMEs + docs de référence) reflètent le registre (default_on + stack + variantes .py) et l'artefact .claude/settings.json (hooks dogfoodés), corrige les dérives et échoue en CI via --check. Garde aussi l'invariant « install Python par défaut 100 % .py ». Les archives historiques (log.md, Playbooks) sont hors périmètre.
tags: [implementation, readme, registry, ci, drift, python, docs, counts, dogfood]
timestamp: 2026-08-17T00:00:00Z
---

# Comptes de hooks des docs — générateur + drift guard CI

## What

Deux familles de chiffres « à état courant » se périment en silence quand on
ajoute/retire un hook :

1. **Le set Python par défaut** — « a default Python install currently lands
   **63 hooks, 100 % as `.py`, zero `.mjs` fallback** » (README racine) et
   « (63 Python hooks today — …) » (packages/cli). Source : `default_on` + `stack`
   + présence d'une variante `.py`. (Constaté en session : « 66 » était resté
   alors que le set réel était passé à 63.)
2. **Le dogfood** — « 93 hooks du catalogue sont actifs » (CLAUDE.md),
   « 93 hooks actifs sur le repo lui-même » (business/monetization), « 93 hooks
   dogfoodés » (product/hook-101), « dogfood complet avec 93 hooks actifs »
   (doc/product/06-vision-produit). Source : `.claude/settings.json` généré par
   sync-hooks — les hooks **effectivement actifs**, pas le catalogue complet (qui
   inclut les exclus locaux et les stacks non activées). (Constaté en session :
   quatre chiffres incohérents 62 / 62+ / 72 / 72.)

`scripts/readme-hook-counts.mjs` reprend le pattern éprouvé de coverage-badge.mjs /
hooks-timeline.mjs : un **générateur déterministe** + un garde-fou `--check` en CI.
Il produit deux familles d'artefacts :

- **6 phrases verrouillées** dans les docs à état courant (CLAUDE.md, READMEs,
  business/monetization, product/hook-101, doc/product/06-vision-produit).
- **1 bloc « at a glance »** `<!-- HOOK_COUNTS:START/END -->` dans le README, qui
  expose tous les comptes bruts (total, default_on, .py variants, par stack,
  dogfood) — y compris ceux qu'aucune phrase ne cite encore.

- `node scripts/readme-hook-counts.mjs` — réécrit les comptes + le bloc stats (idempotent)
- `--dry-run` — aperçu sans écriture
- `--check` — CI : exit 1 si un compte ou le bloc a dérivé (branché dans `.github/workflows/ci.yml`)

## Why this shape

- **Deux sources de vérité distinctes** : `computeFacts(registry)` **importe
  `filterHooksByStack` depuis `packages/cli/bin/core.mjs`** (module pur, zéro
  effet de bord) pour calculer `pythonDefault` — le guard ne réimplémente jamais
  le filtre de stack, il utilise la même fonction que l'install, donc il ne peut
  pas dériver de la réalité qu'il surveille. `computeDogfoodCount(settings.json)`
  lit l'artefact généré pour « actifs sur le repo » — on ne recompte pas le
  registre (qui inclurait les hooks exclus localement), ni ne duplique
  `EXCLUDED_SLUGS`/`EXCLUDED_STACKS` de sync-hooks. (Un `settings.json` périmé
  par rapport au registre est déjà attrapé en amont par `sync-hooks --check` —
  pas de double garde ici.)
- **Claims ancrés, pas de réécriture libre** : chaque phrase surveillée est un
  claim `{ id, file, fact, pattern, render }` avec un regex ancré au contexte.
  `render(facts)` reconstruit la phrase → idempotent, déterministe, testable.
- **Bloc stats = artefact dérivé** : `renderStatsBlock`/`injectStatsBlock`
  reproduisent le pattern des blocs COVERAGE_BADGE / HOOKS_TIMELINE — marqueurs,
  remplacement en place, insertion avant le premier `## ` au premier passage.
  C'est le filet qui couvre les comptes non cités dans une prose lisible.
- **Jamais de fichier à moitié corrigé** : si une phrase est introuvable (prose
  reformulée), le fichier n'est pas écrit et le run échoue en demandant de mettre
  à jour le pattern — pas de correction silencieuse et partielle.
- **Invariant « 100 % .py » gardé** : `pythonInvariantError` échoue si
  `pythonFallback > 0`. Le générateur refuse alors de réécrire une prose devenue
  fausse et demande soit d'ajouter la variante `.py` manquante, soit de reformuler
  les READMEs. (Complète `check:python-parity` : celui-ci vérifie la surface de
  test, celui-là la promesse produit.)

## Implementation

- `scripts/readme-hook-counts.mjs` : `computeFacts` (pur — total, default_on,
  pythonDefault, pythonPyVariants, pythonFallback, cataloguePyVariants,
  stackTypescript/Python/Java), `computeDogfoodCount` (lit settings.json),
  `pythonInvariantError`, `renderStatsBlock`/`injectStatsBlock`, `CLAIMS`
  (6 phrases), `extractClaim`, `generate(deps)` (loadRegistry/readSettings/
  readFile injectables), `main` (`--check`/`--dry-run`). Importe
  `filterHooksByStack` de `packages/cli/bin/core.mjs` — aucune autre dépendance.
- `tests/lib/readme-hook-counts.test.mjs` : 22 tests (computeFacts,
  computeDogfoodCount, invariant, extraction, render/inject du bloc stats,
  génération idempotente/drift/missing/statsDrift, cohérence des claims) —
  fixtures, pas de couplage au contenu réel du registre.
- `package.json` : script `readme:counts`.
- `CLAUDE.md` : étape 7 de la checklist « Ajouter un hook » (`pnpm readme:counts`
  à committer avec le hook).
- `.github/workflows/ci.yml` : étape « README hook counts drift guard » juste
  après « Coverage badge drift guard ».

## Validation

- `pnpm vitest run tests/lib/readme-hook-counts.test.mjs` : 22 ✓.
- `node scripts/readme-hook-counts.mjs --check` : ✓ synchrones (63/63 .py, 0
  fallback, 79 default_on, 93 dogfooded).
- E2E : drift simulé → `--check` exit 1 avec message ciblé → générateur répare →
  `git diff` inchangé.
- `pnpm test` : 1188 ✓ (129 fichiers) · `pnpm typecheck` ✓ · biome ✓ ·
  `ci-check-content` ✓ · `okf validate --strict` ✓.

## Explicitly out of scope

- **Archives historiques non gardées** : `okf/log.md` et les Playbooks
  `okf/implementation/*` décrivent l'état *au moment du changement* — leurs
  chiffres (« 66 hooks », « 80/105 variantes », « 82 hooks default_on ») sont des
  snapshots figés et ne doivent PAS suivre le registre courant. Les réécrire
  fausserait l'historique ; le drift guard ne s'applique qu'aux docs à état
  courant (READMEs, architecture/business/product/vision).
- Le compte total « 105 hooks » du bloc timeline est déjà gardé par
  `.claude/hooks-timeline.mjs --check` (il dérive de l'historique git, pas du
  champ `default_on`) — pas de doublon ici ; le bloc HOOK_COUNTS expose le
  même `total` depuis le registre (deux sources, deux mécanismes, pas de conflit).
