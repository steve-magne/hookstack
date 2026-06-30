---
type: Reference
title: Mémoire des décisions stratégiques
description: Archive des idées rejetées et pivots documentés de Hookstack, pour ne pas les reproposer ; le backlog actionnable vit dans les GitHub Issues.
tags: [strategie, backlog, pivots, decisions]
timestamp: 2026-06-30T00:00:00Z
---

# Mémoire des décisions stratégiques

> **Rôle de ce fichier** : conserver la **mémoire des idées rejetées ou archivées** et des pivots documentés. Le backlog actionnable, lui, vit dans les **GitHub Issues** du dépôt `steve-magne/hookstack` (labels `growth` + `backlog`).

Ce fichier n'est pas un todo list. C'est un garde-fou contre la répétition : si une idée a déjà été évaluée et écartée, elle est consignée ici pour ne pas être reproposée. Voir [/business/growth.md](/business/growth.md) pour le système de labels et le flux des issues.

## Pivots documentés

### Pivot 1 — « Script node généré » → CLI `npx`

- **Avant** : le produit devait se limiter à **générer un script Node.js** que l'utilisateur copiait puis exécutait lui-même.
- **Après** : un vrai **CLI distribué sur npm** (`hookstack-cli`), invoqué via `npx hookstack-cli@latest install`.
- **Raison** : le CLI incarne l'**identité produit** (un outil installable, pas un snippet jetable) et déclenche une **boucle virale** — URL mémorisable + commande `npx` copiable forment un loop naturel de partage (voir [/marketing/strategy.md](/marketing/strategy.md)). Le script généré seul n'avait ni la mémorabilité ni la friction nulle d'installation.

### Pivot 2 — Mono-agent Claude Code → Multi-agent

- **Avant** : Hookstack ciblait uniquement **Claude Code**.
- **Après** : portabilité **multi-agent** (Claude Code, OpenAI Codex, GitHub Copilot) — un hook `.mjs` identique, seul le format de config change.
- **Raison** : les trois agents partagent le même modèle d'événements de cycle de vie, donc la portabilité est quasi gratuite techniquement. Surtout, cela **multiplie le marché adressable par ~3** sans diluer le catalogue — c'est devenu le cœur du positionnement. Voir [/architecture/multi-agent-portability.md](/architecture/multi-agent-portability.md) et [/vision/mission.md](/vision/mission.md).

## Idées rejetées ou archivées

*(Section à alimenter au fil des sessions. Toute idée écartée en cours de route est consignée ici avec sa raison, pour éviter qu'elle ne revienne.)*

## Principes stratégiques stables

Ces principes orientent le triage des nouvelles idées et ne sont pas remis en cause à court terme :

- **Croissance avant monétisation** — pas d'offre payante précoce ([/business/monetization.md](/business/monetization.md))
- **Le catalogue reste gratuit et ouvert** — actif stratégique d'effet réseau, ne pas le freiner derrière un paywall
- **KISS** — toujours la solution la plus simple qui résout le problème, pas d'abstraction prématurée
- **Dogfood permanent** — les hooks du catalogue sont actifs sur le repo lui-même ; ce qui n'est pas dogfoodable est suspect
- **Le `.mjs` est la source de vérité du code** ; le registre n'est que le reflet des métadonnées
