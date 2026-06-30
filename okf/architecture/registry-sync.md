---
type: Architecture
title: Sync catalogue → projet (le .mjs est la vérité)
description: Les .claude/hooks/*.mjs sont la source de vérité du code ; registry.json en dérive code_snippet ; settings.json est reconstruit.
tags: [architecture, registry, sync, dogfood]
timestamp: 2026-06-30T00:00:00Z
---

# Principe inversé

`registry/registry.json` est la source canonique des **métadonnées** du catalogue (versionné).
Mais le **code exécutable** vit dans `.claude/hooks/*.mjs` — fichiers réels, dogfoodés sur ce
projet et couverts par des tests (`tests/hooks/`). Le champ `code_snippet` du registre est
**dérivé automatiquement** du `.mjs` sur disque. `.claude/settings.json` est un artefact
reconstruit.

> Pourquoi : le CLI livre `code_snippet` aux utilisateurs. En faisant du `.mjs` la vérité, on
> livre exactement le code qu'on exécute et teste — fini les snippets périmés.

# Flux de travail

1. Modifier le hook **directement dans son `.mjs`** sous `.claude/hooks/`.
2. Ajouter / mettre à jour son test dans `tests/hooks/<slug>.test.mjs`, lancer `pnpm test`.
3. Propager vers le catalogue : `node .claude/sync-hooks.mjs` (recopie le `.mjs` dans `code_snippet`).
4. Le hook `registry-auto-sync` (FileChanged) relance déjà cette sync après chaque édition d'un `.mjs`.

# Ce que fait `sync-hooks.mjs`

- Pour chaque hook dont le `.mjs` existe → recopie son contenu dans `code_snippet` (le disque gagne).
- Hook sans fichier sur disque → **préserve** le `code_snippet` ; peut le seeder en `.mjs` (bootstrap).
- Reconstruit `.claude/settings.json` depuis les `implementation.config` (filtre les stacks `python`/`java` only).
- Préserve la section `permissions` de l'ancien `settings.json`.
- `--dry-run` : aperçu sans écriture · `--check` : exit ≠ 0 si dérive registre/disque (garde-fou CI).

# Fingerprint `@hookstack`

Le sync injecte automatiquement `// @hookstack <slug>` en **ligne 2** (après le shebang) de
chaque `.mjs`. Ce marqueur permet de détecter l'utilisation des hooks Hookstack dans des dépôts
open source : `grep -r "@hookstack" --include="*.mjs"`. Ne pas l'éditer à la main — il est
maintenuu par le sync.

# Règle absolue

**Ne jamais éditer `code_snippet` à la main** dans `registry.json` — il sera écrasé par le sync.
Toute évolution du code passe par le `.mjs` + son test, puis sync.

Voir [/architecture/claude-code-tooling](/architecture/claude-code-tooling.md) pour les garde-fous CI.
