---
name: analyze-repo
description: Analyse un dépôt GitHub pour en extraire les hooks agentiques et alimenter le catalogue Hookit. Déclencher quand l'utilisateur fournit une URL GitHub à analyser, mentionne "ajouter un repo", "scanner un dépôt", "enrichir le registre" ou veut ajouter des hooks au catalogue. Utiliser même si l'utilisateur se contente de coller une URL GitHub sans explication supplémentaire.
---

Pipeline d'analyse pour `$ARGUMENTS` (URL GitHub). Exécuter depuis la racine du projet hookit.

## Phase 1+2 — Découverte et récupération (script, 0 token LLM)

```bash
DATA=$(bash .claude/skills/analyze-repo/scripts/fetch-hook-sources.sh "$ARGUMENTS" registry/registry.json)
echo "$DATA"
```

- Si `DATA` contient la clé `"error"` → afficher l'erreur et s'arrêter.
- Si `has_hooks` est `false` → écrire `[]` dans `/tmp/hookit-hooks-new.json` et passer directement à la Phase 3.5.

## Phase 3 — Extraction des hooks (seule phase LLM)

À partir du `DATA` ci-dessus, produire une entrée JSON pour chaque **concept fonctionnel réutilisable** trouvé dans les scripts des hooks déclarés dans `hooks` et `hooks_local`. Les contenus de `hook_scripts` alimentent `code_snippet`.

**Règle fondamentale** : ne créer une entrée que pour un comportement ancré dans un hook explicitement déclaré sous `hooks` (ou `hooks_local`). Ne jamais inventer un hook depuis un README, CLAUDE.md ou documentation.

**Granularité sub-script** : si un script implémente plusieurs concepts distincts et indépendants, créer **une entrée par concept**, pas une seule entrée par événement. Exemples de concepts distincts dans un même script :
- vérification lint ≠ vérification coverage globale ≠ coverage par fichier modifié
- détection de tests manquants ≠ exécution des tests
- Un concept est distinct s'il peut être extrait et réutilisé seul dans un autre projet sans nécessiter le reste du script.

**Analyse des scripts** : lire chaque contenu de `hook_scripts` en entier. Identifier toutes les phases/blocs logiques du script. Pour chaque bloc indépendant, évaluer s'il constitue un pattern réutilisable méritant sa propre entrée dans le catalogue.

**Déduplication** : si un slug figure dans `existing_slugs` → réutiliser ce slug ; le merge ajoutera l'exemple communautaire sans créer de doublon.

**Adaptation obligatoire au projet cible** : les scripts sources peuvent être en bash (`.sh`), Python, etc. Peu importe le langage source, produire **toujours** :
- `script_path` avec extension `.mjs`
- `code_snippet` en Node.js pur (builtins uniquement : `fs`, `child_process`, `path`, `os`) — jamais du bash copié verbatim
- La commande dans `implementation.config` doit référencer le script `.mjs` (ex. `node $CLAUDE_PROJECT_DIR/.claude/hooks/nom.mjs`)

Le concept est **extrait et réimplémenté**, pas copié. Traduire la logique (ex. vérification de pattern dans un fichier) en Node.js idiomatique, avec `readFileSync(0, 'utf8')` pour lire le contexte stdin, `process.exit(0)` implicite, et `{ decision: 'block', reason: '...' }` sur stdout pour bloquer.

Schema d'une entrée (toutes les clés sont requises) :

```json
{
  "id": "kebab-case-unique",
  "slug": "kebab-case-unique",
  "name": "Nom court en français",
  "category": "security|context|validation|notification|workflow|documentation",
  "provider": ["claude-code"],
  "hook_type": "PreToolUse|PostToolUse|UserPromptSubmit|Notification|Stop|SubagentStop|PreCompact|SessionStart|SessionEnd",
  "trigger": "Bash|Write|Edit|WebFetch|*",
  "description": "Ce que fait ce hook, en français.",
  "use_cases": ["cas 1", "cas 2"],
  "implementation": {
    "type": "settings_json",
    "config": {
      "hooks": {
        "<HookType>": [{ "matcher": "<trigger>", "hooks": [{ "type": "command", "command": "node $CLAUDE_PROJECT_DIR/.claude/hooks/nom.mjs" }] }]
      }
    },
    "script_path": ".claude/hooks/nom.mjs",
    "code_snippet": "implémentation Node.js du concept (jamais du bash)"
  },
  "community_examples": [
    { "repo": "$ARGUMENTS", "file_path": ".claude/settings.json", "added_by": "claude-code-analysis" }
  ],
  "tags": ["tag1", "tag2"],
  "votes": 0
}
```

Écrire le tableau JSON résultant dans `/tmp/hookit-hooks-new.json`.

## Phase 3.5 — Validation qualité (script, 0 token LLM)

```bash
node .claude/skills/analyze-repo/scripts/validate-hooks.js /tmp/hookit-hooks-new.json
HOOKS_VALID=$(cat /tmp/hookit-validation-count.txt)
```

Ce script filtre les anti-patterns agentiques (champs manquants, `PreToolUse/*` avec appels réseau,
commandes destructives sans garde-fou) et produit :
- `/tmp/hookit-hooks-validated.json` — hooks retenus pour le registre
- `/tmp/hookit-hooks-recommended.json` — sous-ensemble bénéfique pour le projet courant

## Phase 4+5 — Merge et enregistrement (scripts, 0 token LLM)

```bash
node .claude/skills/analyze-repo/scripts/merge-hooks.js /tmp/hookit-hooks-validated.json registry/registry.json "$ARGUMENTS"
HOOKS_FOUND=$(jq 'length' /tmp/hookit-hooks-new.json)
HOOKS_ADDED=$(cat /tmp/added-count.txt)
node .claude/skills/analyze-repo/scripts/update-scanned-repos.js registry/scanned-repos.json "$ARGUMENTS" "$HOOKS_FOUND" "$HOOKS_ADDED" success
```

## Phase 6 — Application au projet courant (script, 0 token LLM)

```bash
node .claude/skills/analyze-repo/scripts/apply-best-practices.js registry/registry.json .claude/settings.json /tmp/hookit-hooks-recommended.json
APPLIED=$(cat /tmp/applied-count.txt 2>/dev/null || echo 0)
APPLIED_FROM_SCAN=$(cat /tmp/applied-from-scan-count.txt 2>/dev/null || echo 0)
```

Applique en priorité les slugs de référence (`RECOMMENDED_SLUGS`), puis les hooks du repo
scanné marqués comme recommandés (catégorie `security`/`validation`, sans effet réseau en pre-hook).

## Résumé

Afficher uniquement ce bloc, sans autre texte :

```
Repo analysé     : <repo>
Hooks extraits   : <HOOKS_FOUND>
Hooks valides    : <HOOKS_VALID> (<HOOKS_FOUND - HOOKS_VALID> rejeté(s))
Hooks ajoutés    : <HOOKS_ADDED> (ou "0 — exemples communautaires enrichis")
Appliqués projet : <APPLIED> dont <APPLIED_FROM_SCAN> du repo scanné (ou "déjà à jour")

Fichiers modifiés :
  registry/registry.json
  src/data/hooks-seed.json
  registry/scanned-repos.json
  .claude/settings.json
```
