---
okf_version: "0.1"
---

# Hookstack — Knowledge Bundle

Source de connaissance unique pour toute session agentique sur Hookstack.
Format [OKF v0.1](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md) :
des fichiers markdown + frontmatter YAML, lisibles sans outillage, versionnés dans git.

**Tout agent DOIT lire ce bundle avant d'agir.** Commencer par [meta/agent-protocol](meta/agent-protocol.md).

> La navigation ci-dessous est **générée** par `node scripts/okf.mjs index` — ne pas l'éditer
> à la main. Pour chercher un concept sans tout charger : `node scripts/okf.mjs query <termes>`.

<!-- okf:nav:start -->

## Architecture

* [Outillage Claude Code — hooks, quality gates, guardrails](architecture/claude-code-tooling.md) - Pourquoi le repo s'appuie sur des hooks Claude Code pour imposer zéro dette et bloquer les actions dangereuses.
* [Scopes d'installation CLI — 5 scopes, 3 agents](architecture/cli-scopes.md) - Les 5 cibles d'installation du CLI hookstack-cli, le format de config et la réécriture des chemins par scope.
* [Portabilité multi-agent — un hook, trois agents](architecture/multi-agent-portability.md) - Pourquoi le code .mjs est identique entre Claude Code, Codex et Copilot, seul le format de config diffère.
* [Vue d'ensemble — mono-repo, stack, conventions](architecture/overview.md) - Structure du repo Hookstack, stack technique et conventions de code.
* [Sync catalogue → projet (le .mjs est la vérité)](architecture/registry-sync.md) - Les .claude/hooks/*.mjs sont la source de vérité du code ; registry.json en dérive code_snippet ; settings.json est reconstruit.

## Business

* [Croissance et système d'exécution marketing](business/growth.md) - Objectif 5000 étoiles GitHub et trafic hookstack.app, pilotés par un système d'exécution dédié dans un repo marketing séparé.
* [Modèle économique](business/monetization.md) - Catalogue et CLI gratuits pour construire l'audience ; tier Pro futur ciblant les usages équipe, sans monétisation précoce.

## Implementation

* [CLI contribute — renvoyer un hook modifié en PR](implementation/cli-contribute-command.md) - Commande npx ... contribute qui pousse une modification locale d'un hook vers le registre upstream via fork + PR.
* [OKF Knowledge Bundle — Implémentation](implementation/okf-knowledge-bundle.md) - Mise en place de la base de connaissance agentique OKF v0.1 sur Hookstack (bundle, scripts/okf.mjs, sous-agent librarian, skill /okf, hooks catalogue).

## Marketing

* [Stratégie marketing et positionnement](marketing/strategy.md) - Hookstack se positionne comme le catalogue de hooks agentiques agnostique de l'agent, élargissant le marché adressable par sa portabilité multi-agent.

## Meta

* [Protocole agent — consommer le bundle OKF](meta/agent-protocol.md) - Comment toute session agentique lit et utilise ce bundle avant d'agir.
* [Portage du bundle vers un autre projet](meta/porting.md) - Réutiliser cette structure OKF en copy-paste pour un nouveau projet.
* [Auto-bonification périodique du bundle](meta/self-improvement.md) - Mécanisme self-contained pour garder le bundle frais, sans infra externe.

## Product

* [Inventaire du surface produit](product/features-catalog.md) - Ce qui existe, ce qui est à améliorer, ce qui est à créer — du catalogue filtrable au wizard guidé. Cartographie honnête du surface produit Hookstack à date.
* [Hook 101 — anatomie d'un hook agentique](product/hook-101.md) - Définition technique d'un hook agentique, taxonomie des six catégories du catalogue, et structure canonique d'une entrée du registre — avec le `.mjs` comme source de vérité du code.
* [Livrable produit — la commande npx](product/ux-cli-delivery.md) - Le livrable unique de Hookstack est une commande npx, jamais un copier-coller JSON. Anatomie du flow interactif @clack/prompts, des flags multi-agent, de la fusion intelligente mergeConfig et de la table de sécurité côté CI.

## Roadmap

* [Plan d'amélioration produit et technique](roadmap/improvement-plan.md) - Priorités d'évolution de Hookstack par horizon, du profil projet personnalisé à la monétisation, avec le maintien technique continu.

## Strategy

* [Mémoire des décisions stratégiques](strategy/backlog.md) - Archive des idées rejetées et pivots documentés de Hookstack, pour ne pas les reproposer ; le backlog actionnable vit dans les GitHub Issues.

## Vision

* [Mission de Hookstack](vision/mission.md) - Pourquoi Hookstack existe — un catalogue communautaire de hooks agentiques agnostique de l'agent, qui transforme un hook écrit une fois en un levier déployé sur trois écosystèmes.
* [Personas cibles de Hookstack](vision/personas.md) - Les trois profils utilisateurs de Hookstack — DevSecOps Enterprise, Explorateur IA/Early Adopter, Architecte Platform/AI Champion — et comment la portée multi-agent élargit chaque cible.

<!-- okf:nav:end -->
