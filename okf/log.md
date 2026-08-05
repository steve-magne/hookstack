# Bundle Update Log

Historique des changements du bundle OKF. Date la plus récente en haut.
Toute session qui enrichit le bundle ajoute une entrée ici (voir [self-improvement](meta/self-improvement.md)).

## 2026-08-05
* **Creation**: [Badge de coverage du README](implementation/coverage-badge.md) — `scripts/coverage-badge.mjs` génère un badge SVG 4 métriques depuis `coverage-summary.json` et l'insère dans le README (bloc `COVERAGE_BADGE`), vérifié par la CI via `--check`.
* **Creation**: [Gate CI — couverture lignes ≥ 80 % par hook individuel](implementation/per-hook-coverage-gate.md) — `scripts/check-hook-coverage.mjs` bloque tout hook sous 80 % de couverture lignes (en plus du seuil agrégé vitest), avec liste d'exceptions auto-périmable pour 16 hooks hérités.
* **Update**: [CLI contribute](implementation/cli-contribute-command.md) — pousse désormais aussi les tests unitaires localement modifiés (`tests/hooks/`) avec leur hook (`detectTestChanges`, PR body listant les tests).
* **Update**: [Outillage Claude Code](architecture/claude-code-tooling.md) — le CI exécute les tests unitaires avec un gate de coverage (`pnpm test:coverage`, `@vitest/coverage-v8`) : lignes/statements/branches ≥ 80 %, fonctions ≥ 75 % ; `validate:registry` exige désormais un test unitaire pour chaque hook dogfoodé.

## 2026-06-30
* **Initialization**: Création du bundle OKF conforme à la spec v0.1 — structure `vision/`, `architecture/`, `product/`, `business/`, `marketing/`, `roadmap/`, `strategy/`, `implementation/`, `meta/`. Contenu seedé depuis `doc/product/` (personas, vision, valeur, hook-101, UX), `CLAUDE.md` (architecture, scopes CLI, sync registre, outillage Claude Code) et `README.md`.
* **Creation**: `meta/agent-protocol.md`, `meta/self-improvement.md`, `meta/porting.md` — protocole de consommation agent, mécanisme d'auto-bonification (test de relecture + staleness 14j), guide de portage.
* **Creation**: 3 hooks catalogue `session-start-okf-staleness` (SessionStart), `stop-okf-staleness-check` (Stop), `okf-validate-on-change` (FileChanged) — boucle d'auto-maintien du bundle. Documentés dans [implementation/okf-knowledge-bundle](implementation/okf-knowledge-bundle.md).
