# Implémentation — Timeline d'évolution des hooks (`/evolution`)

**Date** : 13 juin 2026
**Branche** : `claude/zen-chebyshev-f26969`
**Contexte** : valoriser « en public » la croissance du catalogue de hooks. Lister les scripts, dater leur création via git, persister la donnée, afficher un heatmap façon contribution GitHub dans le README **et** une page front-end dédiée. Contraintes : très belle UX, angle marketing/communautaire.

---

## Décision de mécanique : générateur déterministe, pas un git pre-commit

La demande initiale évoquait un **git pre-commit**. Je l'ai écarté au profit d'un **générateur + garde-fou `--check` en CI**, pour trois raisons :

1. **Fragilité du pre-commit** : réécrire des fichiers suivis (README, JSON, SVG) en plein milieu d'un commit impose un re-staging, peut créer des boucles, et surprend l'auteur du commit.
2. **Cohérence repo** : le projet a déjà ce pattern éprouvé avec [`sync-hooks.mjs`](../../.claude/sync-hooks.mjs) (`--check` en CI, `stop-registry-drift-check` en session). On réutilise le même modèle mental plutôt que d'en introduire un second.
3. **Déterminisme** : la donnée vient de l'historique git (immuable), donc régénérer produit toujours le même résultat → `--check` est stable entre local et CI.

**Source de vérité** : la date de **premier ajout** de chaque `.claude/hooks/*.mjs`, via `git log --diff-filter=A --follow --format=%aI` (dernière ligne = ajout initial). Aucune date saisie à la main. Un hook non encore committé n'a pas de date git → exclu jusqu'au commit (même UX que `sync-hooks`).

---

## Artefacts générés

[`.claude/hooks-timeline.mjs`](../../.claude/hooks-timeline.mjs) — `pnpm timeline` — produit **3 artefacts dérivés** (jamais édités à la main) :

| Artefact | Rôle | Consommé par |
|---|---|---|
| `registry/hooks-timeline.json` | Donnée structurée (total, byDay, hooks triés) | Front via `src/lib/timeline.ts` |
| `public/hooks-timeline.svg` | Heatmap « contribution GitHub » | README (`<img>`) |
| Bloc README `<!-- HOOKS_TIMELINE:START/END -->` | Section marketing | GitHub |

### Pourquoi un SVG committé pour le README

GitHub **nettoie le CSS inline et le styling des tableaux markdown** : impossible d'y rendre un heatmap coloré proprement (les carrés via emoji sont laids). Un **SVG généré et committé**, embarqué via `<img src="public/hooks-timeline.svg">`, rend exactement comme le graphe de contribution GitHub et reste robuste. C'est le « mécanisme plus simple et solide » demandé.

Le SVG utilise sa **largeur intrinsèque** (pas de `width=` forcé) pour rester net. Une largeur minimale (`MIN_WEEKS = 20`) est garantie en **étendant la plage vers le futur** (cellules vides à droite) → effet « room to grow » sur un projet jeune (~3 semaines réelles), tout en restant déterministe (ne dépend que de `firstDate`/`lastDate`).

---

## Architecture testable (pattern repo)

Le générateur suit le pattern **fonctions pures + injection de dépendances** : `gitCreationDate`, `collectHooks`, `buildTimeline`, `bucketLevel`, `buildWeeks`, `renderHeatmapSvg`, `renderReadmeBlock`, `injectReadme` sont exportées et pures ; les effets (git, fs) passent par `defaultDeps`. La garde d'entrée (`/* v8 ignore */`) ne fait que l'orchestration.

→ 14 tests unitaires dans [`tests/lib/hooks-timeline.test.mjs`](../../tests/lib/hooks-timeline.test.mjs) : dates git (ordre, fichier non committé, throw), enrichissement registre + tri, agrégation, buckets, découpe hebdo + padding, SVG (a11y/légende/tooltip), injection README (insertion + idempotence).

**Bug corrigé en route** : comptage de semaines avec `Math.round` (désaligné avec la boucle réelle de `buildWeeks`) → remplacé par `Math.floor`, qui correspond exactement au nombre d'itérations.

---

## Front-end

- **Page** [`src/app/evolution/page.tsx`](../../src/app/evolution/page.tsx) — Server Component : `metadata` OpenGraph/canonical + JSON-LD `BreadcrumbList` et **`Dataset`** (signale aux moteurs/IA une donnée structurée, renforce E-E-A-T, cohérent avec la stratégie SEO/GEO du repo).
- **Dashboard** [`src/components/EvolutionDashboard.tsx`](../../src/components/EvolutionDashboard.tsx) — client : hero, **courbe d'évolution « Evolution Hooks proposed »** (X = temps sur échelle de date réelle, Y = nombre cumulé de hooks ; axes + graduations + libellés, area + ligne révélée au `pathLength`), liste des derniers ajouts liés vers `/hook/[slug]`. Page volontairement épurée (pas de stat cards ni de heatmap) pour focaliser sur la courbe. Le **heatmap SVG reste l'artefact du README** — il a juste quitté la page front.
- **Données** [`src/lib/timeline.ts`](../../src/lib/timeline.ts) — `buildWeeks` est le **miroir exact** du générateur (même `MIN_WEEKS`, même ancrage dimanche, même padding) pour que site et README racontent la même histoire. Dérive aussi `cumulativeSeries`, `longestStreak`, `recentHooks`.
- **Menu** : lien « Evolution » dans [`Header.tsx`](../../src/components/Header.tsx) + clé `navEvolution` dans `i18n.ts`. Route ajoutée au `sitemap.ts`.

### Choix couleur : monochrome (et non indigo)

Première version en rampe indigo. Vérification navigateur → le site est **strictement monochrome** (`--color-brand: #fff`, palette zinc/blanc sur noir). L'indigo n'apparaît nulle part ailleurs et aurait violé le « langage visuel unique » de `DESIGN.md`. Basculé sur une **rampe de luminance monochrome** `['#1c1c20','#3f3f46','#71717a','#a1a1aa','#f4f4f5']` (vide → blanc = la vraie marque). La constante `LEVEL_COLORS` est **dupliquée volontairement** entre le `.mjs` et `timeline.ts` (le `.mjs` n'importe pas de TS) — à garder synchronisées.

---

## Intégration CI

Step `node .claude/hooks-timeline.mjs --check` ajouté à [`ci.yml`](../../.github/workflows/ci.yml), après le drift guard de `sync-hooks`. Échoue avec un message actionnable (`pnpm timeline`) si un des 3 artefacts a dérivé de l'historique git.

**Flux d'ajout d'un hook** (documenté dans `CLAUDE.md`) : committer le `.mjs` → `pnpm timeline` → committer les 3 artefacts. La CI valide.

---

## Validation

`typecheck` ✅ · `validate:registry` ✅ · `sync-hooks --check` ✅ · `timeline --check` ✅ · **676 tests** ✅ (dont 14 nouveaux). Rendu vérifié desktop + mobile (cards 2-col, heatmap scrollable, zéro erreur console). SVG bien formé (140 cellules + bg + 5 swatches).

## Hors scope (assumé, KISS)

- **npm README** ([`packages/cli/README.md`](../../packages/cli/README.md)) non modifié : c'est une référence CLI, la timeline n'altère pas le flow d'install. À reconsidérer si on veut y glisser un lien `/evolution`.
- **Auto-régénération en session** (type `registry-auto-sync`) écartée : la date de création ne change qu'au commit d'un *nouveau* fichier, pas à l'édition — régénérer à chaque edit serait du gaspillage. La CI `--check` est le bon filet.
