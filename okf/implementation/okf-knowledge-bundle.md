---
type: Playbook
title: OKF Knowledge Bundle — Implémentation
description: Mise en place de la base de connaissance agentique OKF v0.1 sur Hookstack (bundle, scripts/okf.mjs, sous-agent librarian, skill /okf, hooks catalogue).
tags: [implementation, okf, knowledge-management, documentation]
timestamp: 2026-06-30T00:00:00Z
---

# What

Mise en place d'un bundle de connaissance **OKF v0.1** (`okf/`) — source de vérité agentique
pour l'architecture, la vision, le produit, le business et la roadmap de Hookstack. Reproduit
le système éprouvé sur `cyber-harp`, adapté à ce projet.

# Why

Le contexte projet (vision, décisions d'architecture, invariants, conventions) était éparpillé
entre `CLAUDE.md`, `doc/product/` et `README.md` — lisible par un humain mais coûteux à
récupérer pour un agent (chargement massif dans le contexte). OKF apporte :

- **Retrieval déterministe** (`node scripts/okf.mjs query`) — ~0 token modèle.
- **Progressive disclosure** — l'agent n'ouvre que les concepts pertinents.
- **Auto-maintien** — staleness check + validate-on-change gardent le bundle frais et conforme.

# How

## Éléments génériques (copy-paste depuis cyber-harp, non spécifiques)

| Élément | Rôle |
|---|---|
| `scripts/okf.mjs` | CLI zéro-dépendance : `query`/`map`/`index`/`stale`/`validate`/`graph` |
| `.claude/agents/okf-librarian.md` | Sous-agent : lit le bundle dans son contexte, renvoie une synthèse |
| `.claude/commands/okf.md` | Skill `/okf` : aiguillage consult / enrich / check / map / graph |
| `okf/meta/*` | Protocole agent, auto-bonification, guide de portage |

## Bundle `okf/` (contenu FR adapté à Hookstack)

Seedé depuis `doc/product/` (01-overview, 02-valeur, 03-personnas, 04-hook-101, 05-ux,
06-vision-produit) + `CLAUDE.md` + `README.md`. Sections : `vision/`, `architecture/`,
`product/`, `business/`, `marketing/`, `roadmap/`, `strategy/`, `implementation/`, `meta/`.

## 3 hooks ajoutés au catalogue hookstack

Contrairement à cyber-harp (hooks internes isolés), hookstack reconstruit `settings.json`
depuis le registre — donc les hooks actifs **doivent** être des entrées du catalogue. Les 3
hooks OKF rejoignent `registry/registry.json` (catégorie `documentation`/`validation`),
réutilisables par tout projet qui adopte OKF :

| Slug | Événement | Rôle |
|---|---|---|
| `session-start-okf-staleness` | SessionStart | Rappel d'enrichissement si bundle périmé (>14j) |
| `stop-okf-staleness-check` | Stop | Bloque la fin de session sur bundle périmé non enrichi |
| `okf-validate-on-change` | FileChanged | Valide OKF v0.1 strict à chaque édition d'un `okf/*.md` |

Tous **silencieux** (no-op) quand `scripts/okf.mjs` ou `okf/` sont absents — donc inoffensifs
sur un projet sans OKF.

# Câblage

- `CLAUDE.md` : section « Source de connaissance — OKF » → consulter via `okf-librarian` ou
  `node scripts/okf.mjs query` avant toute tâche.
- CI : `node scripts/okf.mjs validate --strict` ajouté au pipeline (conformité OKF v0.1).
- `okf/index.md` + `okf/*/index.md` + `okf/graph.html` : **générés** par
  `node scripts/okf.mjs index` / `graph` — ne jamais les éditer à la main.

# Améliorations vs cyber-harp

1. **Test unitaire `tests/lib/okf.test.mjs`** — cyber-harp n'en avait pas ; couvre
   `parseFrontmatter`, `query`, `stale`, `validate` (conforme à la culture test hookstack).
2. **CI gate `okf validate --strict`** — conformité OKF garantie sur chaque PR.
3. **Hooks au catalogue public** — au lieu d'internes, ils enrichissent le catalogue et sont
   dogfoodés (cohérent avec `stop-force-implementation-doc` déjà présent).

# Citations

[1] [OKF SPEC v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
