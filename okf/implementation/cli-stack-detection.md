---
type: Playbook
title: CLI install — détection de stack pour filtrer les hooks par défaut
description: Le CLI installait tout le set default_on sans distinction de langage (ex. le hook Biome, TypeScript-only, dans un projet purement Python) — résolu par détection de stack par manifeste + filtrage côté CLI et exposition du champ registre stack via l'API.
tags: [implementation, cli, api, registry, stack]
timestamp: 2026-08-11T00:00:00Z
---

# CLI install — détection de stack pour filtrer les hooks par défaut

## Problème

`npx hookstack-cli@latest install` (sans `--hooks=`) installe tout le set
`default_on` du registre (83 hooks sur 105), sans jamais regarder le champ
`stack` que 19 d'entre eux portent déjà (`registry/registry.schema.json`,
enum `typescript | python`). Résultat : un projet purement Python recevait
`post-write-biome` et les 12 autres hooks `default_on` TypeScript-only, alors
qu'ils ne s'appliquent pas. Le CLI était le seul maillon de la chaîne à
ignorer une métadonnée que le produit exposait déjà côté site
(`CatalogueExplorer`, filtre `src/lib/hooks.ts`).

## Résolution (fix minimal, pas de nouvelle donnée)

1. `src/app/api/hooks/route.ts` — ajoute `stack: h.stack ?? []` à la réponse
   `/api/hooks` (elle ne l'exposait pas du tout).
2. `packages/cli/bin/core.mjs` — deux fonctions pures testées :
   - `detectStacks(cwd, { existsSync })` : signaux par manifeste
     (`package.json`/`tsconfig.json`/`pnpm-workspace.yaml` → typescript ;
     `pyproject.toml`/`requirements.txt`/`setup.py`/`Pipfile`/`uv.lock` →
     python), pas par extension de fichier.
   - `filterHooksByStack(hooks, stacks)` : un hook universel (sans `stack`)
     passe toujours ; un hook stack-spécifique n'entre que si son `stack`
     recoupe `stacks`. `stacks` vide/absent = no-op (même règle que le
     filtre catalogue du site).
3. `packages/cli/bin/cli` — `applyStackFilter` branché uniquement sur
   l'install par défaut (`slugs.length === 0`) : un `--hooks=` explicite
   n'est **jamais** filtré, l'intention de l'utilisateur prime. Flags
   d'override : `--stacks=typescript,python` (bypass la détection) et
   `--no-detect` (comportement d'avant, set complet).

## Ce qui a été volontairement laissé de côté

Discuté dans le brainstorm mais hors scope du fix : extraction d'un package
partagé `@hookstack/detect-stack`, `update --prune-stack-mismatch`, manifeste
`.hookstack.json` committé, élargissement de l'enum `stack` à Java/Go/Rust.
Aucun n'était nécessaire pour corriger le cas rapporté (Biome installé dans
un projet Python) — à reprendre si un besoin concret apparaît.
