---
type: Architecture
title: Portabilité multi-agent — un hook, trois agents
description: Pourquoi le code .mjs est identique entre Claude Code, Codex et Copilot, seul le format de config diffère.
tags: [architecture, multi-agent, portability, differentiation]
timestamp: 2026-06-30T00:00:00Z
---

# L'invariant

**Codex et Claude Code partagent les mêmes noms d'événements de cycle de vie**
(`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`…). Le code d'un hook (`.mjs`) est donc
**identique entre agents** — seul le format du fichier de config diffère :

| Agent | Fichier de config | Forme |
|---|---|---|
| Claude Code / Copilot | `.claude/settings.json` | `{ "hooks": { Event: [...] } }` (clé `hooks`) |
| OpenAI Codex | `.codex/hooks.json` | événements **à la racine** (pas de wrapper `hooks`) |

Un hook s'écrit une fois, se déploie sur les trois agents. C'est le cœur du positionnement
(voir [/marketing/strategy](/marketing/strategy.md)).

# Ce que le CLI traduit à l'installation

Le CLI gère la transformation par scope (voir [/architecture/cli-scopes](/architecture/cli-scopes.md)) :
- Réécriture de `$CLAUDE_PROJECT_DIR` selon le scope (absolu en global, relatif pour Copilot).
- Relocalisation des `.mjs` `.claude/hooks/` → `.codex/hooks/` pour Codex.
- Écriture des événements à la racine du `hooks.json` pour Codex (pas de wrapper).

# Pourquoi c'est un fossé concurrentiel

Les collections existantes (`awesome-copilot`, docs officielles) sont **mono-agent**.
Hookstack capitalise un hook une fois pour trois écosystèmes — l'investissement dans un hook
se rentabilise sur Claude Code + OpenAI Codex + GitHub Copilot sans fragmenter le catalogue.
Cela multiplie le marché adressable sans diluer la qualité (voir
[/vision/mission](/vision/mission.md)).
