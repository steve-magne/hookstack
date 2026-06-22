# HooksFlow — explicateur animé « ce qu'apportent les hooks »

## Objectif

Donner à un visiteur, en un coup d'œil, une compréhension viscérale de ce que
sont les hooks et de la valeur qu'ils apportent sur un projet. Le brief : un
visuel **percutant, ludique et vendeur** sous forme de timeline / branching
model qui part de `main`, bloque le push direct, crée un embranchement vers un
worktree, puis enchaîne automatiquement install des deps → injection de la
config → implémentation → exécution forcée des tests.

## Le concept retenu

Un **git-graph horizontal animé** où une tête de lecture lumineuse parcourt le
parcours d'**une seule** feature livrée sous la garde des hooks. La métaphore
git est juste parce que les hooks *sont* des événements du cycle de vie de
l'agent (souvent calqués sur git).

Le graphe encode la promesse en une image unique :

- le **chemin direct sur `main`** est tracé en **pointillé** (interdit, vire à
  l'amber au moment du blocage) ;
- le **chemin solide** plonge dans le **worktree**, traverse les étapes
  automatisées, puis remonte merger sur `main` en **emerald**.

→ « Ce que tu ne peux pas faire directement » vs « ce que les hooks rendent
possible, en sûreté ».

Sous le graphe, un encart **spotlight** narre le temps courant : badge
d'événement (`PreToolUse`…), titre orienté résultat, sous-titre, **les vrais
slugs du catalogue** concernés, et un **mini-visuel de preuve** propre à chaque
temps.

## Les 8 temps et les hooks mis en scène

Mapping volontairement fidèle au registre (les slugs affichés existent) :

| # | Temps | Hooks réels |
|---|---|---|
| 0 | Feature arrive, l'agent démarre sur `main` | `session-start-load-git-context` |
| 1 | **Push sur main bloqué** (bouclier amber + commande barrée) | `pre-bash-guard-git-push-main`, `pre-write-main-guard` |
| 2 | Rerouté dans un worktree isolé | `session-start-worktree-if-main`, `pre-edit-worktree-guard` |
| 3 | `pnpm install` automatique (barre de progression) | `worktree-create-update-deps`, `setup-install-deps` |
| 4 | Conventions + contexte injectés (chips) | `user-prompt-inject-conventions`, `session-start-agents-md` |
| 5 | Chaque fichier formaté/lint/typé + **secret bloqué** | `post-write-autoformat`, `post-write-biome`, `post-edit-typecheck`, `pre-write-secret-detection` |
| 6 | Tests forcés au vert (6 points → 18 passed) | `stop-run-tests`, `stop-quality-check` |
| 7 | **Merge sûr sur `main`** (courbe emerald) | la stack complète |

## Choix techniques

### Fichiers

- `src/components/HooksFlow.tsx` — composant client autonome (animation + state).
- `src/app/page.tsx` — import + nouvelle `<section data-component="HooksFlowSection">`
  insérée après le hero, avant `StickyInstallBanner`.

### Pilotage de l'animation — machine à états

Plutôt qu'une séquence impérative (`useAnimate`), j'utilise un simple index
`step` (0…7) avancé par un `setTimeout` récursif piloté par un tableau `DWELL`
(durée d'affichage par temps). Chaque élément visuel réagit déclarativement à
`step` via `animate={...}`. Avantages : trivialement **replayable** (reset à 0),
**scrubbable** (les points de progression posent `step` directement),
et **reduced-motion-safe** (on saute à `step = LAST`, état final composé).

- Autoplay au scroll-into-view via `useInView(ref, { once: true, amount: 0.45 })`.
- `prefers-reduced-motion` → `step = LAST` immédiat, aucun timer, toute
  l'histoire visible sans rejeu.

### Conformité DESIGN.md / motion.ts

- **Tokens uniquement** (`spring.smooth/snappy`, `duration`, `EASE_OUT`) ; rien
  de redéfini en local.
- **`m.*` only** (LazyMotion `strict`) — aucun `motion.*`.
- **Transform / opacity** + `pathLength` pour le tracé des courbes git (même
  technique que `AnimatedCheck`). La tête de lecture se déplace via un
  `<m.g animate={{ x, y }}>` (transform pur), pas via `cx/cy`.
- **Palette** : monochrome blanc, avec **amber** (garde-fou) et **emerald**
  (succès) aux opacités basses (`/40`, `/45`) — précédent déjà établi dans le
  repo (`ring-emerald-500/30`, `border-amber-500/50`, etc.). Aucune teinte de
  marque introduite.

### SVG + overlay HTML

Le graphe (lignes, courbes, nœuds, tête) est en SVG (`viewBox 960×360`,
`aspect-ratio` pour la responsivité). Les libellés de nœuds et le spotlight sont
en HTML positionné en `%` calé sur le viewBox (`pct()`), pour un texte net et
stylé Tailwind, et des micro-visuels (barre de progression, checklist, points de
test) faciles à composer.

### Responsive

Le graphe est trop dense pour < `sm`. Sous ce point de rupture il devient un
**strip scrollable horizontalement** (`overflow-x-auto`, `min-w-[680px]`,
libellés `w-16`), tandis que le spotlight pleine largeur porte tout le récit
(c'est lui le héros sur mobile). Au-dessus de `sm` : `overflow-visible`,
`min-w-0`, libellés `w-24`.

## Données locales (pas dans i18n.ts)

Les tableaux `BEATS` / `MARKERS` / `NODES` sont du **contenu de données** couplé
à la mécanique d'animation (comme les timings locaux de `SplitFlap`), pas du
chrome UI générique. Précédent : `page.tsx` code déjà des titres de section en
dur. Garder ces données locales préserve l'autonomie du composant (KISS) sans
gonfler `i18n.ts`.

## Vérification

- `pnpm typecheck` ✅
- Rendu validé via le preview Next.js sur desktop **et** mobile, sur les temps
  clés (blocage push, qualité/secret bloqué, merge final) + le replay/scrub.
- `pnpm lint` non concluant pour une raison d'environnement (binaire `eslint`
  introuvable, lié au mismatch Node v26 vs v22 du poste), indépendant de ce
  changement.

## Aucune dépendance ajoutée

Uniquement `motion` et `lucide-react` (déjà présents). Pas de nouveau hook, pas
de modification du registre, pas de route.
