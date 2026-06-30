---
type: Reference
title: Hook 101 — anatomie d'un hook agentique
description: Définition technique d'un hook agentique, taxonomie des six catégories du catalogue, et structure canonique d'une entrée du registre — avec le `.mjs` comme source de vérité du code.
tags: [hook, cycle-de-vie, taxonomie, registre, mjs, code-snippet]
timestamp: 2026-06-30T00:00:00Z
---

# Hook 101 — anatomie d'un hook agentique

## Qu'est-ce qu'un hook ?

Un **hook agentique** est un script branché sur un événement du cycle de vie d'un agent IA (Claude Code, OpenAI Codex, GitHub Copilot). Ce n'est ni un plugin, ni un SDK, ni une surcouche runtime — c'est **un simple événement** déclenché par l'agent à des moments prédéfinis, auquel un script Node.js répond.

Le runtime garanti est **Node.js** (dépendance de Claude Code). Les hooks s'appuient exclusivement sur les builtins Node (`fs`, `child_process`, `path`), jamais sur des dépendances externes. C'est ce qui garantit la portabilité multi-agent : le même `.mjs` s'exécute partout où `node` est dans le PATH.

## Le cycle de vie et ses événements

Les trois agents ciblés partagent les **mêmes noms d'événements** — c'est la propriété qui rend les hooks portables sans modification de code :

| Événement | Moment | Sémantique |
|---|---|---|
| `PreToolUse` | Avant l'exécution d'un outil par l'agent | Peut **bloquer** l'outil (décision), valider, rediriger |
| `PostToolUse` | Après l'exécution d'un outil | Non bloquant — validation, lint, Bilan qualité |
| `UserPromptSubmit` | À la soumission d'un prompt utilisateur | Injection de contexte projet (conventions, stack tech) |
| `SessionStart` | Au démarrage d'une session | Initialisation, chargement de contexte, alerte |
| `SessionStop` / `Stop` | En fin de session | Notification, génération de résumé, changelog auto |

Le **matcher** (ex. `"Bash"`, `"Write|Edit"`, `"*"`) précise sur quels outils l'événement se déclenche. Un `PreToolUse` avec matcher `Bash` intercepte toute commande shell avant exécution.

## La taxonomie des six catégories

Le catalogue Hookstack classe tout hook dans l'une de six catégories. Cette taxonomie est l'ossature des filtres du `CatalogueExplorer` et de la table de sécurité du CLI.

| Catégorie | Événement typique | Exemples | Cas d'usage |
|---|---|---|---|
| **security** | `PreToolUse: Bash` | Détection de secrets, blocage de commandes destructives | Bloquer les fuites de credentials, valider les sorties |
| **context** | `UserPromptSubmit` | Injection du contexte repo (conventions, stack) | Donner à l'agent la mémoire du projet |
| **validation** | `PostToolUse: Write` | Lint automatique après écriture | Déclencher `biome`, `tsc`, couverture par fichier |
| **notification** | `SessionStart`, `SessionStop` | Alertes Slack, logs de session | Suivre l'activité agent en temps réel |
| **workflow** | `PreToolUse: WebFetch` | Proxy de requêtes réseau | Contrôler les accès réseau de l'agent |
| **documentation** | `Stop` | Génération de changelog, résumé de session | Produire de la doc automatiquement |

## Structure canonique d'une entrée du registre

Tout hook vit comme une entrée de `registry/registry.json`. Voici les champs clés et leur rôle :

```json
{
  "slug": "pre-bash-secret-detection",
  "name": "Secret Detection Before Bash",
  "benefit": "Never leak credentials in a shell command",
  "category": "security",
  "provider": ["claude-code", "copilot-vscode"],
  "hook_type": "PreToolUse",
  "trigger": "Bash",
  "description": "Intercepts shell commands and scans the prompt for API keys, tokens or passwords before execution.",
  "use_cases": ["Secure CI/CD", "Credential protection", "DevSecOps audit"],
  "implementation": {
    "type": "settings_json",
    "script_path": "$CLAUDE_PROJECT_DIR/.claude/hooks/pre-bash-secret-detection.mjs",
    "config": {
      "hooks": {
        "PreToolUse": [
          {
            "matcher": "Bash",
            "hooks": [
              { "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/pre-bash-secret-detection.mjs" }
            ]
          }
        ]
      }
    },
    "code_snippet": "/* auto-généré par sync-hooks.mjs — ne pas éditer ici */"
  },
  "stack": ["typescript"]
}
```

### Décryptage des champs

- **`slug`** — identifiant canonique, utilisé partout (URL `/hook/[slug]`, flag CLI `--hooks=<slug>`, fingerprint `// @hookstack <slug>` en ligne 2 du `.mjs`).
- **`benefit`** — une ligne courte (≤ 60 caractères), orientée *résultat* (« pourquoi je l'installe »), pas *fonctionnalité*. C'est le **héros** de la carte de survol et de la modale. **Obligatoire** pour tous les hooks.
- **`category`** — l'une des six valeurs de la taxonomie ci-dessus. Indexée par la recherche.
- **`hook_type`** — l'événement du cycle de vie (`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`…).
- **`trigger`** — le matcher d'outil (`"Bash"`, `"Write|Edit"`, `"*"`).
- **`implementation.config`** — un fragment `{ hooks: { [EventName]: [...] } }` **fusionnable**. C'est ce que `mergeConfig.ts` agrège côté site et ce que le CLI patche côté cible.
- **`implementation.script_path`** — chemin vers le `.mjs` source de vérité.
- **`stack`** *(optionnel)* — `'typescript' | 'python' | 'node'`. Un hook **sans `stack`** est universel et toujours affiché ; un hook **avec `stack`** ne s'affiche que si l'utilisateur a sélectionné cette stack dans le catalogue (mécanisme opt-out du filtre « Your stack »).

## L'invariant source de vérité

> Le script `.claude/hooks/<slug>.mjs` sur disque est la **source de vérité du code**. Le champ `code_snippet` du registre n'en est que le **reflet dérivé** — il ne s'édite jamais à la main.

Cette inversion a une raison précise : le CLI et le site livrent `code_snippet` aux utilisateurs finaux. En faisant du `.mjs` la vérité — `.mjs` qui est dogfoodé en conditions réelles et couvert par un test unitaire `tests/hooks/<slug>.test.mjs` — on garantit que le code livré est exactement le code exécuté et testé. fini les snippets périmés.

Le mécanisme : `node .claude/sync-hooks.mjs` recopie le contenu du `.mjs` dans `code_snippet` et reconstruit `.claude/settings.json` depuis les `implementation.config`. Un hook `registry-changed-auto-sync` relance ce sync après chaque édition d'un `.mjs` ou du registre. En CI, `sync-hooks --check` échoue si le registre a dérivé du disque.

## Le pattern `run()` + garde (testabilité)

Tout hook Hookstack obéit à un pattern qui rend sa logique pure et testable :

- Une fonction `export function run(input, deps = { ... })` contient **toute** la logique et **retourne** son résultat (`{ decision, reason }`, `{ exitCode, message }`, une chaîne de contexte, ou `null`). Elle ne touche ni à stdin, ni à stdout, ni à `process.exit`.
- Les effets de bord (`execSync`, `fs`, `fetch`, `process.platform`, horloge) passent par des dépendances injectées avec des valeurs par défaut réelles.
- Une **garde d'entrée** fait le marshalling réel (lecture stdin, appel `run`, écriture stdout/exit), couverte par `/* v8 ignore */` pour ne pas polluer la couverture.

C'est ce pattern qui autorise 62+ hooks dogfoodés sans dette de confiance : chaque hook a son test qui injecte des fakes (`vi.fn()`).

## Concepts voisins

- [/product/ux-cli-delivery.md](/product/ux-cli-delivery.md) — comment un hook du registre devient une installation concrète via `npx`.
- [/product/features-catalog.md](/product/features-catalog.md) — l'inventaire du surface produit autour de ce modèle.
- [/architecture/overview.md](/architecture/overview.md) — l'architecture du registre et du sync.
- [/architecture/multi-agent-portability.md](/architecture/multi-agent-portability.md) — pourquoi le même `.mjs` se déploie sur trois agents.
