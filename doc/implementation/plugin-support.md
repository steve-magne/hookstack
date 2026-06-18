# Plugin support — Claude Code, Codex, Copilot

## Contexte

Les utilisateurs de Claude Code, Codex et GitHub Copilot disposent d'une commande `/plugin` native pour installer des extensions directement depuis leur agent, sans passer par `npx`. L'objectif est d'offrir cette voie d'installation en parallèle du CLI existant.

## Ce qui a été ajouté

### Structure des fichiers

```
hookstack/
├── .claude-plugin/
│   └── plugin.json          # Manifeste Claude Code
├── .codex-plugin/
│   └── plugin.json          # Manifeste Codex
├── hooks/
│   ├── hooks.json           # Config des 83 hooks default_on (générée)
│   └── *.mjs                # 101 symlinks → ../.claude/hooks/*.mjs
```

### `.claude-plugin/plugin.json` et `.codex-plugin/plugin.json`

Chaque manifeste contient les métadonnées minimales (`name`, `displayName`, `version`, `description`, `author`, `license`, `homepage`, `repository`) et un pointeur `"hooks": "hooks/hooks.json"`. Le format est identique pour les deux agents — seul le répertoire de manifeste diffère (`.claude-plugin/` vs `.codex-plugin/`).

### `hooks/hooks.json`

Fichier de configuration des hooks dans le format attendu par le système de plugins :

```json
{
  "PreToolUse": [
    { "matcher": "Bash", "hooks": [{ "type": "command", "command": "node \"$PLUGIN_ROOT/hooks/detect-secrets.mjs\"" }] }
  ]
}
```

Différence clé avec `settings.json` :
- Pas de wrapper `{ hooks: { ... } }` — les événements sont à la racine
- Les chemins utilisent `$PLUGIN_ROOT` (variable fournie par le runtime plugin) au lieu de `$CLAUDE_PROJECT_DIR/.claude`

Le fichier est généré depuis `registry/registry.json` en filtrant les hooks `default_on: true` (83 sur 101). Les 18 hooks non-`default_on` sont disponibles via `npx hookstack-cli@latest install` pour une sélection fine.

### `hooks/*.mjs` — symlinks

Les 101 scripts `.mjs` dans `hooks/` sont des symlinks vers `../.claude/hooks/*.mjs`. Cela préserve le principe de source unique : les `.mjs` dans `.claude/hooks/` restent la vérité, le `sync-hooks.mjs` continue de les gérer normalement. Le plugin résout les symlinks au runtime, ce qui fonctionne dans tous les contextes (marketplace GitHub, install local).

## Décisions techniques

### Pourquoi des symlinks plutôt que des copies ?

Les 101 scripts font ~5 Mo au total. Les dupliquer créerait une dérive permanente dès qu'un `.mjs` est modifié. Les symlinks garantissent que le contenu livré par le plugin est exactement ce que le repo dogfoode — pas de snippets périmés, cohérent avec la règle "le `.mjs` est la source de vérité".

### Pourquoi filtrer sur `default_on` pour hooks.json ?

Le plugin active ses hooks dès l'installation. Activer les 101 hooks par défaut serait trop agressif — certains hooks sont stack-spécifiques (Python, TypeScript) ou expérimentaux. Les 83 `default_on` correspondent à ce que le CLI installe sans configuration manuelle.

### Format `hooks.json` vs `settings.json`

La différence de format (événements à la racine vs wrapper `hooks`) suit la convention des plugins de chaque agent, qui parcourent le fichier directement sans le wrapper de settings. C'est analogue à la distinction Codex (`events à la racine`) vs Claude Code (`wrapper hooks`) déjà gérée dans `core.mjs`.

### Copilot — approche marketplace

GitHub Copilot n'utilise pas de manifeste dans un répertoire dédié mais un modèle marketplace-sur-dépôt. Le repo Hookstack devient lui-même une entrée de marketplace via `copilot plugin marketplace add steve-magne/hookstack`. Aucun fichier supplémentaire n'est requis : le dépôt public suffit.

## Ce qui n'a PAS changé

- Le sync script (`sync-hooks.mjs`) — pas modifié, continue de gérer `.claude/hooks/` et `registry.json`
- La CI — aucune nouvelle gate nécessaire (les symlinks sont résolus par git)
- Le CLI `npx hookstack-cli@latest install` — inchangé, toujours le fast path recommandé

## Mise à jour README

Section « Install via /plugin » ajoutée après la section Installation, avec les commandes pour les 3 agents et une note sur la différence comportementale : avec `/plugin`, les scripts restent dans le répertoire d'installation de l'agent (global) plutôt que dans le projet (pas de hooks commités dans le repo).
