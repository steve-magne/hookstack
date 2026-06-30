---
type: Playbook
title: Plan d'amélioration produit et technique
description: Priorités d'évolution de Hookstack par horizon, du profil projet personnalisé à la monétisation, avec le maintien technique continu.
tags: [roadmap, produit, technique, priorites]
timestamp: 2026-06-30T00:00:00Z
---

# Plan d'amélioration produit et technique

Horizon d'évolution de Hookstack, ordonné par priorité décroissante. Chaque priorité s'appuie sur la fondation existante (catalogue filtrable, sélection persistée, CLI multi-agent publié).

## Priorité 1 — Enrichissement du profil projet

Le sélecteur de stack actuel est minimal (TypeScript / Python / Node.js). Étendre vers un **profil projet riche** qui nourrit des recommandations personnalisées :

- **Type de projet** : SaaS web / CLI / lib / mobile
- **Préoccupations principales** : sécurité / qualité / vitesse / no-breakage CI
- **Taille d'équipe** : solo / petite équipe / enterprise

**Résultat cible** : « Pour un SaaS Next.js avec focus sécurité, on te recommande ces 5 hooks. » La vitrine évolue d'un catalogue brut vers un **wizard de configuration guidé** (le catalogue brut reste accessible aux utilisateurs avancés).

## Priorité 2 — Hooks "must-have" marqués

Introduire un flag `default_on` dans `registry/registry.json` pour les hooks fondamentaux quelle que soit la stack. Le site les met en avant visuellement (accent indigo).

**Objectif** : aider les nouveaux utilisateurs à démarrer sans se perdre dans les ~70 hooks du catalogue. Réduit la friction d'entrée et soutient la promesse *"Get your HookStack in 1 minute"*.

## Priorité 3 — Page détail enrichie (`/hook/[slug]`)

La page actuelle affiche cas d'usage, config et script. Ajouter :

- **Exemples de repos réels** qui utilisent ce hook (depuis `community_examples`)
- **Statistiques** : nombre d'installations via le CLI
- **Liens vers les PRs** qui ont ajouté ce hook au registre

Renforce la crédibilité et la profondeur du catalogue pour les utilisateurs avancés et les contributeurs.

## Priorité 4 — Monétisation Tier Pro

Activation de l'offre payante à maturité, ciblant les usages équipe/enterprise :

- Hooks custom privés
- Mises à jour automatiques des hooks installés
- Analytics équipe
- Support prioritaire

Voir [/business/monetization.md](/business/monetization.md) pour les conditions de timing (après établissement de la croissance).

## Maintien technique continu

Activité transverse, menée en parallèle de toutes les priorités ci-dessus :

- **Dette technique** — surveillance et remboursement progressif
- **Qualité** — couverture des garde-fous CI : `pnpm typecheck`, `pnpm lint` (Biome), `pnpm test`, `pnpm validate:registry`, `sync-hooks --check`, `hooks-timeline --check`
- **Sync registre** — maintenir le flux `.mjs` (source de vérité du code) → `code_snippet` (catalogue) → `.claude/settings.json` (config) ; tout nouveau hook passe par le `.mjs` + son test + la sync
- **Couverture de tests** — un `tests/hooks/<slug>.test.mjs` par hook, pattern `run()` + DI ; seuil ≥80 % sur fichiers modifiés

## Lien stratégique

Ce plan sert directement l'objectif de croissance ([/business/growth.md](/business/growth.md)) : chaque priorité réduit la friction d'entrée ou augmente la valeur perçue, alimentant la boucle virale décrite dans [/marketing/strategy.md](/marketing/strategy.md).
