---
type: Playbook
title: CLI contribute — noms de fichiers canoniques des hooks
description: PR contribute auto-générée ajoutant des doublons <slug>.mjs byte-identiques aux hooks renommés sur main — résolue par un renommage canonique (git mv + script_path + config + tests + settings + timeline).
tags: [implementation, cli, contribute, registry, hooks, timeline, rename]
timestamp: 2026-08-05T00:00:00Z
---

# CLI contribute — noms de fichiers canoniques des hooks

## Problème

La PR générée par `npx hookstack-cli@latest contribute` pour 3 hooks modifiés
(`post-write-biome`, `stop-quality-check`, `worktree-create-update-deps`) ajoutait
des fichiers canoniques `<slug>.mjs` **byte-identiques** aux fichiers déjà présents
sur main mais renommés localement (`biome-check.mjs`, `quality-check.mjs`,
`update-deps.mjs`) :

- Le registre (script_path, config hooks) pointait vers les noms renommés.
- La CI bloquait sur le garde-fou `hooks-timeline --check` : la PR ajoutait 3
  nouveaux `.mjs` dans l'historique → artefacts timeline désynchronisés.
- Merger tel quel aurait créé des doublons (2 fichiers par hook, même fingerprint
  `@hookstack`).

## Résolution

Transformer la PR en renommage canonique (git mv, historique préservé) :

1. `git mv` des 3 fichiers `.claude/hooks/<outil>.mjs` → `<slug>.mjs` (+ les 3 tests
   `tests/hooks/*.test.mjs` et leurs imports/describes).
2. `registry/registry.json` : `script_path` et commandes des config hooks → noms
   canoniques (6 remplacements).
3. `node .claude/sync-hooks.mjs` : reconstruit `settings.json` (chemins canoniques,
   hooks toujours actifs) et met à jour les `test_snippet`.
4. `node .claude/hooks-timeline.mjs` : régénère les 3 artefacts (JSON/SVG/README).

## Pourquoi le fingerprint reste la source de vérité

Le CLI (`scanInstalledHooks`) détecte les hooks installés par leur fingerprint
`// @hookstack <slug>` (ligne 2), pas par leur nom de fichier — un utilisateur
peut donc renommer ses hooks installés sans casser `contribute`/`update`. Ce
renommage ne fait que réaligner le dépôt lui-même sur la convention documentée
(`<slug>.mjs` canonique), là où un renommage local chez l'utilisateur reste
supporté.
