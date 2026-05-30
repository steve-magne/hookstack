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
| Supabase | latest | Auth GitHub + persistance des soumissions (optionnel) |
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
│   │   ├── HookCard.tsx             # Carte d'un hook dans le catalogue
│   │   ├── HookConfigurator.tsx     # Panneau sélection + génération settings.json
│   │   ├── CatalogueExplorer.tsx    # Grille de hooks filtrables
│   │   ├── FilterBar.tsx            # Filtres catégorie / provider / recherche
│   │   ├── Badge.tsx                # Badge générique (catégorie, provider…)
│   │   └── ContributeForm.tsx       # Formulaire de soumission de dépôt
│   ├── lib/
│   │   ├── hooks.ts                 # allHooks — charge registry.json, point d'accès aux données
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

## Architecture

Hookit est un catalogue communautaire de hooks agentiques (Claude Code, GitHub Copilot). Next.js 15 (App Router) + TypeScript + Tailwind v4.

**Source de données** : `registry/registry.json` est la seule source de vérité — lue directement par `src/lib/hooks.ts` (via `allHooks`). Supabase (via `src/lib/supabase.ts`) est optionnel — il n'active que l'auth GitHub et la persistance des soumissions. Sans `.env`, tout fonctionne en mode registre local.

**Registre** : `registry/registry.json` est la source canonique et unique du registre versionné — c'est aussi ce que le front-end importe. Les scripts `.claude/skills/analyze-repo/scripts/merge-hooks.js` et `.claude/skills/analyze-repo/scripts/extract-json.js` servent au pipeline CI (`.github/workflows/analyze-repo.yml`). L'Action se déclenche sur les issues labellisées `repo-submission` et ouvre une PR `auto-generated` via Claude Code + `ANTHROPIC_API_KEY`.

**État global** : Zustand persisté dans `src/store/selection.ts` (clé `hookit-selection`) — stocke les slugs des hooks sélectionnés.

**Génération de config** : `src/lib/mergeConfig.ts` fusionne les fragments `implementation.config.hooks` de plusieurs hooks en un `settings.json` valide, en regroupant par événement puis par matcher. `collectScripts` extrait les scripts associés.

**Type `Hook`** (`src/types/hook.ts`) : chaque hook a un `slug`, une `category`, un ou plusieurs `provider[]`, un `hook_type` (événement Claude Code), un `trigger` (matcher d'outil, ex. `"Bash"`, `"Write|Edit"`, `"*"`), et une `implementation` de type `settings_json` avec un fragment `config` prêt à fusionner.

**Routes** : `/` (Home = hero + catalogue), `/hook/[slug]` (détail), `/contribute` (soumission de dépôt).

**Composants** : tous marqués `'use client'` (Zustand + state). Les pages (`app/`) sont des Server Components sauf `hook/[slug]/page.tsx` (utilise `useParams` + Zustand).

## Ajouter un hook au registre

Ajouter une entrée dans `registry/registry.json` en respectant le type `Hook`. Le champ `implementation.config` doit être un fragment `{ hooks: { [EventName]: [...] } }` directement fusionnable dans `settings.json`.

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

**Hooks actifs** (`.claude/settings.json`) :

| Événement | Matcher | Script | Rôle |
|---|---|---|---|
| PreToolUse | `Bash` | `detect-secrets.mjs` | Bloque les commandes avec credentials |
| PreToolUse | `Bash` | `block-destructive.mjs` | Bloque rm -rf /, force-push main, DROP TABLE |
| PreToolUse | `Write\|Edit` | `protect-paths.mjs` | Bloque les écritures sur .env, clés privées |
| PostToolUse | `Write\|Edit` | `autoformat.mjs` | prettier --write si disponible |
| PostToolUse | `Write\|Edit` | `eslint-check.mjs` | eslint si disponible, avertissement stderr |
| PostToolUse | `Write\|Edit` | `typecheck.mjs` | tsc --noEmit sur .ts/.tsx, avertissement stderr |

## Variables d'environnement

Voir `.env.example` : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_REGISTRY_REPO` (format `org/repo`). Toutes optionnelles pour le développement local.
