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
hookit/
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
├── doc/hookit/                      # Documentation produit (personas, valeur, hook 101…)
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

**Promesse** : "Get your agentic hooks in 2 minutes" — tagline officiel du site (`T.heroTitle1/heroHighlight/heroTitle2` dans `src/lib/i18n.ts`).

**URL de production** : `https://hookstack.vercel.app`

**Flow utilisateur** :
1. Browse le catalogue (filtres par catégorie, event, keyword)
2. Sélectionne des hooks (panier persisté en `localStorage`)
3. Copie la commande générée par `HookConfigurator` :
   ```bash
   npx hookstack@latest install --hooks=<slug1>,<slug2>,...
   ```
4. La lance à la racine de son projet → le CLI écrit les `.mjs` dans `.claude/hooks/` et patche `.claude/settings.json`

**Le deliverable est la commande `npx hookstack@latest`**, pas un copier-coller de JSON. `HookConfigurator.tsx` (l. 21) construit `pluginCmd` avec les slugs sélectionnés. Ne jamais décrire le flow comme "coller un settings.json" dans la doc ou le README.

## Architecture

Hookit est un catalogue communautaire de hooks agentiques (Claude Code, GitHub Copilot). Next.js 15 (App Router) + TypeScript + Tailwind v4.

**Source de données** : `registry/registry.json` est la seule source de vérité — lue directement par `src/lib/hooks.ts` (via `allHooks`). Sans `.env`, tout fonctionne en mode registre local.

**Registre** : `registry/registry.json` est la source canonique et unique du registre versionné — c'est aussi ce que le front-end importe. Les scripts `.claude/skills/analyze-repo/scripts/merge-hooks.js` et `.claude/skills/analyze-repo/scripts/extract-json.js` servent au pipeline CI (`.github/workflows/analyze-repo.yml`). L'Action se déclenche sur les issues labellisées `repo-submission` et ouvre une PR `auto-generated` via Claude Code + `ANTHROPIC_API_KEY`.

**État global** : Zustand persisté dans `src/store/selection.ts` (clé `hookit-selection`) — stocke les slugs des hooks sélectionnés.

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

**Principe** : `registry/registry.json` est la seule source de vérité pour les hooks. Les scripts `.claude/hooks/*.mjs` et `.claude/settings.json` sont des **artefacts générés** — ne jamais les modifier directement.

**Flux de travail** :
1. Modifier ou ajouter un hook dans `registry/registry.json` (champs `code_snippet`, `implementation.config`, `stack`…)
2. Relancer la sync : `node .claude/sync-hooks.mjs`
3. Vérifier avec `--dry-run` avant si besoin

**Ce que fait le sync** ([`.claude/sync-hooks.mjs`](.claude/sync-hooks.mjs)) :
- Filtre les hooks dont `stack` est exclusivement `python` ou `java`
- Crée les scripts `.mjs` manquants dans `.claude/hooks/` depuis `code_snippet` (ne réécrit jamais un script existant)
- Reconstruit `.claude/settings.json` depuis les `implementation.config` du catalogue
- Préserve la section `permissions` de l'ancien `settings.json`

**Règle absolue** : toute modification d'un hook (comportement, config, script) se fait dans `registry/registry.json`, puis `node .claude/sync-hooks.mjs`. Ne jamais patcher un `.mjs` directement — il sera écrasé au prochain sync.

---

## Ajouter un hook au registre

Ajouter une entrée dans `registry/registry.json` en respectant le type `Hook`. Les champs `name`, `benefit`, `description`, `use_cases` sont directement en anglais dans les champs racine — pas d'overlay `i18n`. Toujours fournir un `benefit` (voir section Architecture : ligne courte, orientée résultat). Le champ `implementation.config` doit être un fragment `{ hooks: { [EventName]: [...] } }` directement fusionnable dans `settings.json`.

**Champ `stack`** : ne l'ajouter que si le hook est réellement spécifique à un écosystème technique. Vérifier le `code_snippet` — si le script filtre par extension (`.py`, `.tsx?`) ou appelle un outil non universel (`tsc`, `ruff`, `eslint`), annoter le `stack`. Ne jamais déduire le `stack` depuis les `tags` seuls : les tags ajoutés par l'agent d'analyse peuvent être inexacts. Lire le code.

## Conventions hooks Claude Code

**Emplacement** : tous les scripts vivent dans `.claude/hooks/` du projet. Référencés via `$CLAUDE_PROJECT_DIR/.claude/hooks/<script>.mjs` dans `.claude/settings.json`.

**Langage** : Node.js (`.mjs`) — OS-agnostique, disponible partout où `node` est dans le PATH. Pas de dépendances externes ; utiliser uniquement les builtins Node (`fs`, `child_process`, `path`).

**I/O** : lire le contexte JSON depuis stdin avec `readFileSync(0, 'utf8')`, écrire les décisions de blocage sur stdout en JSON `{ decision: 'block', reason: '...' }`, les avertissements sur stderr.

**Règles d'écriture** :
- Un fichier = une responsabilité (pas de hooks fourre-tout)
- Toujours `process.exit(0)` implicite si pas de blocage — ne jamais laisser le process pendouiller
- Les PostToolUse sont **non bloquants** : les erreurs d'outils absents (`--no-install`) sont silencieuses
- Les PreToolUse bloquants doivent avoir une `reason` actionnable, pas juste "interdit"
- Timeout explicite sur tous les `execSync` (évite les hooks bloquants indéfiniment)
- Filtrer par extension avant de lancer un outil lourd (ex. `/.tsx?$/.test(filePath)`)

**Hooks Python** : les scripts restent en `.mjs` même pour les projets Python — Node.js est le seul runtime garanti (Claude Code en dépend). Un hook Python c'est un `.mjs` qui appelle des outils Python via `execSync`. Toujours préférer `uv run <tool>` à l'appel direct (`ruff`, `pytest`, `pyright`) : `uv run` résout le venv du projet automatiquement sans `source .venv/bin/activate`. Filtrer sur `.endsWith('.py')` avant tout appel lourd. Absences silencieuses (try/catch vide) pour les PostToolUse — l'outil peut simplement ne pas être installé.

**Hooks actifs** : voir `.claude/settings.json` (généré par sync). 60 hooks du catalogue sont actifs sur ce projet. Pour consulter la liste complète : `node .claude/sync-hooks.mjs --dry-run`.

## Variables d'environnement

Voir `.env.example` : `NEXT_PUBLIC_REGISTRY_REPO` (format `org/repo`) — repo GitHub où les issues de soumission sont créées. Optionnel pour le développement local.
