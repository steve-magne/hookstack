---
type: Reference
title: Mission de Hookstack
description: Pourquoi Hookstack existe — un catalogue communautaire de hooks agentiques agnostique de l'agent, qui transforme un hook écrit une fois en un levier déployé sur trois écosystèmes.
tags: [mission, vision, multi-agent, portabilité, dogfood, effet-réseau]
timestamp: 2026-06-30T00:00:00Z
---

# Mission de Hookstack

## Le slogan-boussole

> *"Get your HookStack in 1 minute."*

Ce n'est pas un argument marketing, c'est l'invariant qui arbitre toute décision produit : si une fonctionnalité rallonge le chemin entre *l'arrivée d'un développeur sur le site* et *ses hooks actifs*, elle est rejetée ou reléguée. La promesse se déroule en trois temps :

1. **Fast path** — le développeur voit une stack de hooks recommandée pour son type de projet, la commande `npx` est déjà prête.
2. **Configure** — s'il veut affiner, le catalogue filtrable + le `HookConfigurator` reconstruisent la commande en temps réel à chaque cochage.
3. **Install** — il colle la commande dans son terminal ; le CLI installe les `.mjs` et patche le bon fichier de config selon l'agent ciblé.

L'écart entre l'écran 1 et l'écran 3 ne doit jamais dépasser une minute.

## Pourquoi le projet existe

Les hooks agentiques (`PreToolUse`, `PostToolUse`, `SessionStart`, `Stop`…) sont le mécanisme par lequel un développeur reprend le contrôle du cycle de vie d'un agent IA : interception d'outils, validation de commandes shell, injection de contexte projet, automatisation post-génération. Pourtant, trois douleurs verrouillent leur adoption :

- **Découverte difficile** — chaque provider documente ses hooks en silo, sans vue unifiée par cas d'usage.
- **Implémentation manuelle et répétitive** — chaque développeur repart de zéro pour des patterns structurellement identiques.
- **Partage inexistant** — aucun lieu centralisé où la communauté DevSecOps expose ses hooks réels, avec le code associé.

Hookstack adresse les trois par la combinaison **catalogue filtrable + CLI d'installation + boucle d'enrichissement communautaire automatisée**. Le registre officiel alternatif (`awesome-copilot`) n'est qu'une collection manuelle non guidée, sans génération de config ni catégorisation par besoin — le fossé concurrentiel se joue ici.

## L'effet de levier multi-agent

L'invariant structurel qui distingue Hookstack de toute collection existante :

> Un hook est écrit **une fois** et déployable sur **trois** écosystèmes — Claude Code, OpenAI Codex et GitHub Copilot. Le code `.mjs` est identique ; seul le format du fichier de config diffère.

Cela tient à une propriété chanceuse : les trois agents partagent les **mêmes noms d'événements** de cycle de vie. Le CLI opère donc la traduction de config à l'installation (voir [/architecture/multi-agent-portability.md](/architecture/multi-agent-portability.md)), sans jamais toucher au code du hook. Conséquence stratégique :

- Le marché adressable est **multiplié par trois** sans fragmenter le catalogue.
- L'investissement dans un hook se rentabilise sur trois écosystèmes au lieu d'un.
- Le positionnement canonique devient : *le catalogue de hooks agentiques, agnostique de l'agent*.

Les collections concurrentes sont mono-agent par construction ; c'est un fossé durable, pas un avantage tactique.

## La vision founder

Quatre moteurs, pas un, expliquent la persistance du projet :

- **Dogfood complet** — le fondateur est son premier beta-testeur : 62+ hooks actifs sur ce dépôt même, via `.claude/settings.json`. Le catalogue est validé en conditions réelles à chaque session Claude Code sur le projet. Un hook cassé est un hook corrigé immédiatement.
- **Partage rapide** — envoyer un lien à un collègue, le voir repartir avec sa config en deux minutes. Le bouche-à-oreille commence là.
- **Visibilité communautaire** — *"J'ai fait le site qui configure les hooks Claude Code"* est un pitch extrêmement visible dans la communauté dev IA.
- **Effet réseau** — chaque dépôt GitHub contribué enrichit le catalogue, et donc le site, automatiquement. Plus la communauté contribue, plus la valeur de découverte augmente pour tous.

## Le scope produit

Hookstack ne construit **pas** :

- Un plugin, un SDK, ni une surcouche d'agent. Un hook est un simple événement branché sur un cycle de vie existant.
- Un runtime propriétaire. Le seul runtime garanti est Node.js (dépendance de Claude Code), et les hooks s'appuient exclusivement sur les builtins Node (`fs`, `child_process`, `path`).
- Un mono-agent lock-in. Tout hook du catalogue est portable par construction.

Hookstack **construit** :

- Un **catalogue** vivant (source de vérité : `registry/registry.json`), filtrable et catégorisé.
- Un **CLI** public (`hookstack-cli` sur npm) qui installe en une commande vers cinq scopes couvrant trois agents.
- Une **boucle d'enrichissement** où l'analyse de repos GitHub soumis alimente automatiquement le catalogue.

## Concepts voisins

- [/vision/personas.md](/vision/personas.md) — qui sont les trois cibles et pourquoi la portée multi-agent élargit chacune.
- [/product/hook-101.md](/product/hook-101.md) — la définition technique d'un hook et sa taxonomie.
- [/product/ux-cli-delivery.md](/product/ux-cli-delivery.md) — le livrable concret de la promesse en 1 minute.
- [/architecture/overview.md](/architecture/overview.md) — l'architecture technique du catalogue et du CLI.
- [/business/growth.md](/business/growth.md) — la trajectoire vers 5000 ⭐ et l'effet réseau comme moteur de croissance.
