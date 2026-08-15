---
type: Playbook
title: Retrait de deux hooks obsolètes (changelog + son de fin)
description: stop-generate-changelog (remplacé par release-please) et stop-sound (Claude Code joue un son de complétion nativement) retirés du catalogue, du dogfood et de leurs tests.
tags: [implementation, registry, hooks, removal, notification, changelog, sound]
timestamp: 2026-08-15T00:00:00Z
---

# Retrait de deux hooks obsolètes

## Contexte

Deux hooks du catalogue étaient devenus obsolètes :

- `stop-generate-changelog` (`session-changelog.mjs`) — générait une entrée de
  CHANGELOG depuis le diff git de session. Remplacé par **release-please**, qui
  gère désormais le changelog.
- `stop-sound` (`stop-sound.mjs`) — jouait un son de complétion en fin de tâche
  (`afplay`/`paplay`/`beep`). **Claude Code joue désormais ce son nativement**,
  le hook faisait doublon.

Les deux hooks avaient **aussi** une variante Python (`session-changelog.py`,
`stop-sound.py` + tests pytest, ajoutés entre-temps par #237) : retirée en même
temps. `notification-sound` (événement Notification, quand Claude attend
l'utilisateur) reste — il couvre un besoin distinct (attention pendant une
session, pas la fin).

## Résolution

1. Suppression des scripts `.claude/hooks/session-changelog.{mjs,py}` et
   `.claude/hooks/stop-sound.{mjs,py}` + leurs tests
   (`tests/hooks/{session-changelog,stop-sound}.test.mjs` et
   `tests/hooks/test_stop-{generate-changelog,sound}.py`).
2. `registry/registry.json` : suppression des 2 entrées et de leurs champs
   `python_script_path`/`python_code_snippet`/`python_test_snippet` (103 → 101).
3. `scripts/check-hook-coverage.mjs` : retrait de `session-changelog.mjs` des
   `EXCEPTIONS` (fichier disparu → aurait été signalé « orphan »).
4. `.claude/sync-hooks.mjs` : commentaire de `EXCLUDED_SLUGS` actualisé —
   `stop-tts-completion` n'est plus « remplacé par stop-sound ».
5. `packages/cli/bin/core.mjs` : signal `changelog` retiré de `SIGNAL_LABELS`,
   `AUTO_DETECT`, `hasChangelogSignal` et de la détection (#244 le référençait) ;
   README CLI + tests mis à jour.
6. `README.md` : suppression des 2 bullets de la table des hooks phares.
7. `node .claude/sync-hooks.mjs` : reconstruit `.claude/settings.json` (les 2
   commandes `Stop` disparaissent).
8. `pnpm timeline` : régénère les 3 artefacts dérivés (JSON/SVG/bloc README).

## Pourquoi ne pas retirer les TTS

`stop-tts-completion` et `notification-tts-voice` (voix, pas sons) restent au
catalogue — exclus localement mais installables. Seuls les deux hooks
explicitement obsolètes ont été retirés.
