# Guide : Claude Code Hooks for Python (ruff, pytest, pyright)

**Issue** : [#149](https://github.com/steve-magne/hookstack/issues/149)  
**PR** : [#169](https://github.com/steve-magne/hookstack/pull/169)  
**Fichier modifié** : `src/lib/guides.ts`  
**Slug** : `claude-code-hooks-python`

---

## Contexte

Ce guide cible les devs Python qui cherchent à brancher ruff, pyright et pytest dans leurs sessions Claude Code. Le cluster existait dans le registre (`post-write-ruff-format`, `post-write-ruff-check`, `post-edit-pyright`, `stop-pytest`, `pre-bash-enforce-uv` — tous annotés `stack: python`) mais n'avait aucune page informationnelle long-form pour les rendre découvrables. Mots-clés cibles : `claude code python hooks`, `claude code ruff hook`, `claude code pytest`, `claude code uv hook`.

---

## Décisions techniques

### Emplacement : `src/lib/guides.ts`, entrée ajoutée en fin de tableau

Tous les guides vivent dans un seul tableau exporté `guides`. Routing `/guides/[slug]`, sitemap, `/llms.txt`, et cross-links hook→guide sont générés automatiquement — aucun fichier de route créé.

### Point pédagogique central : hooks `.mjs` même pour Python

Le guide insiste sur le fait qu'un hook Python reste un fichier Node.js `.mjs`. Raison : Node.js est le seul runtime garanti sur toutes les plateformes où Claude Code tourne. Un script Python comme hook casserait sur toute machine sans le bon interpréteur ou venv actif. Le hook Node.js fait office de thin shell qui délègue à l'outil Python via `execSync`.

### Invocation via `uv run` obligatoire

Toutes les invocations d'outils Python passent par `uv run <tool>` plutôt qu'un appel direct (`ruff`, `pyright`, `pytest`). Justification :
- `uv run` résout automatiquement le venv du projet sans `source .venv/bin/activate`
- Les hooks tournent comme subprocess sans shell interactif — un appel direct échoue si l'outil n'est pas dans le PATH système
- `uv run ruff` fonctionne même si ruff n'est déclaré que dans `pyproject.toml` (uv l'installe à la demande)

### Code des exemples tiré des `.mjs` réels

Les blocs de code du guide sont des versions légèrement simplifiées des hooks réels (`ruff-format.mjs`, `ruff-check.mjs`, `pyright-check.mjs`, `pytest.mjs`, `enforce-uv.mjs`) dans `.claude/hooks/`. La simplification principale : unification du pattern `run(input, deps)` pour le hook `stop-pytest` (le hook réel prend uniquement `deps` en premier arg, le guide montre `_input, deps` pour la cohérence pédagogique avec les autres exemples).

### Hooks PostToolUse : non-bloquants par convention

Les trois hooks de qualité (ruff format, ruff check, pyright) sont tous PostToolUse sur `Write|Edit`, filtrés sur `.endsWith('.py')`, avec un `try/catch` silencieux. Un outil absent ou uv manquant fait silencieusement `return null` — la session ne se bloque jamais.

### Hook Stop : détection de projet Python par markers

`stop-pytest` vérifie la présence d'un fichier parmi `['pyproject.toml', 'setup.py', 'pytest.ini', 'setup.cfg']` avant de lancer pytest. Return `null` si aucun marker → le hook est safe à installer globalement, il ne tourne que dans les projets Python.

### Hook PreToolUse : blocage dur de pip/poetry

`pre-bash-enforce-uv` est le seul hook bloquant de la stack. Il inspecte chaque commande Bash et retourne `{ decision: 'block', reason: '...' }` sur stdout quand il détecte `pip install`, `pip3 install`, `poetry add` ou `poetry install`. La raison inclut l'alternative exacte (`uv add` ou `uv sync`) pour que l'agent puisse corriger immédiatement.

### Lien entrant obligatoire

Ajout de `'claude-code-hooks-python'` au tableau `related` du guide `claude-code-hooks-examples` (ligne ~1001) pour créer un lien interne entrant — requis pour le ranking de la nouvelle page selon la spec SEO du projet.

### Validation des références

Script de validation exécuté avant commit :
```
node - <<'EOF'
const fs=require('fs');
const reg=JSON.parse(fs.readFileSync('registry/registry.json','utf8'));
const hookSlugs=new Set((reg.hooks||reg).map(h=>h.slug));
const src=fs.readFileSync('src/lib/guides.ts','utf8');
const g=new Set([...src.matchAll(/^\s{4}slug:\s*'([^']+)'/gm)].map(m=>m[1]));
let bad=0;
for(const m of src.matchAll(/relatedHookSlugs:\s*\[([^\]]*)\]/g))
  for(const s of [...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]))
    if(!hookSlugs.has(s)){console.log('BAD hook slug:',s);bad++}
for(const m of src.matchAll(/(?<!relatedHook)related:\s*\[([^\]]*)\]/g))
  for(const s of [...m[1].matchAll(/'([^']+)'/g)].map(x=>x[1]))
    if(!g.has(s)){console.log('BAD guide slug:',s);bad++}
console.log(bad?bad+' broken refs':'OK — all refs resolve');
EOF
```
Résultat : `OK — all refs resolve`.

---

## Contraintes de syntaxe respectées

- **Apostrophes** dans les strings de prose : `\'` (escape JavaScript standard)
- **Blocs de code** : template literals avec double-backslash (`\\s` → `\s`) et backtick échappé (`\`` → `` ` ``)
- **Template literals imbriqués** : `\${filePath}` évite l'interpolation dans le template literal externe
- **metaTitle** : 51 caractères (≤ 60)
- **description** : 150 caractères exactement (validé avec `python3 -c "len(s)"`)
- **Pas de `${` nu** dans les blocs de code

---

## Métriques du guide

| Champ | Valeur |
|---|---|
| `readingMinutes` | 8 |
| Sections | 7 |
| FAQ | 4 |
| Paragraphes intro | 2 |
| `relatedHookSlugs` | 5 hooks Python |
| `related` | 3 guides existants |

---

## Checks CI attendus

- `pnpm typecheck` : ✓ (0 erreur)
- `pnpm build` : ✓ (118/118 pages)
- Validation refs : ✓ (`OK — all refs resolve`)
