---
name: analyze-repo
description: Analyse une source externe pour en extraire des hooks agentiques et alimenter le catalogue Hookstack. Déclencher quand l'utilisateur fournit une URL GitHub à analyser, une URL d'article de blog, une URL de documentation (ex. docs Claude Code, guides hooks), mentionne "ajouter un repo", "scanner un dépôt", "enrichir le registre", "analyser cette doc", ou veut ajouter des hooks au catalogue. Utiliser même si l'utilisateur se contente de coller une URL sans explication supplémentaire.
---

Pipeline d'analyse pour `$ARGUMENTS`. Exécuter depuis la racine du projet hookstack.

## Phase 0 — Détection du type de source

```bash
if echo "$ARGUMENTS" | grep -qE 'github\.com/[^/]+/[^/]+'; then
  SOURCE_TYPE="github"
else
  SOURCE_TYPE="documentation"
fi
echo "Source détectée : $SOURCE_TYPE"
```

Brancher sur la phase correspondante selon `SOURCE_TYPE`.

---

## Phase 1+2 — [GitHub] Découverte et récupération (script, 0 token LLM)

> Exécuter uniquement si `SOURCE_TYPE="github"`.

```bash
DATA=$(bash .claude/skills/analyze-repo/scripts/fetch-hook-sources.sh "$ARGUMENTS" registry/registry.json)
echo "$DATA"
```

- Si `DATA` contient la clé `"error"` → afficher l'erreur et s'arrêter.
- Si `has_hooks` est `false` → écrire `[]` dans `/tmp/hookstack-hooks-new.json` et passer directement à la Phase 3.5.

---

## Phase 1b — [Documentation] Récupération de la page (script, 0 token LLM)

> Exécuter uniquement si `SOURCE_TYPE="documentation"`.

```bash
DATA=$(node .claude/skills/analyze-repo/scripts/fetch-doc-sources.mjs "$ARGUMENTS" registry/registry.json)
echo "$DATA"
```

- Si `DATA` contient la clé `"error"` → afficher l'erreur et s'arrêter.
- `DATA` contient : `{ source_type, url, title, content, existing_slugs }`.
- `content` est le texte extrait de la page (HTML strippé, sections hook-pertinentes prioritaires).

---

## Phase 3 — Extraction des hooks (seule phase LLM)

À partir du `DATA` ci-dessus, produire des entrées JSON selon le mode actif.

---

### Mode GitHub

Produire une entrée JSON pour chaque **concept fonctionnel réutilisable** trouvé dans les scripts des hooks déclarés dans `hooks` et `hooks_local`. Les contenus de `hook_scripts` alimentent `code_snippet`.

**Règle fondamentale** : ne créer une entrée que pour un comportement ancré dans un hook explicitement déclaré sous `hooks` (ou `hooks_local`). Ne jamais inventer un hook depuis un README, CLAUDE.md ou documentation.

**Granularité sub-script** : si un script implémente plusieurs concepts distincts et indépendants, créer **une entrée par concept**, pas une seule entrée par événement. Un concept est distinct s'il peut être extrait et réutilisé seul dans un autre projet.

**Analyse des scripts** : lire chaque contenu de `hook_scripts` en entier. Identifier toutes les phases/blocs logiques. Pour chaque bloc indépendant, évaluer s'il constitue un pattern réutilisable.

**Déduplication** : si un slug figure dans `existing_slugs` → réutiliser ce slug ; le merge ajoutera l'exemple communautaire sans créer de doublon.

---

### Mode Documentation

Produire une entrée JSON pour chaque **principe d'automatisation concret** identifiable dans `content`.

**Règle fondamentale** : ne créer une entrée que si le texte décrit explicitement un comportement automatisable via un hook Claude Code (événement + déclencheur identifiables). Ne pas inventer de hooks depuis des généralités.

**Critères d'extraction** :
- Le texte mentionne un cas d'usage précis ("bloquer X", "notifier quand Y", "vérifier avant Z") → candidat valide
- Le cas d'usage est réalisable par un des événements Claude Code (`PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Notification`, `Stop`, etc.)
- Granularité : un principe par entrée (ex. "bloquer les secrets" ≠ "bloquer les destructives" ≠ "formater après écriture")

**Synthèse** : contrairement au mode GitHub (extraction depuis du code existant), ici le hook est **synthétisé depuis une description**. L'implémentation doit être fonctionnelle et réaliste, pas un squelette vide.

**Déduplication** : si un slug figure dans `existing_slugs` → ignorer (le principe est déjà couvert).

**`community_examples`** : utiliser `article_url` à la place de `file_path` pour tracer l'origine documentaire :
```json
{ "repo": "$ARGUMENTS", "article_url": "$ARGUMENTS", "source_type": "documentation", "added_by": "documentation-analysis" }
```

---

### Règles communes aux deux modes

**Adaptation obligatoire** : produire **toujours** :
- `script_path` avec extension `.mjs`
- `code_snippet` en Node.js pur (builtins uniquement : `fs`, `child_process`, `path`, `os`) — jamais du bash copié verbatim
- La commande dans `implementation.config` doit référencer le script `.mjs` (ex. `node $CLAUDE_PROJECT_DIR/.claude/hooks/nom.mjs`)

Le concept est **réimplémenté en Node.js idiomatique** : `readFileSync(0, 'utf8')` pour lire stdin, `process.exit(0)` implicite si pas de blocage, `{ decision: 'block', reason: '...' }` sur stdout pour bloquer.

**Contenu bilingue obligatoire** : le catalogue est multilingue. Le **français est canonique** (champs racine `name`, `description`, `use_cases`). Produire **toujours** un overlay `i18n.en` traduisant ces trois champs en anglais. Seuls ces champs en langage naturel sont traduits — jamais `slug`, `tags`, `trigger`, `code_snippet`, ni la config. Le tableau `i18n.en.use_cases` doit avoir le même nombre d'éléments que `use_cases`.

**Champ `is_must` (optionnel)** : marquer `"is_must": true` si le hook est un incontournable — c'est-à-dire qu'il répond à **tous** ces critères :
- catégorie `security` ou `validation` avec blocage `PreToolUse`
- protège contre un risque réel (fuite de secrets, destruction de données, corruption de fichiers sensibles)
- applicable universellement (indépendant du projet, du langage, de la stack)
- coût d'activation nul (pas de dépendance externe, pas de configuration requise)

Un hook `is_must: true` sera pré-sélectionné par défaut dans le catalogue pour tous les visiteurs. Ne pas abuser : 3-5 hooks maximum dans l'ensemble du registre.

**Champ `benefit` (requis)** : une phrase courte (≤ ~60 caractères), orientée *résultat* et non *fonctionnalité — le « pourquoi je l'installe », pas le « ce qu'il fait ». Voix dev, percutante, droit au but. Ex. : `"No accidental push straight to main"`, `"Type errors caught the moment a file is saved"`. C'est le texte mis en avant dans le catalogue au survol. À distinguer de `description` (qui, elle, explique le mécanisme).

**Schema d'une entrée** (toutes les clés requises) :

```json
{
  "id": "kebab-case-unique",
  "slug": "kebab-case-unique",
  "name": "Nom court en français",
  "benefit": "Outcome-framed one-liner, ≤ ~60 chars",
  "category": "security|context|validation|notification|workflow|documentation",
  "provider": ["claude-code"],
  "hook_type": "PreToolUse|PostToolUse|UserPromptSubmit|Notification|Stop|SubagentStop|PreCompact|SessionStart|SessionEnd",
  "trigger": "Bash|Write|Edit|WebFetch|*",
  "description": "Ce que fait ce hook, en français.",
  "use_cases": ["cas 1", "cas 2"],
  "i18n": {
    "en": {
      "name": "Short English name",
      "description": "What this hook does, in English.",
      "use_cases": ["case 1", "case 2"]
    }
  },
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
  "votes": 0,
  "is_must": true
}
```

Écrire le tableau JSON résultant dans `/tmp/hookstack-hooks-new.json`.

---

## Phase 3.5 — Validation qualité (script, 0 token LLM)

```bash
node .claude/skills/analyze-repo/scripts/validate-hooks.js /tmp/hookstack-hooks-new.json
HOOKS_VALID=$(cat /tmp/hookstack-validation-count.txt)
```

Ce script filtre les anti-patterns agentiques (champs manquants, `PreToolUse/*` avec appels réseau,
commandes destructives sans garde-fou) et produit :
- `/tmp/hookstack-hooks-validated.json` — hooks retenus pour le registre
- `/tmp/hookstack-hooks-recommended.json` — sous-ensemble bénéfique pour le projet courant

## Phase 4+5 — Merge et enregistrement (scripts, 0 token LLM)

```bash
node .claude/skills/analyze-repo/scripts/merge-hooks.js /tmp/hookstack-hooks-validated.json registry/registry.json "$ARGUMENTS"
HOOKS_FOUND=$(jq 'length' /tmp/hookstack-hooks-new.json)
HOOKS_ADDED=$(cat /tmp/added-count.txt)
node .claude/skills/analyze-repo/scripts/update-scanned-repos.js registry/scanned-repos.json "$ARGUMENTS" "$HOOKS_FOUND" "$HOOKS_ADDED" success
```

## Phase 6 — Application au projet courant (script, 0 token LLM)

```bash
node .claude/skills/analyze-repo/scripts/apply-best-practices.js registry/registry.json .claude/settings.json /tmp/hookstack-hooks-recommended.json
APPLIED=$(cat /tmp/applied-count.txt 2>/dev/null || echo 0)
APPLIED_FROM_SCAN=$(cat /tmp/applied-from-scan-count.txt 2>/dev/null || echo 0)
```

Applique en priorité les slugs de référence (`RECOMMENDED_SLUGS`), puis les hooks de la source
scannée marqués comme recommandés (catégorie `security`/`validation`, sans effet réseau en pre-hook).

## Résumé

Afficher uniquement ce bloc, sans autre texte :

```
Source analysée  : <url> [github|documentation]
Hooks extraits   : <HOOKS_FOUND>
Hooks valides    : <HOOKS_VALID> (<HOOKS_FOUND - HOOKS_VALID> rejeté(s))
Hooks ajoutés    : <HOOKS_ADDED> (ou "0 — exemples communautaires enrichis")
Appliqués projet : <APPLIED> dont <APPLIED_FROM_SCAN> de la source scannée (ou "déjà à jour")

Fichiers modifiés :
  registry/registry.json
  registry/scanned-repos.json
  .claude/settings.json
```
