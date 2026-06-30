---
type: Reference
title: Stratégie marketing et positionnement
description: Hookstack se positionne comme le catalogue de hooks agentiques agnostique de l'agent, élargissant le marché adressable par sa portabilité multi-agent.
tags: [marketing, positionnement, concurrence, multi-agent]
timestamp: 2026-06-30T00:00:00Z
---

# Stratégie marketing et positionnement

## Proposition centrale

Hookstack est **le catalogue de hooks agentiques, agnostique de l'agent**. Le triptyque distinctif :

1. **Catalogue** filtrable (provider, cas d'usage, type de projet, stack)
2. **CLI** qui installe en une commande `npx hookstack-cli@latest`
3. **Enrichissement communautaire automatisé** (analyse de repos GitHub)

Aucun concurrent ne réunit ces trois leviers.

## Le fossé concurrentiel : le multi-agent

C'est le cœur de la différenciation. Les collections existantes sont **mono-agent** :

- `awesome-copilot` (GitHub) — collection manuelle, GitHub Copilot uniquement, pas de génération de config, pas de CLI
- **Docs officielles Claude Code** — références par provider, pas un catalogue ni un outil d'installation
- **Blog posts perso** — ponctuels, non maintenus, non mis à jour

Hookstack, en revanche, écrit **un hook une fois et le déploie sur trois agents** (Claude Code, OpenAI Codex, GitHub Copilot). Le code `.mjs` est identique — seul le format de config change, traduit par le CLI. Ce n'est pas une extension cosmétique : **cela multiplie le marché adressable par ~3** sans diluer le catalogue.

### Pourquoi le multi-agent élargit le marché

Les trois agents partagent le **même modèle d'événements de cycle de vie** (`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`…). L'investissement dans un hook se rentabilise donc sur trois écosystèmes au lieu d'un. Un utilisateur de Codex ou de Copilot entre dans la cible au même titre qu'un utilisateur de Claude Code (voir [/vision/personas.md](/vision/personas.md) et [/architecture/multi-agent-portability.md](/architecture/multi-agent-portability.md)).

## Canaux

- **GitHub** (`steve-magne/hookstack`) — vitrine technique, README vendeur, étoiles, Issues growth
- **Communauté dev IA** — Early adopters, contributeurs open source, AI champions en entreprise
- **Site web** (`hookstack.app`) — catalogue + `HookConfigurator`, porte d'entrée du fast path

## Boucle virale

L'URL mémorisable (`hookstack.app`) couplée à une commande `npx` copiable forme une **boucle naturelle** :

```
Découvre le site → sélectionne ses hooks → copie la commande npx → installe → partage l'URL à un collègue
```

Chaque dépôt contribué au catalogue renforce la boucle : effet réseau où l'enrichissement automatique améliore le site sans intervention manuelle. Le dogfood complet (72 hooks actifs sur le repo lui-même) rend le récit crédible et démontrable.

## Lien avec la croissance

Le positionnement multi-agent est le levier principal vers l'objectif 5000 ⭐ (voir [/business/growth.md](/business/growth.md)) : il adresse trois communautés distinctes avec un seul message. Voir aussi [/product/features-catalog.md](/product/features-catalog.md) pour les fonctionnalités produit qui ancrent ce positionnement.
