---
type: Architecture
title: Scopes d'installation CLI — 5 scopes, 3 agents
description: Les 5 cibles d'installation du CLI hookstack-cli, le format de config et la réécriture des chemins par scope.
tags: [architecture, cli, scopes, multi-agent]
timestamp: 2026-06-30T00:00:00Z
---

# Les 5 scopes

Le CLI ([`packages/cli/bin/cli`](../../packages/cli/bin/cli) + logique pure dans
[`core.mjs`](../../packages/cli/bin/core.mjs)) installe les mêmes hooks vers **5 scopes**,
couvrant 3 agents :

| Scope | Flag | Cible | Format | Réécriture des chemins |
|---|---|---|---|---|
| `project` | (défaut) | `./.claude/settings.json` | claude | conserve `$CLAUDE_PROJECT_DIR` |
| `global` | `--global`/`-g` | `~/.claude/settings.json` | claude | `$CLAUDE_PROJECT_DIR` → racine absolue |
| `copilot` | `--copilot` | `./.claude/settings.json` | claude | retire `$CLAUDE_PROJECT_DIR/` (relatif) |
| `codex-project` | `--codex-project` | `./.codex/hooks.json` | codex (events racine) | `$CLAUDE_PROJECT_DIR/.claude/` → `.codex/` |
| `codex-profile` | `--codex-profile` | `~/.codex/hooks.json` | codex | `$CLAUDE_PROJECT_DIR/.claude/` → `<home>/.codex/` |

# Fonctions clés (`core.mjs`)

- `resolveScopeRoot` — retourne `format` + chemins (clés `claudeDir`/`settingsPath` conservées par rétro-compat).
- `collectIncomingHooks` — réécrit `command` par scope.
- `resolveScriptPath` — relocalise les `.mjs` `.claude/hooks/` → `.codex/hooks/` pour Codex.
- `isGlobalScope` / `isCodexScope` — prédicats.

Pour Codex, `doInstall` écrit les événements **à la racine** du `hooks.json` (pas de wrapper `hooks`).

# Ordre du menu interactif

```
1  This project          → project (Claude Code, committé avec le repo)
2  All my projects       → global (Claude Code, toutes machines)
3  Codex profile         → codex-profile
4  Codex project         → codex-project
5  GitHub Copilot        → copilot
```

# Couverture de tests

Toute évolution doit rester couverte par [`tests/cli/core.test.mjs`](../../tests/cli/core.test.mjs).
La fusion des configs (`mergeConfig.ts` côté site) regroupe par événement puis par matcher,
sans écrasement (voir [/product/ux-cli-delivery](/product/ux-cli-delivery.md)).

Voir [/architecture/multi-agent-portability](/architecture/multi-agent-portability.md) pour
le pourquoi de la portabilité.
