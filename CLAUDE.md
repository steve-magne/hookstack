# CLAUDE.md

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
│   │   ├── contribute/              # Route /contribute — soumission de dépôt GitHub
│   │   └── hook/[slug]/             # Route /hook/[slug] — détail d'un hook
│   ├── components/                  # Composants React (tous marqués 'use client')
│   │   ├── Header.tsx               # Barre de navigation principale
│   │   ├── HookRow.tsx              # Ligne de hook (liste groupée) — survol = détail, clic = modale
│   │   ├── HookModal.tsx            # Modale de détail complet d'un hook (cas d'usage, config, script)
│   │   ├── HookConfigurator.tsx     # Panneau sélection + génération settings.json
│   │   ├── CatalogueExplorer.tsx    # Catalogue : recherche + bascule de regroupement (event/catégorie) + liste groupée + modale
│   │   ├── Badge.tsx                # Badge générique (catégorie, provider…)
│   │   ├── ContributeForm.tsx       # Formulaire de soumission de dépôt
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
│   └── skills/analyze-repo/         # Skill CI : analyse un dépôt GitHub → PR registre
├── .github/
│   └── workflows/analyze-repo.yml   # Action déclenchée sur issue labelisée repo-submission
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

## Mission produit

**Promesse** : "Get your HookStack in 1 minute" — tagline officiel du site (`T.heroTitle1/heroHighlight/heroTitle2` dans `src/lib/i18n.ts`).

**URL de production** : `https://hookstack.vercel.app`

**Flow utilisateur** :

1. Browse le catalogue (filtres par catégorie, event, keyword)
2. Sélectionne des hooks (panier persisté en `localStorage`)
3. Copie la commande générée par `HookConfigurator` :

   ```bash
   npx hookstack-cli@latest install --hooks=<slug1>,<slug2>,...
   ```

4. La lance à la racine de son projet → le CLI écrit les `.mjs` dans `.claude/hooks/` et patche `.claude/settings.json`

**Le deliverable est la commande `npx hookstack-cli@latest`**, pas un copier-coller de JSON. `HookConfigurator.tsx` (l. 21) construit `pluginCmd` avec les slugs sélectionnés. Ne jamais décrire le flow comme "coller un settings.json" dans la doc ou le README.

## Architecture

Hookstack est un catalogue communautaire de hooks agentiques (Claude Code, GitHub Copilot). Next.js 15 (App Router) + TypeScript + Tailwind v4.

**Source de données** : `registry/registry.json` est la seule source de vérité — lue directement par `src/lib/hooks.ts` (via `allHooks`). Sans `.env`, tout fonctionne en mode registre local.

**Registre** : `registry/registry.json` est la source canonique et unique du registre versionné — c'est aussi ce que le front-end importe. Les scripts `.claude/skills/analyze-repo/scripts/merge-hooks.js` et `.claude/skills/analyze-repo/scripts/extract-json.js` servent au pipeline CI (`.github/workflows/analyze-repo.yml`). L'Action se déclenche sur les issues labellisées `repo-submission` et ouvre une PR `auto-generated` via Claude Code + `ANTHROPIC_API_KEY`.

**État global** : Zustand persisté dans `src/store/selection.ts` (clé `hookstack-selection`) — stocke les slugs des hooks sélectionnés.

**Génération de config** : `src/lib/mergeConfig.ts` fusionne les fragments `implementation.config.hooks` de plusieurs hooks en un `settings.json` valide, en regroupant par événement puis par matcher. `collectScripts` extrait les scripts associés.

**Type `Hook`** (`src/types/hook.ts`) : chaque hook a un `slug`, une `category`, un ou plusieurs `provider[]`, un `hook_type` (événement Claude Code), un `trigger` (matcher d'outil, ex. `"Bash"`, `"Write|Edit"`, `"*"`), une `implementation` de type `settings_json` avec un fragment `config` prêt à fusionner, et un champ optionnel `stack?: Stack[]` (`'typescript' | 'python' | 'node'`). Un hook **sans** `stack` est universel et toujours affiché ; un hook **avec** `stack` n'est affiché que si sa stack est dans la sélection de l'utilisateur.

**Champ `benefit`** : une ligne courte (≤ ~60 car.), orientée *résultat* (« pourquoi je l'installe »), pas *fonctionnalité* (qui, elle, est dans `description`). Voix dev, percutante. C'est le **héros** de la carte de survol (`CatalogueExplorer`) et de la modale (`HookModal`) — le levier d'incitation à l'installation. Tous les hooks du registre en ont un ; il est aussi indexé par la recherche.

**Langue** : tout est en anglais. Pas d'i18n, pas de routing `/[locale]`. Le registre est canoniquement en anglais — `name`, `description`, `use_cases` directement dans les champs racine, sans overlay `i18n`. Les textes UI sont dans `src/lib/i18n.ts` (constante `T` exportée, anglais uniquement). `useT()` (`src/lib/locale-context.tsx`) retourne simplement `T` — utilisable dans les composants client.

**Routes** : `/` (Home = hero + catalogue), `/hook/[slug]` (détail), `/contribute` (soumission de dépôt).

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

**Hooks actifs** : voir `.claude/settings.json` (généré par sync). 62 hooks du catalogue sont actifs sur ce projet, chacun avec un test dans `tests/hooks/`. Pour consulter la liste complète : `node .claude/sync-hooks.mjs --dry-run`.

**Garde-fous CI** ([.github/workflows/ci.yml](.github/workflows/ci.yml)) : sur chaque PR, `pnpm typecheck` + `pnpm test` + `node .claude/sync-hooks.mjs --check` (échoue si le registre a dérivé des `.mjs`). Côté session, deux hooks Stop calqués sur le même patron auto-désactivable surveillent les fichiers modifiés : `stop-per-file-coverage` (couverture ≥80 %) et `stop-per-file-lint` (ESLint).

## Variables d'environnement

Voir `.env.example` : `NEXT_PUBLIC_REGISTRY_REPO` (format `org/repo`) — repo GitHub où les issues de soumission sont créées. Optionnel pour le développement local.
