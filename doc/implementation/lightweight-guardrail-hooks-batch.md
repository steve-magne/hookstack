# Lot de 9 hooks « légers » — guardrails sans coût pour le vibe coding

## Objectif

Enrichir le catalogue de hooks à **forte valeur** mais **sans traitement lourd** :
aucun build, test, linter ou typecheck lancé. Chaque hook fait du pur string/regex,
une lecture de 1-2 fichiers, ou un check de chemin — coût de quelques ms, invisible
pour la boucle de vibe coding. Catalogue passé de 93 à **102 hooks**.

## Hooks ajoutés

| Slug | Catégorie | Événement | Mécanique |
|---|---|---|---|
| `pre-bash-block-curl-pipe-sh` | security | PreToolUse/Bash | regex sur la commande |
| `pre-bash-guard-force-push-any` | security | PreToolUse/Bash | regex sur la commande |
| `pre-bash-warn-sudo` | security | PreToolUse/Bash | regex (non bloquant) |
| `pre-write-env-gitignore-guard` | security | PreToolUse/Write\|Edit | lecture `.gitignore` (non bloquant) |
| `pre-edit-block-generated-paths` | validation | PreToolUse/Write\|Edit | check de chemin |
| `pre-edit-block-huge-write` | validation | PreToolUse/Write | `Buffer.byteLength` |
| `post-write-debug-statement-guard` | validation | PostToolUse/Write\|Edit | regex sur le fichier écrit (non bloquant) |
| `user-prompt-inject-deps-versions` | context | UserPromptSubmit | lecture `package.json`/`pyproject.toml` |
| `session-start-node-version-check` | workflow | SessionStart | lecture `.nvmrc`/`engines` |

## Choix techniques notables

### 1. `block-curl-pipe-sh` — pipe vs substitution traités séparément

Le piège : `stripQuotedArgs` neutralise le contenu entre guillemets pour éviter les
faux positifs (ex. `git commit -m "how to curl | sh"`). Mais une substitution de
commande `sh -c "$(curl …)"` est **réellement exécutée** par le shell même entre
guillemets doubles. Solution : deux familles de motifs.

- `PIPED` (`curl … | sh`, `iwr … | iex`) → testés sur la commande **nettoyée**.
- `SUBSTITUTION` (`bash <(curl …)`, `sh -c "$(curl …)"`) → testés sur la commande
  **brute**, car le stripping ferait disparaître le `$(curl)` qu'on veut attraper.

### 2. `guard-force-push-any` — complète, ne duplique pas

`block-destructive.mjs` ne bloque le force-push que sur `main`/`master`. Ce hook
couvre **toute branche** mais laisse passer `--force-with-lease` (le force-push sûr)
et oriente l'agent vers lui dans la `reason`. Distinct aussi de `guard-git-push-main`
et `block-push-closed-pr`.

### 3. `env-gitignore-guard` — advisory pour coexister avec `protect-paths`

`pre-edit-protect-paths` **bloque** déjà toute écriture de `.env`. Pour éviter un
hook mort/redondant, celui-ci est un **avertissement non bloquant** (`{ message }`
sur stderr, exit 0) : utile en standalone (projet sans protect-paths) et inoffensif
en cooccurrence. Remonte l'arbre pour trouver le `.gitignore` le plus proche, ignore
les modèles partagés (`.env.example`/`.sample`/`.template`).

### 4. `inject-deps-versions` — anti-hallucination borné en tokens

Injecte les versions installées réelles pour que l'agent cesse d'inventer des API
d'un mauvais major. Sortie **plafonnée à 60 entrées** (`MAX_ENTRIES`) avec suffixe
`(+N more)` pour rester token-light. Best-effort sur `pyproject.toml` (PEP 621 +
Poetry) en plus de `package.json`.

### 5. `block-huge-write` — Write seulement

Seul `Write` fournit le contenu complet ; `Edit` est un patch ciblé et est ignoré.
Seuil généreux (500 Ko) pour éviter les faux positifs sur de vrais gros fichiers
source, configurable via DI (`maxBytes`) pour la testabilité.

### 6. `block-generated-paths` — segments isolés

Match par **segment de chemin** (`/(^|\/)(node_modules|dist|…)(\/|$)/`) pour ne pas
bloquer un fichier source légitime comme `src/buildConfig.ts`.

## Conformité aux conventions

- Pattern obligatoire respecté : `export function run(input, deps = {…})` pur +
  garde d'entrée `/* v8 ignore */`, effets de bord injectés (DI).
- Un test `tests/hooks/<slug>.test.mjs` par hook (58 cas, incluant bords et faux
  positifs). Tous verts (`pnpm test` : 598/598).
- `node .claude/sync-hooks.mjs` dérive `code_snippet` (depuis le `.mjs`) **et**
  `test_snippet` (depuis le test) — jamais édités à la main.
- `benefit` court orienté résultat ; `description` factuelle ; `tags` orientés SEO /
  recherche agentique ; tous `default_on: true`.

## Surfaces marketing mises à jour (`src/lib/i18n.ts`)

- `heroRotating` : `'Run nothing blind.'` (supply-chain / curl|sh) et
  `'No version drift.'` (inject-deps-versions), chacun mappé à un cluster réel.
- `SEO_KEYWORDS` : +`supply chain security`, `secret leak prevention`,
  `force-push protection`, `dependency version pinning`.
- `metaTitle`/`metaDescription` : « 90+ » → « 100+ » (102 hooks, exact).

## Garde-fous validés

`typecheck` · `validate:registry` (102 conformes) · `test` 598/598 ·
`sync-hooks --check` · `hooks-timeline --check` · preview sans erreur (compteur 102).

## Suivi requis (post-commit)

Les `.mjs` doivent être **commités** pour obtenir une date `git add`, puis lancer
`pnpm timeline` et committer les 3 artefacts régénérés (sinon CI `--check` échoue).
