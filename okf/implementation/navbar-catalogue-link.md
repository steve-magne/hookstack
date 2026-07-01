---
type: Playbook
title: Lien "Catalogue" dans la navbar — Implémentation
description: Ajout d'un lien de navigation qui scrolle vers la section catalogue de la home.
tags: [implementation, frontend, navigation]
timestamp: 2026-07-01T01:00:00Z
---

# What

Ajout d'un lien "Catalogue" dans `HeaderNav` ([`src/components/Header.tsx`](../../src/components/Header.tsx)), positionné en premier (avant Guides/Evolution/About), avec scroll animé (smooth) vers la section catalogue de la home.

# Why

La home ([`src/app/page.tsx`](../../src/app/page.tsx)) a déjà une section `id="catalogue"`, mais aucun point d'entrée direct depuis la nav pour y sauter — l'utilisateur devait scroller manuellement. Le scroll par défaut du navigateur est instantané (jump brutal) ; demande utilisateur explicite pour un scroll "smooth".

# How

- `<Link href="/#catalogue">` réutilisant la clé i18n `T.navCatalogue` (déjà présente dans `src/lib/i18n.ts`, non utilisée jusqu'ici).
- **Scroll smooth** : `scroll-behavior: smooth` global sur `html` dans [`globals.css`](../../src/app/globals.css), avec override `@media (prefers-reduced-motion: reduce) { scroll-behavior: auto }` — CSS natif, aucune librairie JS. C'est un mécanisme distinct du système Motion du site (`MotionConfig reducedMotion="user"` ne couvre que les animations JS pilotées par `motion/react`), d'où le besoin de sa propre media query a11y.
- **Offset sticky** : `scroll-mt-20` → `scroll-mt-[150px]` sur la section `#catalogue` ([`page.tsx`](../../src/app/page.tsx)). Le header de nav est `position: static` (pas sticky) ; l'élément réellement sticky sur toute la home est `StickyInstallBanner` (`sticky top-3`, ~138px de hauteur, monté au niveau du wrapper `HomePage` donc "collé" jusqu'en bas de page). Sans cet offset, le titre "Browse the Claude Code hooks catalogue" atterrissait sous la bannière. Valeur alignée sur le seuil `top-[138px]` déjà utilisé par la barre de filtres sticky interne de `CatalogueExplorer.tsx`.
