---
type: Playbook
title: CLI install — stop-force-implementation-doc rattaché au signal okf
description: Le hook stop-force-implementation-doc (gate okf/implementation/ en fin de session) n'était rattaché à aucun signal AUTO_DETECT — un projet avec un vrai bundle OKF à la racine ne le recevait jamais via l'install par défaut, contrairement à ses trois cousins (okf-validate-on-change, session-start-okf-staleness, stop-okf-staleness-check) qui, eux, sont sur le signal okf.
tags: [implementation, cli, install, detection, okf, signals]
timestamp: 2026-09-02T00:00:00Z
---

# CLI install — stop-force-implementation-doc rattaché au signal okf

## Problème

Signalé sur un projet avec un vrai dossier `okf/` à la racine : `npx
hookstack-cli@latest install` n'installait jamais `stop-force-implementation-doc`
(gate qui bloque la fin de session si du code source a changé sans note
`okf/implementation/`). Cause : `AUTO_DETECT.okf` (cf.
[cli-full-autonomy-detection](cli-full-autonomy-detection.md)) ne listait que
3 slugs (`okf-validate-on-change`, `session-start-okf-staleness`,
`stop-okf-staleness-check`) — `stop-force-implementation-doc` avait `stack`
absent et `default_on: false`, donc n'était atteignable que par un
`--hooks=` explicite, alors que sa logique même (`isImplDoc` cherche
`okf/implementation/`) n'a de sens que sur un projet qui a un bundle OKF.
Même trou de conception que celui documenté par
[cli-monorepo-workspace-signal-detection](cli-monorepo-workspace-signal-detection.md)
(hook signal-dépendant mais jamais branché au signal) — cette fois côté table
de mapping, pas côté probe filesystem.

## Résolution

`packages/cli/bin/core.mjs` : `stop-force-implementation-doc` ajouté à
`AUTO_DETECT.okf` (4 slugs désormais). Aucun autre changement — le hook
existait déjà dans le registre, correctement écrit, juste jamais relié.

## Why this shape

Même critère que les 3 hooks déjà sur ce signal : le hook n'a de valeur que
sur un projet qui maintient réellement un bundle OKF (`hasOkfDir`, dossier
`okf`/`.okf`/`OKF` à la racine) — un projet sans OKF n'a pas de dossier
`okf/implementation/` où écrire la note demandée, le gate serait juste un
bruit permanent. `default_on` reste `false` (décision registre inchangée) :
seule la détection contextuelle change.

## Implementation

- `packages/cli/bin/core.mjs` : `AUTO_DETECT.okf` → 4 slugs.
- `tests/cli/core.test.mjs` : `suggestHooksForSignals(["okf"])` et le test
  d'exclusion des slugs déjà sélectionnés mis à jour (4 slugs).
- `packages/cli/README.md` : ligne `okf` de la table de détection.
- `CLAUDE.md`/`README.md`/docs comptages : régénérés via `pnpm readme:counts`
  (dogfooded count inchangé — ce fix ne touche pas `.claude/settings.json`,
  seulement le mapping signal → suggestion CLI pour les consommateurs externes).

## Validation

- `tests/cli/core.test.mjs` (228 tests) · `pnpm test` (1206 ✓) ·
  `pnpm typecheck` · `pnpm validate:registry` ·
  `node .claude/sync-hooks.mjs --check` ✓.
