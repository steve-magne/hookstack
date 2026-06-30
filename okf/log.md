# Bundle Update Log

Historique des changements du bundle OKF. Date la plus récente en haut.
Toute session qui enrichit le bundle ajoute une entrée ici (voir [self-improvement](meta/self-improvement.md)).

## 2026-06-30
* **Initialization**: Création du bundle OKF conforme à la spec v0.1 — structure `vision/`, `architecture/`, `product/`, `business/`, `marketing/`, `roadmap/`, `strategy/`, `implementation/`, `meta/`. Contenu seedé depuis `doc/product/` (personas, vision, valeur, hook-101, UX), `CLAUDE.md` (architecture, scopes CLI, sync registre, outillage Claude Code) et `README.md`.
* **Creation**: `meta/agent-protocol.md`, `meta/self-improvement.md`, `meta/porting.md` — protocole de consommation agent, mécanisme d'auto-bonification (test de relecture + staleness 14j), guide de portage.
* **Creation**: 3 hooks catalogue `session-start-okf-staleness` (SessionStart), `stop-okf-staleness-check` (Stop), `okf-validate-on-change` (FileChanged) — boucle d'auto-maintien du bundle. Documentés dans [implementation/okf-knowledge-bundle](implementation/okf-knowledge-bundle.md).
