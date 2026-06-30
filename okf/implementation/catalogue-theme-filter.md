---
type: Playbook
title: Catalogue — filtre par thématiques
description: Barre de chips thématiques sur la home pour filtrer le catalogue par cas d'usage, projetées depuis le registre vers une allowlist curée orientée besoin.
tags: [implementation, catalogue, ux, front]
timestamp: 2026-06-30T00:00:00Z
---

# Catalogue — filtre par thématiques (chips)

## What

Une rangée de **chips thématiques** sur la page d'accueil (et pages catégorie),
entre la barre de recherche et la ligne de filtres existante. Chaque chip = une
**thématique orientée besoin** (`Secrets & data leaks`, `Monitoring & alerts`,
`Tests & coverage`, `Git & branching`…). Multi-sélection en **OU** : un hook
passe s'il porte au moins un des thèmes choisis.

## Why this shape

- **Pas un dropdown de plus.** Le catalogue a déjà `Category` et `Event` en
  dropdowns. Une thématique se *découvre* — on veut que l'utilisateur la voie
  sans l'ouvrir. Des chips visibles servent d'aperçu du catalogue et invitent
  au clic ; un dropdown caché n'aurait aucun signal.
- **Allowlist curée, pas tags bruts.** Le registre porte 234 tags techniques
  (kebab-case, longue traîne bruitée : `jscpd`, `definition-of-done`…). Un dev
  ne cherche pas un tag, il cherche un *résultat* (« éviter de leak des
  secrets », « monitoring »). On projette donc tags + slug + benefit vers une
  **allowlist de ~12 thèmes** aux labels lisibles et orientés besoin.
- **Mapping automatique, pas de champ registre à maintenir.** `matchThemes(h)`
  dérive les thèmes d'un hook par règles (substrings sur tags + slug + benefit,
  lowercased, mémoïsé via `WeakMap`). Aucun champ `theme` à saisir par hook ;
  la barre suit le catalogue sans toucher au registre.
- **Sémantique OU.** Un hook porte plusieurs thèmes ; filtrer par thème élargit
  le filet (union), contrairement à Category/Event qui sont par nature exclusifs.

## Where

- `src/lib/themes.ts` — `THEMES` (allowlist curée), `matchThemes(hook)` (mapping
  par règles + cache `WeakMap`), `themeLabel(id)`.
- `src/lib/hooks.ts` — `HookFilters.themes: string[]` + branche OU dans
  `filterHooks` (via `matchThemes`).
- `src/components/CatalogueExplorer.tsx` — `themeOptions` (useMemo : compte
  `matchThemes` sur `allHooks`, label propre, tri par count desc), état
  `selectedThemes`, `toggleTheme`, bloc chips.
- `src/lib/analytics.ts` — event `filter_theme`.

## Trade-off

Le mapping par substrings est heuristique : un hook peut être mal classé si ses
tags/slug/benefit ne contiennent aucun matcher attendu (~8 hooks orphelins,
restent trouvables via Category + recherche texte). Affiner un thème = ajuster
ses `matchers` dans `themes.ts`, pas retoucher 105 entrées de registre. Si la
dérive devient gênante, prochaine étape : un champ `themes` explicite dans le
registre (curated par hook) pour les cas limites, en complément du mapping.
