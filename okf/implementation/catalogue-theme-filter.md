---
type: Playbook
title: Catalogue — filtre par thématiques
description: Barre de chips thématiques sur la home pour filtrer le catalogue par cas d'usage (tags transverses), dérivée dynamiquement du registre.
tags: [implementation, catalogue, ux, front]
timestamp: 2026-06-30T00:00:00Z
---

# Catalogue — filtre par thématiques (chips)

## What

Une rangée de **chips thématiques** sur la page d'accueil (et pages catégorie),
entre la barre de recherche et la ligne de filtres existante. Chaque chip = un
tag transverse du registre (`quality`, `git`, `secrets`, `ci`, `productivity`…).
Multi-sélection en **OU** : un hook passe s'il porte au moins un des tags
choisis.

## Why this shape

- **Pas un dropdown de plus.** Le catalogue a déjà `Category` et `Event` en
  dropdowns. Une thématique se *découvre* — on veut que l'utilisateur la voie
  sans l'ouvrir. Des chips visibles servent d'aperçu du catalogue et invitent
  au clic ; un dropdown caché n'aurait aucun signal.
- **Dérivé dynamiquement, pas curaté à la main.** Les tags viennent du
  registre (`allHooks`), comptés, triés par fréquence. Aucune liste codée en
  dur à maintenir quand un hook est ajouté — la barre suit le catalogue.
- **Tags exclus = noms de catégories.** `validation`, `security`, `context`,
  `documentation`, `notification`, `workflow` sont déjà des catégories : les
  réexposer en chips serait redondant avec le filtre Category. On ne garde que
  les **transverses** (ce qui traverse plusieurs catégories).
- **Seuil fréquence ≥ 3.** Le registre a 234 tags distincts dont une longue
  traîne bruitée (1 occ). Top 18 à ≥3 occ = thématiques significatives ; le
  reste reste couvert par la recherche texte (qui matche déjà les tags).
- **Sémantique OU.** Un hook a plusieurs tags ; filtrer par thème élargit le
  filet (union), contrairement à Category/Event qui sont par nature exclusifs.

## Where

- `src/lib/hooks.ts` — `HookFilters.tags: string[]` + branche OU dans
  `filterHooks`.
- `src/components/CatalogueExplorer.tsx` — `themeOptions` (useMemo, exclut
  `CATEGORY_ORDER`, top 18 par fréquence), état `selectedTags`, bloc chips.
- `src/lib/i18n.ts` — `filterThemes`, `themesHint`.
- `src/lib/analytics.ts` — event `filter_tag`.

## Trade-off

On ne currate pas les labels (kebab-case brut : `definition-of-done`,
`worktree`). Coût d'une curation manuelle = maintenance continue + décision
subjective sur 234 tags. Le kebab-case reste lisible et honnête vis-à-vis du
registre. Si le bruit devient gênant, prochaine étape : une allowlist de
thèmes curatés dans le registre (champ dédié) plutôt que dériver des tags.
