---
type: Playbook
title: CLI contribute — hooks renommés localement (fichier ≠ slug)
description: Le contribute du CLI échouait en ENOENT quand l'utilisateur renommait un hook .mjs installé — la copie partait de <slug>.mjs au lieu du fichier réel portant le fingerprint.
tags: [implementation, cli, contribute, fingerprint, bugfix]
timestamp: 2026-08-05T00:00:00Z
---

# CLI `contribute` — hooks renommés localement

## What

`npx hookstack-cli@latest contribute` crashe en `ENOENT: no such file or
directory, copyfile '<proj>/.claude/hooks/<slug>.mjs'` quand l'utilisateur a
**renommé** un hook installé (ex. `post-write-biome.mjs` → `biome-check.mjs`).

## Root cause

La détection des hooks installés est basée sur le **fingerprint**
`// @hookstack <slug>` (ligne 2), pas sur le nom de fichier. `contribute`
détectait donc correctement le slug via `findInstalledSlugs`, mais `cli`
copiait ensuite depuis `join(dirs.hooksDir, `${slug}.mjs`)` — un fichier qui
n'existe plus après renommage. Le fingerprint vit dans le fichier, le nom de
fichier est arbitraire : les deux devaient être transportés ensemble.

## Implementation

- `packages/cli/bin/core.mjs` :
  - Nouveau `scanInstalledHooks(hooksDir, deps)` → `[{ slug, file }][]` — lit
    chaque `.mjs` du dossier, extrait le fingerprint, et retourne le slug
    **avec le nom de fichier réel** qui le porte (dédup par slug, premier
    fichier gagne). `findInstalledSlugs` devient un wrapper trivial dessus
    (slugs only) — API inchangée pour `update`.
  - `detectScriptChanges(hooks, scope, root, deps, fileBySlug = {})` — nouveau
    paramètre optionnel : si le slug a une entrée, comparer ce fichier réel
    (chemin absolu) au `code_snippet` du registre au lieu de
    `root + script_path`. Comportement par défaut identique (update).
- `packages/cli/bin/cli` : le flux contribute transporte désormais
  `{ slug, file }` de bout en bout —
  `findContributionCandidates` (scan + chemin absolu) →
  `loadChangedHooks` (comparaison sur le fichier réel via `fileBySlug`) →
  `pushContribution(sources, …)` qui copie depuis **le fichier réel** mais
  écrit le résultat sous le nom canonique `<slug>.mjs` dans le worktree du PR
  (le registre upstream attend le slug comme nom de fichier).

## Why this shape

Le fingerprint est la source de vérité de l'identité d'un hook installé (c'est
déjà lui qui alimente `update`) ; le nom de fichier n'est qu'un emplacement.
Plutôt que de chercher `<slug>.mjs` à la copie (fragile, ne couvre pas la
détection), on porte la paire `{ slug, file }` dès le scan — une seule source
de vérité, pas de rescan.

La destination dans le PR reste `<slug>.mjs` : on contribue *le hook*, pas le
nom local — le fichier doit arriver sous son identité canonique pour que la PR
soit un vrai diff sur le registre.

## Tests

`tests/cli/core.test.mjs` : `scanInstalledHooks` (renommage, dédup, dossier
absent, fichiers sans fingerprint) et `detectScriptChanges` avec `fileBySlug`
(identique → unchanged, divergent → changed). Les tests existants de
`findInstalledSlugs` et `detectScriptChanges` (sans override) passent sans
changement.

## Explicitly out of scope

- Pas de migration des fichiers renommés (le CLI n'écrit que le worktree du
  PR, jamais le projet de l'utilisateur).
- Pas de changement pour `update` : il re-fetch par slug et réécrit
  `<slug>.mjs` — c'est son contrat de (re)création du fichier.
