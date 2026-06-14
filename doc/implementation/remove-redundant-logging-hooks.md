# Suppression des hooks de logging redondants

## Contexte

Après avoir installé hookstack sur un projet externe, l'utilisateur a constaté la création de fichiers inattendus :
- `.claude/data/sessions/<uuid>.json` — un fichier par session
- `.claude/data/bash-log.jsonl` — journal de toutes les commandes Bash

Ces fichiers étaient générés par trois hooks du catalogue : `user-prompt-log-session`, `post-bash-command-log`, et `user-prompt-llm-agent-name`.

## Problème identifié

### Redondance avec Claude Code natif

Claude Code enregistre déjà nativement :
- `~/.claude/history.jsonl` — tous les prompts utilisateur avec `project` et `sessionId`
- `~/.claude/projects/<project>/<session>.jsonl` — transcripts complets (prompts + réponses + tool calls)

Les hooks `user-prompt-log-session` et `post-bash-command-log` dupliquaient exactement ces données sans valeur ajoutée.

### Mauvais emplacement d'écriture

Les trois hooks écrivaient dans `$CLAUDE_PROJECT_DIR/.claude/data/`, c'est-à-dire **dans le répertoire du projet cible**. Conséquences :
- Pollution des projets avec des fichiers de logs non demandés
- Risque de commit accidentel de données sensibles (prompts en clair, commandes avec chemins absolus) si `.claude/data/` n'est pas dans `.gitignore`
- Confusion de l'utilisateur qui ne comprend pas l'origine de ces fichiers

## Décisions

### `user-prompt-log-session` → retiré du catalogue

Enregistrait chaque prompt dans `.claude/data/sessions/<uuid>.json`. Doublon exact de `~/.claude/history.jsonl`. Retiré complètement.

### `post-bash-command-log` → retiré du catalogue

Enregistrait toutes les commandes Bash dans `.claude/data/bash-log.jsonl`. Les transcripts natifs Claude Code contiennent déjà cette information. Retiré complètement.

### `user-prompt-llm-agent-name` → conservé, chemin corrigé

Ce hook a une valeur unique : il attribue un nom de session à l'agent (Phoenix, Atlas, Nexus…) et l'injecte dans le system-prompt via `UserPromptSubmit`. La feature est appréciée et sans équivalent natif.

Correction : le fichier de persistance du nom passe de `$CLAUDE_PROJECT_DIR/.claude/data/sessions/` à `~/.claude/data/sessions/` (via `homedir()` au lieu de `process.env.CLAUDE_PROJECT_DIR`). Les données de session restent globales et hors des projets des utilisateurs.

## Fichiers modifiés

| Fichier | Action |
|---|---|
| `.claude/hooks/user-prompt-log.mjs` | Supprimé |
| `.claude/hooks/bash-command-log.mjs` | Supprimé |
| `.claude/hooks/user-prompt-name-agent.mjs` | Chemin `projectDir` → `homedir()` |
| `tests/hooks/user-prompt-log.test.mjs` | Supprimé |
| `tests/hooks/bash-command-log.test.mjs` | Supprimé |
| `tests/hooks/user-prompt-name-agent.test.mjs` | Dep `projectDir` → `home` |
| `registry/registry.json` | Retrait de 2 entrées (102 → 100 hooks) |
| `src/lib/guides.ts` | Retrait des 2 slugs dans `relatedHookSlugs` |
| `.claude/settings.json` | Reconstruit par `sync-hooks.mjs` |
