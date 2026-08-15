---
type: Playbook
title: Dédup des hooks — fusion biome/ruff et retrait des gardes redondantes
description: Fusion de post-write-autoformat dans post-write-biome, de post-write-ruff-format dans post-write-ruff-check (variantes .mjs et .py), suppression de pre-bash-guard-git-push-main, et correctifs miroir .mjs/.py (enforce-uv, setup-check-deps, inject-datetime, tts, fingerprint).
tags: [implementation, hooks, registry, sync, refactor, dedup]
timestamp: 2026-08-15T00:00:00Z
---

# Dédup des hooks — fusion format+lint et retrait des gardes redondantes

## What

Trois chevauchements du catalogue éliminés, appliqués en miroir aux variantes `.mjs`/`.py` :

1. **`pre-bash-guard-git-push-main` supprimé** — redondant avec `pre-bash-guard-force-push-any`
   (bloque `--force` nu sur toute branche, plus strict et mieux écrit) et `pre-bash-block-destructive`
   (qui bloque déjà force→main dans sa liste `BLOCKED`). Le regex `\b(main|master)\b` de l'ancien
   hook produisait aussi des faux positifs (`feature/main`).
2. **`post-write-autoformat` fusionné dans `post-write-biome`** — les deux lançaient `biome` par
   écriture (2 processus). Le hook fusionné exécute `biome check --write --error-on-warnings`
   (format + lint en un seul passage). L'ancien `post-write-autoformat` documentait « Prettier »
   alors qu'il exécutait Biome — corrigé au passage.
3. **`post-write-ruff-format` fusionné dans `post-write-ruff-check`** (`.mjs` + `.py`) — le hook
   fusionné fait `ruff format` (silencieux, non bloquant) puis `ruff check --fix` (erreurs remontées),
   préservant la sémantique des deux.

## Correctifs miroir `.mjs`/`.py` (mêmes règles, deux langages)

- **`block-push-closed-pr`** : le `.mjs` n'avait ni shebang ni fingerprint `@hookstack` (le sync
  n'injecte le fingerprint qu'après un shebang ligne 1). Ajout du shebang — le fingerprint est
  désormais injecté par le sync.
- **`pre-bash-enforce-uv`** : neutralisation des chaînes entre guillemets (comme
  `enforce-package-managers`) — plus de faux positif sur `git commit -m "pip install …"`.
- **`setup-check-install-deps`** : `requirements.txt → pip install` remplacé par `uv.lock → uv sync`
  (cohérent avec `enforce-uv` ; `requirements.txt` n'est pas un lockfile).
- **`user-prompt-inject-datetime`** : suppression de la locale `fr-FR` codée en dur (et des tableaux
  de mois/jours français du `.py`) au profit d'un format ISO-like neutre et déterministe.
- **`subagent-stop-tts`** : ajout du fallback `spd-say` présent chez ses 3 frères TTS.
- **`session-start-load-git-context`** : commentaire « UserPromptSubmit » → `SessionStart` (l'événement réel).

## Why this shape

- Chaque fusion **conserve un slug existant** (`post-write-biome`, `post-write-ruff-check`) au lieu
  d'en créer un nouveau : pas de nouveau fichier de hook, donc pas de nouvelle date git requise pour
  la timeline, et pas de rupture des références README/guides.
- Les suppressions cascadent sur les 4 surfaces (README GitHub, README npm, `src/lib/guides.ts`,
  docs) — toutes mises à jour dans le même commit pour garder la cohérence obligatoire.

## Pièges rencontrés

- **`ruff check --fix` + `ruff format` en un seul hook** : préserver l'ordre (format d'abord) et la
  non-blocabilité du format (un `uv` absent ne doit pas faire échouer le lint). Les tests couvrent
  les deux étages (`ruff-format` échoue silencieusement → `ruff check` tourne quand même).
- **Fingerprint sans shebang** : `ensureFingerprint`/`ensurePythonFingerprint` de `sync-hooks.mjs`
  ne touchent pas un fichier sans `#!` en ligne 1 — un `.mjs` qui commençait par `import` restait
  sans `@hookstack`. Correctif = rétablir le shebang, pas éditer le fingerprint à la main.
- **Timeline après suppression non committée** : la timeline se régénère depuis l'historique git ;
  tant que la suppression n'est pas committée, `timeline --check` échoue (les hooks supprimés
  restent dans les artefacts). Comme aucun nouveau fichier de hook n'est créé, `pnpm timeline`
  est sûr à lancer avant commit (il retire simplement les 3 hooks supprimés).
