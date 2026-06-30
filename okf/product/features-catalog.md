---
type: Reference
title: Inventaire du surface produit
description: Ce qui existe, ce qui est à améliorer, ce qui est à créer — du catalogue filtrable au wizard guidé. Cartographie honnête du surface produit Hookstack à date.
tags: [features, catalogue, roadmap, surface-produit, configurateur]
timestamp: 2026-06-30T00:00:00Z
---

# Inventaire du surface produit

Cartographie honnête du surface produit Hookstack, séparée en trois bacs : **existant en production**, **à améliorer**, **à créer**. Cet inventaire est la base du dialogue roadmap — il capture l'état réel, pas l'état souhaité.

## Ce qui existe (production)

### Le catalogue filtrable — `CatalogueExplorer`

Le moteur de découverte. Composant client (`src/components/CatalogueExplorer.tsx`) qui expose :

- **Filtres multi-critères** — par event type, par catégorie (les 6 de la taxonomie), par mot-clé, par stack.
- **Regroupements** — bascule entre regroupement par event et par catégorie.
- **Sélecteur de stack** — chips TypeScript / Python / Node.js qui filtrent les hooks tech-spécifiques (un hook annoté `stack: ["typescript"]` ne s'affiche que si la stack correspond).
- **Liste groupée + modale** — survol d'une ligne = détail (`benefit` en héros), clic = modale complète (`HookModal`).

### La sélection persistée

- **Zustand + localStorage** — slugs sélectionnés stockés sous la clé `hookstack-selection` (voir `src/store/selection.ts`). L'utilisateur peut fermer son navigateur et revenir à sa stack.
- **Cas d'usage** — coche/décoche rapide dans le catalogue, conservation cross-session.

### Le `HookConfigurator` temps réel

- **Génération live de la commande `npx`** à partir des slugs sélectionnés (voir [/product/ux-cli-delivery.md](/product/ux-cli-delivery.md)).
- **Bannière sticky** avec effet pulse à chaque sélection/désélection.
- **Trois boutons de copie** — commande, settings.json, scripts.

### La page de détail `/hook/[slug]`

Route Next.js App Router (Server Component) par hook :

- **Cas d'usage**, **config**, **script** (le `code_snippet` dérivé du `.mjs`).
- URL stable, indexable — chaque hook a sa page canonique.

### Le CLI multi-agent publié sur npm

- **`hookstack-cli`** public, installable via `npx hookstack-cli@latest`.
- **Cinq scopes** couvrant trois agents (Claude Code, OpenAI Codex, GitHub Copilot).
- **Flow interactif @clack/prompts** — scope, summary, table de sécurité (avec colonne Snyk côté CI), confirm.
- **Fusion intelligente non-destructive** du `settings.json` existant.
- Code source dans `packages/cli/`, logique pure isolée dans `core.mjs`, couverte par `tests/cli/core.test.mjs`.

### Le registre vivant

- **`registry/registry.json`** — source de vérité des **métadonnées** du catalogue (le code vivant dans les `.mjs`, voir [/product/hook-101.md](/product/hook-101.md)).
- **Sync automatique** — `node .claude/sync-hooks.mjs` recopie les `.mjs` dans `code_snippet` et reconstruit `.claude/settings.json`. Garde-fou CI `--check` contre la dérive.
- **Boucle d'enrichissement communautaire** — soumission d'URL GitHub → GitHub Action → Claude Code Agent → PR auto-generated → merge.

## Ce qui est à améliorer

### Priorité 1 — Enrichissement du profil projet

Le sélecteur de stack actuel est minimal (TypeScript / Python / Node.js). La prochaine étape est un **profil projet** plus riche :

- **Type de projet** — SaaS web / CLI / lib / mobile.
- **Préoccupations principales** — sécurité / qualité / vitesse / no-breakage CI.
- **Taille d'équipe** — solo / petite équipe / enterprise.

Ce profil permettrait des **recommandations personnalisées** : *« Pour un SaaS Next.js avec focus sécurité, on te recommande ces 5 hooks. »* C'est le pont entre le catalogue brut et le wizard guidé (voir *à créer*).

### Priorité 2 — Hooks « must-have » marqués

Introduire un flag `default_on` dans le registre pour les hooks considérés comme **fondamentaux** quelle que soit la stack :

- **Mise en avant visuelle** côté site (accent indigo).
- **Aide à l'onboarding** — un nouvel utilisateur se perd face à 68+ hooks ; les `default_on` lui donnent un point d'ancrage.
- **Brique du fast path** — la stack prédéfinie de l'écran 1 du produit cible s'appuiera naturellement sur ces hooks.

### Priorité 3 — Page détail enrichie (`/hook/[slug]`)

La page actuelle affiche cas d'usage, config et script. Ajouter :

- **Exemples de repos réels** qui utilisent ce hook (issus de `community_examples`).
- **Statistiques d'installation** — combien d'installations via le CLI.
- **Liens vers les PRs** qui ont ajouté ce hook au registre.

L'objectif est de transformer chaque page de détail en **preuve sociale** : le hook n'est pas seulement décrit, il est *montré en usage*.

## Ce qui est à créer

### Le wizard guidé

La vitrine du catalogue évolue progressivement vers un **wizard de configuration guidé par le profil projet**. Le flow cible :

1. L'utilisateur renseigne son profil (type, préoccupations, équipe).
2. Le wizard propose une **stack recommandée** (les `default_on` + les hooks spécifiques à son profil).
3. La commande `npx` est générée, copiable en un clic.
4. Le **catalogue brut reste accessible** aux utilisateurs avancés qui veulent bypasser la recommandation.

Le wizard ne remplace pas le catalogue — il l'**orchestre**. C'est l'aboutissement du slogan *« Get your HookStack in 1 minute »* : la recommandation se fait pour l'utilisateur, pas par lui.

### Pistes futures (hors périmètre courant)

- **Monétisation Pro** — hooks custom privés (équipe), mises à jour automatiques des hooks installés, analytics sur les hooks de son équipe, support prioritaire. Le modèle gratuit reste canonique pour l'audience communautaire ; le tier Pro est une couche optionnelle pour les organisations.
- **Prompt Claude Code enrichi** — pour les configs complexes, générer un prompt riche à coller dans Claude Code qui délègue à l'IA la gestion des edge cases (conflits de matchers, chemins custom).

## Concepts voisins

- [/product/hook-101.md](/product/hook-101.md) — le modèle de hook qui sous-tend tout ce surface.
- [/product/ux-cli-delivery.md](/product/ux-cli-delivery.md) — le livrable `npx` qui unified découverte et installation.
- [/vision/mission.md](/vision/mission.md) — le slogan-boussole qui arbitre ce qui entre dans le scope.
- [/vision/personas.md](/vision/personas.md) — les cibles qui justifient chaque priorité roadmap.
- [/business/growth.md](/business/growth.md) — la trajectoire de croissance qui contraint l'ordre des priorités.
