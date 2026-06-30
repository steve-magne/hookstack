---
type: Architecture
title: Vue d'ensemble — mono-repo, stack, conventions
description: Structure du repo Hookstack, stack technique et conventions de code.
tags: [architecture, overview, stack]
timestamp: 2026-06-30T00:00:00Z
---

# Structure du repo

| Dossier | Rôle |
|---|---|
| `src/` | Site web Next.js — catalogue, HookConfigurator, pages (`hookstack.app`) |
| `packages/cli/` | Package npm public `hookstack-cli` — CLI installé via `npx` |
| `registry/registry.json` | Source de vérité des **métadonnées** du catalogue ; `code_snippet` dérivé des `.mjs` |
| `.claude/hooks/*.mjs` | Source de vérité du **code** des hooks (dogfoodés + testés) |
| `doc/product/` | Vision produit, personas, UX, marketing (ne pas modifier sans raison) |
| `okf/` | Ce bundle de connaissance agentique (OKF v0.1) |
| `README.md` | README vendeur GitHub |

# Stack technique

| Outil | Rôle |
|---|---|
| Next.js 15 (App Router) | SSR, routing, Server Components |
| TypeScript 5.x | Typage statique strict |
| Tailwind CSS v4 | Styles utilitaires |
| Zustand | État global client (sélection de hooks, persisté `localStorage`) |
| Motion (`motion/react`) | Animations (LazyMotion `domMax` strict, `m.*` uniquement) |
| pnpm 9.x | Gestionnaire de paquets |
| Biome 2.x | Lint + formatage |
| Vitest 4.x | Tests unitaires |

# Commandes

```bash
pnpm dev          # serveur dev (port 3000)
pnpm build        # build production
pnpm typecheck    # TS sans émission
pnpm lint         # Biome
pnpm test         # Vitest
node .claude/sync-hooks.mjs        # disque -> registry (code_snippet) + settings.json
pnpm timeline     # régénère la timeline /evolution depuis git
```

# Conventions générales

- **Langue** : tout le catalogue et l'UI en anglais. Ce bundle OKF et `doc/product/` sont en français.
- **Composants** : tous `'use client'` (Zustand + state). Pages `app/` = Server Components.
- **Source unique** : `registry/registry.json` lu par `src/lib/hooks.ts`. Sans `.env`, mode registre local.
- **Routes** : `/` (Home = hero + catalogue), `/hook/[slug]` (détail), `/evolution` (timeline).

Voir aussi [/architecture/registry-sync](/architecture/registry-sync.md) (mécanique de sync),
[/architecture/cli-scopes](/architecture/cli-scopes.md) (installation multi-agent) et
[/architecture/claude-code-tooling](/architecture/claude-code-tooling.md) (garde-fous CI).
