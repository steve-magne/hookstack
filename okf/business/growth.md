---
type: Reference
title: Croissance et système d'exécution marketing
description: Objectif 5000 étoiles GitHub et trafic hookstack.app, pilotés par un système d'exécution dédié dans un repo marketing séparé.
tags: [growth, marketing, github, metriques]
timestamp: 2026-06-30T00:00:00Z
---

# Croissance et système d'exécution marketing

## Objectif

Cible unique et explicite : le dépôt GitHub `steve-magne/hookstack` atteint **5000 ⭐**, accompagné d'un trafic mesurable sur `https://www.hookstack.app`. La croissance précède la monétisation (voir [/business/monetization.md](/business/monetization.md)).

## Architecture du système d'exécution

Le **système d'exécution marketing vit dans un dépôt privé séparé** : `hookstack-marketing`. Il ne réside pas dans le repo Hookstack lui-même.

- **Règle de session** : pour toute session marketing (growth, content, outreach), ouvrir `hookstack-marketing`, pas le dépôt produit.
- **Skills disponibles depuis le dépôt produit** mais exécutés via le système marketing :
  - `/growth-coach` — pilotage stratégique de croissance, recommandations d'actions
  - `/growth-post` — production de contenu (posts, annonces, posts de lancement)
  - `/growth-outreach` — prospection, prise de contact, partenariats communautaires

## Backlog growth

Le backlog actionnable des initiatives marketing vit dans les **GitHub Issues** du dépôt `steve-magne/hookstack`, avec les labels :

- `growth` — label racine obligatoire pour toute initiative de croissance
- `content` — production de contenu (articles, posts, vidéos)
- `outreach` — prospection et partenariats
- `spike` — investigation exploratoire (test d'un canal, d'un angle)
- `seo` — optimisations de référencement, contenu programmatique
- `idea` — idée non priorisée, en attente de triage

Ce système de labels est le **pont entre les décisions marketing et les changements produit** : une initiative validée dans une issue peut remonter jusqu'à une évolution du catalogue, du site ou du CLI.

## Métriques

Capture automatisée via le script :

```bash
node .claude/skills/growth-coach/scripts/metrics.mjs
```

Fournit un snapshot des indicateurs clés : étoiles GitHub, téléchargements npm du package `hookstack-cli`. Exécuté automatiquement **chaque lundi** via le workflow GitHub Actions `.github/workflows/growth-metrics.yml` — le snapshot est donc toujours frais en début de semaine, sans intervention manuelle.

## Lien avec la vision

La croissance alimente l'effet réseau du catalogue (chaque dépôt contribué enrichit le catalogue → le site s'améliore automatiquement). Voir [/vision/mission.md](/vision/mission.md) et [/marketing/strategy.md](/marketing/strategy.md) pour le positionnement qui soutient cette croissance.
