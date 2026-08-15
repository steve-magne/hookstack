---
type: Playbook
title: CLI — détection autonome complète (tous les hooks nécessaires)
description: Le CLI install étend sa détection contextuelle de 5 à 11 signaux pour installer automatiquement l'ensemble des hooks non-default_on pertinents pour le projet (tests, skills, registry, TTS, Slack, docs).
tags: [implementation, cli, install, autodetect, autonomie, signals]
timestamp: 2026-08-15T00:00:00Z
---

# CLI full-autonomy detection

## What

Le fast path (`npx hookstack-cli@latest install`, sans `--hooks=`) ne se limite plus
à 5 signaux contextuels. Il détecte désormais **11 systèmes** et auto-ajoute
(`--yes`) ou propose (interactif, multiselect pré-coché) les hooks non-`default_on`
correspondants — l'objectif « CLI vraiment autonome » : un `install` par défaut
couvre l'ensemble des hooks dont le projet a réellement besoin, sans sélection
manuelle.

## Why this shape

Même architecture que la détection v1 ([cli-smart-toolstack-detection](cli-smart-toolstack-detection.md)) :
table statique `AUTO_DETECT` + `detectProjectSignals` pur à DI dans `core.mjs`.
Pas de champ registre (`requires`/`signals`) : `registry.schema.json` est
`additionalProperties: false` et le CLI est le seul consommateur — KISS, on étend
la table locale plutôt que de propager un champ dans registre/schema/types/sync/API/front.

Nouveaux signaux (en plus de `i18n`, `okf`, `nextjs`, `frontend`, `github`) :

| Signal | Détection | Hooks ajoutés |
|---|---|---|
| `tests` | dossier `tests/test/__tests__/spec` racine, OU test runner dans `package.json` (vitest/jest/mocha/playwright/…), OU mention `pytest` dans un manifeste Python | `file-changed-run-tests` |
| `skills` | dossier `.claude/skills/` ou `.claude/commands/` | `user-prompt-expansion-skill-context` |
| `registry` | `registry/registry.json` **ET** `.claude/sync-hooks.mjs` (repo façon HookStack — évite d'installer la validation sans le script qu'elle appelle) | `registry-validate-on-change` · `registry-changed-auto-sync` · `stop-registry-drift-check` |
| `tts` | `platform === 'darwin'` (say), OU Linux avec `espeak`/`spd-say` dans `PATH` | `notification-tts-voice` · `stop-tts-completion` · `subagent-start-tts-announce` · `subagent-stop-tts-summary` |
| `slack` | `SLACK_WEBHOOK_URL` dans l'env OU dans `.env`/`.env.local`/`.env.development` (le hook est un no-op sans webhook) | `notification-slack` |
| `docs` | `README.md` racine + ≥ 1 `packages/*/README.md` (monorepo multi-surfaces) | `file-changed-docs-consistency` |

## Implementation

- `packages/cli/bin/core.mjs` :
  - `detectProjectSignals(root, { readdirSync, readFileSync, existsSync, env, platform })`
    — nouveaux deps optionnels avec défauts « absent » (`existsSync = () => false`,
    `env = {}`, `platform = ""`) pour que les callers structure-only restent inchangés.
  - Helpers purs : `hasTestsSignal` (réutilise `readPackageDeps`/`hasAnyDep`),
    `hasSkillsSignal`, `hasRegistrySignal`, `hasTtsSignal`
    (split PATH sur `:`/`;` pour Windows), `hasSlackSignal`, `hasDocsSignal`.
  - `AUTO_DETECT` + `SIGNAL_LABELS` étendus (11 signaux).
- `packages/cli/bin/cli` :
  - `detectContextualHooks` passe `{ readdirSync, readFileSync, existsSync, env: process.env, platform: process.platform }`.
  - Aucun autre changement : le flux signal → fetch → multiselect/auto-add est générique.
- Tests : `tests/cli/core.test.mjs` — ~20 cas `detectProjectSignals` (chaque nouveau
  signal + contre-exemples : registry.json seul, Linux sans espeak, Windows, slack
  sans webhook, README unique) + mapping `suggestHooksForSignals` des 6 nouveaux signaux.
- Docs : `packages/cli/README.md` (table de détection + intro) et `README.md` racine
  (paragraphe Installation), conformément à la règle de cohérence des deux README.

## Explicitly out of scope

- `post-bash-cost-tracker` : non détecté — opt-in universel (journalisation des
  commandes Bash), pas un besoin « projet » ; le laisser hors détection évite
  d'installer un log qui grossit sans limite chez tout le monde.
- `task-created-naming-convention` : non détecté — impose un préfixe `[TICKET-123]`
  bloquant ; une convention de tickets est un choix d'équipe, pas un signal projet.
- `motion-rules-guard` : non détecté — garde trop opinée sur un langage d'animation
  maison (déjà documenté hors scope en v1).
- Pas de champ registre pour piloter la détection (table statique CLI, cf. v1).
- Détection inchangée pour `update`/`contribute` — uniquement `install`.
