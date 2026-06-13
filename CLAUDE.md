# CLAUDE.md

## Présentation du projet

**Hookstack** est un catalogue communautaire de hooks agentiques pour **Claude Code**. Un hook est un script Node.js `.mjs` branché sur le cycle de vie de l'agent (PreToolUse, PostToolUse, SessionStart, Stop…) via `.claude/settings.json` — pas un plugin, pas un SDK, juste un événement.

**Promesse** : *"Get your HookStack in 1 minute"* — un développeur arrive sur le site et peut immédiatement injecter une stack de hooks prédéfinis pour son type de projet via une seule commande `npx`. S'il le souhaite, il explore le catalogue, sélectionne des hooks plus spécifiques, copie la commande `npx` générée et les installe dans son projet.

```
Arrive  →  Stack prédéfinie (fast path)  →  npx hookstack-cli@latest install  →  Done
                    ↓ optionnel
          Browse catalogue + sélection fine  →  commande mise à jour  →  Done
```

### Dogfood

Le projet est son propre cobaye. Les hooks de la collection (`.claude/hooks/*.mjs`) sont actifs sur ce dépôt via `.claude/settings.json` — ils sont exécutés à chaque session Claude Code sur ce projet, ce qui les valide en conditions réelles. Quand un `.mjs` est modifié, le hook `registry-auto-sync.mjs` (FileChanged) relance automatiquement `node .claude/sync-hooks.mjs` pour propager le code dans `registry/registry.json` (`code_snippet`). **Le `.mjs` sur disque est la source de vérité du code** ; le registre en est le reflet.

### Points d'entrée utilisateurs — cohérence obligatoire

Les utilisateurs découvrent le projet par trois canaux. Le message, le flow et les exemples de commandes doivent rester **strictement cohérents** entre eux :

| Canal | Fichier / URL |
|---|---|
| Dépôt GitHub | [`README.md`](README.md) — tagline, exemples CLI, tableau des hooks phares |
| Site web | `https://www.hookstack.app` — catalogue filtrable + `HookConfigurator` |
| Package npm | [`packages/cli/README.md`](packages/cli/README.md) — référence CLI (`npx hookstack-cli@latest`) |

> Règle : toute évolution du flow utilisateur, des slugs d'exemple ou du wording CLI doit être répercutée dans les trois. Le README GitHub et le README npm sont les deux faces d'une même promesse — une divergence brouille le message.

### Composants du repo

| Dossier | Rôle |
|---|---|
| [`/src/`](src/) | Site web Next.js — catalogue, HookConfigurator, pages (`hookstack.app`) |
| [`/packages/cli/`](packages/cli/) | Package npm public `hookstack-cli` — CLI installé par les utilisateurs via `npx` |
| [`/registry/`](registry/) | `registry.json` — source de vérité des **métadonnées** du catalogue (`name`, `benefit`, `description`, `config`…) ; `code_snippet` dérivé automatiquement des `.mjs` |
| [`/doc/hookstack/`](doc/hookstack/) | Vision produit, marketing, brainstorm, positionnement (ne pas modifier sans raison) |
| [`/README.md`](README.md) | README vendeur GitHub — destiné aux early adopters et contributeurs |

### Règle d'or : propagation des changements

⚠️ Toute modification visuelle ou stratégique **doit être évaluée** sur les quatre surfaces :

1. **Site** [`/src/`](src/) — cohérence visuelle et UX
2. **CLI** [`/packages/cli/`](packages/cli/) — tonalité des messages, flags, exemples dans `README.md`
3. **Docs marketing** [`/doc/hookstack/`](doc/hookstack/) — vision alignée avec la réalité du produit
4. **README** [`/README.md`](README.md) — pitch actualisé, exemples CLI cohérents

---

## Directives comportementales

**KISS** : toujours choisir la solution la plus simple qui résout le problème. Pas d'abstraction prématurée, pas de généralisation anticipée.

**Auto-amélioration** : si Claude découvre en session une information critique (convention, règle métier, comportement attendu) utile dans >80% des sessions futures → l'ajouter immédiatement dans ce fichier, à la section pertinente.

**Bonification de skills** : lors de l'exécution d'un skill, si un comportement ad hoc pourrait être encapsulé dans un script déterministe (gain de fiabilité et d'économie de tokens) → créer le script dans `.claude/skills/<skill>/scripts/` et mettre à jour le workflow du skill pour l'utiliser.

---

## Toolstack

| Outil | Version | Rôle |
|---|---|---|
| Next.js | 15 (App Router) | Framework React — SSR, routing, Server Components |
| TypeScript | 5.x | Typage statique |
| Tailwind CSS | v4 | Styles utilitaires |
| Zustand | latest | État global client (sélection de hooks) |
| pnpm | 9.x | Gestionnaire de paquets |

## Structure de projet

```
hookstack/
├── src/
│   ├── app/                         # Pages Next.js App Router (Server Components)
│   │   ├── page.tsx                 # Route / — Home (hero + catalogue)
│   │   ├── layout.tsx               # Layout racine (HTML, polices, providers)
│   │   ├── globals.css              # Styles globaux Tailwind
│   │   └── hook/[slug]/             # Route /hook/[slug] — détail d'un hook
│   ├── components/                  # Composants React (tous marqués 'use client')
│   │   ├── Header.tsx               # Barre de navigation principale
│   │   ├── HookRow.tsx              # Ligne de hook (liste groupée) — survol = détail, clic = modale
│   │   ├── HookModal.tsx            # Modale de détail complet d'un hook (cas d'usage, config, script)
│   │   ├── HookConfigurator.tsx     # Panneau sélection + génération settings.json
│   │   ├── CatalogueExplorer.tsx    # Catalogue : recherche + bascule de regroupement (event/catégorie) + liste groupée + modale
│   │   ├── Badge.tsx                # Badge générique (catégorie, provider…)
│   │   ├── MotionProvider.tsx       # Racine motion : LazyMotion (domMax) + MotionConfig reducedMotion
│   │   ├── CopySwap.tsx             # Icône Copy↔Check animée — partagée par tous les boutons « Copier »
│   │   ├── AnimatedCheck.tsx        # Coche SVG qui se dessine (pathLength) — geste de sélection
│   │   └── SplitFlap.tsx            # Révélation « tableau Solari » (split-flap) des noms/en-têtes au chargement
│   ├── lib/
│   │   ├── hooks.ts                 # allHooks — charge registry.json, point d'accès aux données
│   │   ├── motion.ts                # Tokens de motion partagés (springs, easings, variants) — langage unique
│   │   ├── mergeConfig.ts           # Fusionne les hooks sélectionnés → settings.json valide
│   │   ├── supabase.ts              # Client Supabase (auth + soumissions, optionnel)
│   │   └── github.ts               # Appels GitHub API (stars, metadata dépôts)
│   ├── store/
│   │   └── selection.ts             # Zustand — slugs sélectionnés, persistés localStorage
│   └── types/
│       └── hook.ts                  # Type Hook et types dérivés
├── registry/
│   ├── registry.json                # Source de vérité unique du catalogue (tous les hooks)
│   └── scanned-repos.json           # Dépôts déjà analysés (évite les doublons CI)
├── .claude/
│   ├── settings.json                # Config hooks Claude Code actifs pour ce projet
│   ├── hooks/                       # Scripts hooks Node.js (.mjs) — sécurité, qualité
│   └── skills/analyze-repo/         # Skill : analyse un dépôt GitHub ou une doc → entrées registre
├── supabase/
│   └── schema.sql                   # Schéma BDD Supabase (table soumissions)
├── doc/hookstack/                      # Documentation produit (personas, valeur, hook 101…)
├── public/                          # Assets statiques (logo, favicon…)
├── next.config.ts                   # Config Next.js
├── postcss.config.mjs               # Config PostCSS / Tailwind v4
└── tsconfig.json                    # Config TypeScript
```

## Commandes

```bash
pnpm dev             # Serveur de développement Next.js (port 3000)
pnpm build           # Build de production Next.js
pnpm start           # Serveur de production
pnpm typecheck       # Vérification TypeScript sans émission
pnpm lint            # ESLint via next lint
```

## Mémoire produit & vision

Le dossier **`doc/hookstack/`** est la référence centrale pour la vision produit, les personas, l'UX, la stratégie marketing et les décisions architecturales. **Lire avant toute tâche qui touche à l'UX, au registre, au CLI ou au messaging.**

→ [`doc/hookstack/README.md`](doc/hookstack/README.md) pour l'index complet.

**Règle d'alimentation** : si tu découvres en session une information sur la vision, une décision produit, une contrainte métier ou un pattern marketing utile dans >80% des sessions futures → l'ajouter dans le fichier pertinent de `doc/hookstack/`. Seulement ce qui reste vrai sur la durée (pas de notes éphémères).

## Système de croissance (growth)

Objectif : `steve-magne/hookstack` → **5000 ⭐** + trafic sur `hookstack.app`. Le **système d'exécution** vit dans `~/workspace/hookstack-marketing/growth/` (repo privé — stratégie, playbook, brand-voice, drafts) et est piloté par 3 skills :

- **`/growth-coach`** — diagnostique la phase, recommande les 1–3 actions à plus fort levier, gère le board GitHub Issues (`growth-coach review` = bilan ; `growth-coach seed` = poser le board).
- **`/growth-post`** — produit un post prêt-à-coller (X / LinkedIn / Reddit-HN), draft-and-review (ne publie jamais).
- **`/growth-outreach`** — trouve des cibles (repos, threads, newsletters) et rédige l'outreach personnalisé.

Backlog = **GitHub Issues** (label `growth` + `content`/`outreach`/`spike`/`seo`/`idea`). Métriques : `node .claude/skills/growth-coach/scripts/metrics.mjs` (snapshot stars/downloads, auto chaque lundi via `.github/workflows/growth-metrics.yml`). **Boucle hebdo** : `/growth-coach` lundi, `/growth-post` en semaine, `/growth-coach review` vendredi. Règle KISS : le système n'auto-poste jamais (zéro API payante, zéro risque de ban).

## Architecture

Hookstack est un catalogue de hooks agentiques pour Claude Code. Next.js 15 (App Router) + TypeScript + Tailwind v4.

**Source de données** : `registry/registry.json` est la source de vérité des **métadonnées** du catalogue — lue directement par `src/lib/hooks.ts` (via `allHooks`). C'est ce que le front-end et le CLI consomment. Sans `.env`, tout fonctionne en mode registre local. Le champ `code_snippet` y est un miroir des `.mjs` (jamais édité à la main).

**Registre** : `registry/registry.json` est la source canonique des **métadonnées** du catalogue versionné. Le code exécutable, lui, vit dans `.claude/hooks/*.mjs` et est propagé vers `code_snippet` par le sync. Les scripts sous `.claude/skills/analyze-repo/scripts/` alimentent le skill `/analyze-repo` (fetch, validation, merge, apply).

**État global** : Zustand persisté dans `src/store/selection.ts` (clé `hookstack-selection`) — stocke les slugs des hooks sélectionnés.

**Génération de config** : `src/lib/mergeConfig.ts` fusionne les fragments `implementation.config.hooks` de plusieurs hooks en un `settings.json` valide, en regroupant par événement puis par matcher. `collectScripts` extrait les scripts associés.

**Type `Hook`** (`src/types/hook.ts`) : chaque hook a un `slug`, une `category`, un ou plusieurs `provider[]`, un `hook_type` (événement Claude Code), un `trigger` (matcher d'outil, ex. `"Bash"`, `"Write|Edit"`, `"*"`), une `implementation` de type `settings_json` avec un fragment `config` prêt à fusionner, et un champ optionnel `stack?: Stack[]` (`'typescript' | 'python' | 'node'`). Un hook **sans** `stack` est universel et toujours affiché ; un hook **avec** `stack` n'est affiché que si sa stack est dans la sélection de l'utilisateur.

**Champ `benefit`** : une ligne courte (≤ ~60 car.), orientée *résultat* (« pourquoi je l'installe »), pas *fonctionnalité* (qui, elle, est dans `description`). Voix dev, percutante. C'est le **héros** de la carte de survol (`CatalogueExplorer`) et de la modale (`HookModal`) — le levier d'incitation à l'installation. Tous les hooks du registre en ont un ; il est aussi indexé par la recherche.

**Langue** : tout est en anglais. Pas d'i18n, pas de routing `/[locale]`. Le registre est canoniquement en anglais — `name`, `description`, `use_cases` directement dans les champs racine, sans overlay `i18n`. Les textes UI sont dans `src/lib/i18n.ts` (constante `T` exportée, anglais uniquement). `useT()` (`src/lib/locale-context.tsx`) retourne simplement `T` — utilisable dans les composants client.

**Routes** : `/` (Home = hero + catalogue), `/hook/[slug]` (détail).

**Composants** : tous marqués `'use client'` (Zustand + state). Les pages (`app/`) sont des Server Components — elles importent `T` directement depuis `src/lib/i18n.ts`. Les composants client utilisent `useT()` depuis `src/lib/locale-context.tsx`.

## Motion / Animations

Le site utilise **Motion** (ex-Framer Motion, paquet `motion`, import `motion/react`). La direction artistique complète et l'inventaire des effets sont dans **`DESIGN.md`** — à lire avant toute évolution UI. Esprit : public dev front-end, le wow vient de la *retenue maîtrisée*, pas du volume d'effets.

**Règles non négociables** :

- **Langage unique** : tous les springs / easings / variants viennent de `src/lib/motion.ts`. Ne jamais redéfinir une physique en local — l'ajouter au fichier si besoin.
- **`m.*` uniquement, jamais `motion.*`** : `<MotionProvider>` (`src/app/layout.tsx`) utilise `LazyMotion features={domMax} strict` — `motion.*` lève une erreur runtime.
- **A11y automatique** : `MotionConfig reducedMotion="user"` gère `prefers-reduced-motion` globalement. **Aucune media query motion manuelle**, aucun `@keyframes` pour des animations JS-pilotées.
- **Transform/opacity seulement** (+ `layout` pour le FLIP). Jamais d'animation brute de `width`/`height`/`top`/`left`.
- **Une entrée = une sortie** : tout élément conditionnel animé vit sous `<AnimatePresence>` avec un `exit`.
- **Doser** : une animation doit servir la compréhension ou le feedback, sinon elle ne va pas dans le site.

## Sync catalogue → projet

**Principe (inversé)** : les scripts **`.claude/hooks/*.mjs` sont la source de vérité du code des hooks**. Ce sont des fichiers réels, dogfoodés sur ce projet et couverts par des tests unitaires (`tests/hooks/`). `registry/registry.json` reste la source du **catalogue** (métadonnées : `name`, `benefit`, `description`, `implementation.config`, `stack`…) mais son champ `code_snippet` est **dérivé automatiquement** du `.mjs` sur disque. `.claude/settings.json` reste un artefact reconstruit.

> Pourquoi : le CLAUDE livre `code_snippet` aux utilisateurs ([`packages/cli`](packages/cli), [`src/lib/hookExports.ts`](src/lib/hookExports.ts)). En faisant du `.mjs` la vérité, on livre exactement le code qu'on exécute et teste — fini les snippets périmés.

**Flux de travail** :

1. Modifier le hook **directement dans son `.mjs`** sous `.claude/hooks/` (le dogfooder)
2. Ajouter / mettre à jour son test dans `tests/hooks/<slug>.test.mjs`, lancer `pnpm test`
3. Propager vers le catalogue : `node .claude/sync-hooks.mjs` (recopie le `.mjs` dans `code_snippet`)
4. Le hook **`registry-changed-auto-sync`** lance déjà cette sync après chaque édition d'un `.mjs` ou du registre

**Ce que fait le sync** ([`.claude/sync-hooks.mjs`](.claude/sync-hooks.mjs)) :

- Pour chaque hook dont le `.mjs` existe → recopie son contenu dans `code_snippet` (le disque gagne)
- Hook sans fichier sur disque (ex. python/java exclus) → **préserve** le `code_snippet` ; peut le seeder en `.mjs` (bootstrap)
- Reconstruit `.claude/settings.json` depuis les `implementation.config` du catalogue (filtre les stacks `python`/`java` only)
- Préserve la section `permissions` de l'ancien `settings.json`
- `--dry-run` : aperçu sans écriture · `--check` : exit ≠ 0 si dérive registre/disque (garde-fou CI)

**Règle absolue** : ne jamais éditer `code_snippet` à la main dans `registry.json` — il sera écrasé par le sync. Toute évolution du code passe par le `.mjs` + son test, puis sync.

---

## Ajouter un hook

1. Écrire le script `.claude/hooks/<slug>.mjs` au pattern testable (voir « Conventions hooks »)
2. Écrire son test `tests/hooks/<slug>.test.mjs`, vérifier `pnpm test`
3. Ajouter l'entrée métadonnées dans `registry/registry.json` (type `Hook`) : `name`, `benefit`, `description`, `use_cases` (anglais, champs racine, pas d'overlay `i18n`), `implementation.config` (fragment `{ hooks: { [EventName]: [...] } }` fusionnable) et `implementation.script_path` pointant vers le `.mjs`. Laisser `code_snippet` vide ou approximatif : il sera rempli par le sync.
4. Lancer `node .claude/sync-hooks.mjs` — il recopie le `.mjs` dans `code_snippet`. Toujours fournir un `benefit` (ligne courte, orientée résultat).
5. **Si le hook requiert un outil externe** (ex. `jscpd`, `gh`, `uv`) → ajouter une entrée dans `PREREQ_HINTS` dans [`packages/cli/bin/core.mjs`](packages/cli/bin/core.mjs). Le CLI affichera automatiquement la commande d'installation après l'install du hook.

**Champ `stack`** : ne l'ajouter que si le hook est réellement spécifique à un écosystème technique. Vérifier le `code_snippet` — si le script filtre par extension (`.py`, `.tsx?`) ou appelle un outil non universel (`tsc`, `ruff`, `eslint`), annoter le `stack`. Ne jamais déduire le `stack` depuis les `tags` seuls : les tags ajoutés par l'agent d'analyse peuvent être inexacts. Lire le code.

## Conventions hooks Claude Code

**Emplacement** : tous les scripts vivent dans `.claude/hooks/` du projet. Référencés via `$CLAUDE_PROJECT_DIR/.claude/hooks/<script>.mjs` dans `.claude/settings.json`.

**Langage** : Node.js (`.mjs`) — OS-agnostique, disponible partout où `node` est dans le PATH. Pas de dépendances externes ; utiliser uniquement les builtins Node (`fs`, `child_process`, `path`).

**Pattern obligatoire — `run()` + garde + injection de dépendances** : tout hook expose une fonction pure `export function run(input, deps = {…})` qui contient la logique et **retourne** son résultat (`{ decision, reason }` | `{ exitCode, message }` | une chaîne de contexte | `null`), sans toucher à stdin/stdout/`process.exit`. Les effets de bord (`execSync`, `fs`, `fetch`, `process.platform`, horloge) passent par des dépendances injectées avec des valeurs par défaut réelles — c'est ce qui rend le hook testable. Une garde d'entrée fait le marshalling réel :

```js
export function run(input, { exec = defaultExec } = {}) { /* logique pure */ }

/* v8 ignore next 5 */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const result = run(input);
  if (result) process.stdout.write(JSON.stringify(result)); // ou stderr / exit selon le contrat
}
```

**Test obligatoire** : un `tests/hooks/<slug>.test.mjs` par hook, qui importe `run` et injecte des fakes (`vi.fn()`). Modèles : [enforce-package-managers.mjs](.claude/hooks/enforce-package-managers.mjs) (décision), [per-file-coverage.mjs](.claude/hooks/per-file-coverage.mjs) (effet de bord + DI).

**Règles d'écriture** :

- Un fichier = une responsabilité (pas de hooks fourre-tout)
- Logique dans `run()` ; la garde d'entrée ne fait que lire stdin, appeler `run`, marshaller (et `/* v8 ignore */`)
- Les PostToolUse sont **non bloquants** : les erreurs d'outils absents (`--no-install`) sont silencieuses
- Les PreToolUse bloquants doivent avoir une `reason` actionnable, pas juste "interdit"
- Timeout explicite sur tous les `execSync` (évite les hooks bloquants indéfiniment)
- Filtrer par extension avant de lancer un outil lourd (ex. `/.tsx?$/.test(filePath)`)

**Hooks Python** : les scripts restent en `.mjs` même pour les projets Python — Node.js est le seul runtime garanti (Claude Code en dépend). Un hook Python c'est un `.mjs` qui appelle des outils Python via `execSync`. Toujours préférer `uv run <tool>` à l'appel direct (`ruff`, `pytest`, `pyright`) : `uv run` résout le venv du projet automatiquement sans `source .venv/bin/activate`. Filtrer sur `.endsWith('.py')` avant tout appel lourd. Absences silencieuses (try/catch vide) pour les PostToolUse — l'outil peut simplement ne pas être installé.

**Hooks actifs** : voir `.claude/settings.json` (généré par sync). 72 hooks du catalogue sont actifs sur ce projet, chacun avec un test dans `tests/hooks/`. Pour consulter la liste complète : `node .claude/sync-hooks.mjs --dry-run`. Certains hooks du catalogue sont volontairement **exclus localement** (doublons fonctionnels — ex. `post-edit-typecheck`, couvert par `post-tool-batch-typecheck`) : la liste vit dans `EXCLUDED_SLUGS` de [`.claude/sync-hooks.mjs`](.claude/sync-hooks.mjs).

**Garde-fous CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) : sur chaque PR, `pnpm typecheck` + `pnpm test` + `pnpm validate:registry` (valide `registry.json` contre [`registry/registry.schema.json`](registry/registry.schema.json) — champ requis manquant, énumération invalide ou champ inconnu = échec) + `node .claude/sync-hooks.mjs --check` (échoue si le registre a dérivé des `.mjs`). Le schéma a `additionalProperties: false` au niveau du hook : tout champ non consommé par le code (ex. anciens `id`/`votes`) est rejeté — il doit rester aligné avec `src/types/hook.ts`. Côté session, `stop-per-file-coverage` (Stop, patron auto-désactivable) vérifie la couverture ≥80 % des fichiers modifiés ; le lint immédiat est assuré par `post-write-eslint` et le bilan par `stop-quality-check` (`stop-per-file-lint` est exclu localement, doublon). `stop-registry-drift-check` (Stop) rejoue `sync-hooks --check` en filet de sécurité avant la CI.

