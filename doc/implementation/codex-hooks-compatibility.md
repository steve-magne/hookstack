# Compatibilité multi-agent — OpenAI Codex

Ajout du support **OpenAI Codex** au CLI `hookstack-cli`, aux côtés de Claude Code
et GitHub Copilot. Propagé sur les 4 surfaces (CLI, site, READMEs, docs marketing).

## Contexte & contrainte produit

HookStack distribue des hooks agentiques. Jusqu'ici : Claude Code
(`.claude/settings.json`) + un mode GitHub Copilot (chemins relativisés).
Objectif : installer **les mêmes hooks** pour Codex.

**Fait déterminant** : Codex et Claude Code partagent les **mêmes noms
d'événements** de cycle de vie (`PreToolUse`, `PostToolUse`, `SessionStart`,
`UserPromptSubmit`, `Stop`, `PreCompact`…). Vérifié via la doc Codex
(`ManagedHooksRequirements`, exemples `hooks.json`). Conséquence : **le code des
hooks `.mjs` est identique entre agents** — on ne réécrit aucun hook, on
transforme seulement le format de config et les chemins à l'installation.

### Différences de format (la seule chose à gérer)

| | Claude Code / Copilot | OpenAI Codex |
|---|---|---|
| Fichier | `.claude/settings.json` | `.codex/hooks.json` |
| Structure | `{ "hooks": { Event: [...] } }` | `{ Event: [...] }` (événements **à la racine**) |
| Scripts | `.claude/hooks/` | `.codex/hooks/` |
| Commande | `node $CLAUDE_PROJECT_DIR/.claude/hooks/x.mjs` | `node .codex/hooks/x.mjs` (relatif) ou chemin absolu (profil) |

## Choix techniques (CLI)

Tout dans `packages/cli/bin/core.mjs` (logique pure, testée) + `cli` (I/O fin),
en respectant la convention « run pur + garde I/O » du projet.

### Scopes

5 scopes au total, 2 nouveaux **insérés au-dessus de `copilot`** dans le menu :

| Scope | Flag | Cible | Format | Racine |
|---|---|---|---|---|
| `project` | (défaut) | `./.claude/settings.json` | claude | cwd |
| `global` | `--global`/`-g` | `~/.claude/settings.json` | claude | home |
| `codex-profile` | `--codex-profile` | `~/.codex/hooks.json` | codex | home |
| `codex-project` | `--codex-project` | `./.codex/hooks.json` | codex | cwd |
| `copilot` | `--copilot` | `./.claude/settings.json` | claude | cwd |

Ordre du menu interactif : This project → All my projects → Codex profile →
Codex project → GitHub Copilot.

### Rétrocompatibilité (ne rien casser)

`resolveScopeRoot` **conserve ses clés existantes** (`claudeDir`, `hooksDir`,
`settingsPath`) — elles pointent désormais vers le bon répertoire/fichier selon
l'agent, sans renommer les champs consommés par `cli` et les tests existants. Un
champ `format` (`'claude'` | `'codex'`) est ajouté pour piloter l'écriture.

Nouveaux helpers purs, faciles à tester :
- `isGlobalScope(scope)` / `isCodexScope(scope)` — prédicats centralisés
  (`global` et `codex-profile` sont « globaux » → pas d'install de tests unitaires).
- `SCOPES` — set de validation utilisé par `--scope=`.
- `rewriteCommand(command, scope, globalRoot)` — réécriture des chemins par scope
  (factorise l'ancien `if` inline). Pour Codex on remplace le préfixe
  `$CLAUDE_PROJECT_DIR/.claude/` (regex `CLAUDE_PREFIX_RE`) par `.codex/`
  (projet, relatif) ou `<home>/.codex/` (profil, absolu).
- `resolveScriptPath(scriptPath, scope)` — relocalise les `.mjs`
  `.claude/hooks/` → `.codex/hooks/` pour Codex.

### Écriture (`doInstall`, dans `cli`)

Branche selon `dirs.format` :
- **claude** : `settings.hooks = mergeHooks(settings.hooks ?? {}, incoming)`
  (préserve le reste du `settings.json`).
- **codex** : `settings = mergeHooks(settings, incoming)` — les événements sont
  fusionnés **à la racine** du `hooks.json` (pas de wrapper `hooks`).

Le `mergeHooks` existant (fusion par événement puis par matcher, sans écrasement,
immutable) est **réutilisé tel quel** pour les deux formats — la forme de la map
event→entries est identique, seul le niveau d'imbrication sur disque change.

Les scripts sont écrits via `resolveScriptPath` + `assertSafeTarget` (garde
anti-évasion de répertoire conservée).

## Pourquoi KISS

- Aucune dépendance ajoutée, aucune abstraction de « driver d'agent » : la
  divergence se réduit à 3 points (chemin du fichier, wrapper ou non, réécriture
  des chemins), tous traités par des fonctions pures de quelques lignes.
- Le code des hooks reste mono-source (`.claude/hooks/*.mjs`) ; la portabilité
  est une propriété de l'installateur, pas du catalogue.

## Tests

`tests/cli/core.test.mjs` étendu (+24 cas) : flags Codex, `resolveScopeRoot`
codex (format + chemins), `isGlobalScope`/`isCodexScope`, `resolveScriptPath`,
réécriture `collectIncomingHooks` pour `codex-project`/`codex-profile` (formes
`$CLAUDE_PROJECT_DIR` et `${CLAUDE_PROJECT_DIR}`).

Validation : **726/726 tests**, `pnpm typecheck` clean, `sync-hooks --check` et
`hooks-timeline --check` OK. Smoke test offline confirmant la shape produite
(événements racine + commande `.codex/hooks/` pour Codex ; wrapper `hooks` +
`$CLAUDE_PROJECT_DIR` pour Claude).

## Surfaces propagées

- **Site** (`src/app/page.tsx`, `src/lib/i18n.ts`) : strip « Works with »
  (Claude Code · OpenAI Codex · GitHub Copilot), JSON-LD `SoftwareApplication`
  enrichi, `SEO_KEYWORDS`/`metaDescription` étendus, FAQ corrigée + Q Codex
  (alimente `FAQPage`).
- **READMEs** (`README.md`, `packages/cli/README.md`) : pitch multi-agent,
  exemples de flags, tables agents/scopes.
- **Docs marketing** (`doc/hookstack/`) : positionnement « agnostique d'agent »,
  personas Codex/Copilot, valeur « un hook écrit une fois, déployé sur 3 agents ».
- **`CLAUDE.md`** : section « Scopes d'installation CLI » + note portabilité.

## Suite possible

Bump de version `hookstack-cli` + publication npm pour exposer les scopes Codex
aux utilisateurs.
