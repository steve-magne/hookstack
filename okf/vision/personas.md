---
type: Persona
title: Personas cibles de Hookstack
description: Les trois profils utilisateurs de Hookstack — DevSecOps Enterprise, Explorateur IA/Early Adopter, Architecte Platform/AI Champion — et comment la portée multi-agent élargit chaque cible.
tags: [personas, cible, multi-agent, devsecops, early-adopter, platform]
timestamp: 2026-06-30T00:00:00Z
---

# Personas cibles de Hookstack

## Portée multi-agent

Depuis le passage du CLI au multi-agent, les personas ne sont plus limités aux utilisateurs de Claude Code. Un utilisateur d'**OpenAI Codex** ou de **GitHub Copilot** entre dans la cible au même titre que celui de Claude Code : le hook qu'il installe est le même `.mjs`, seul le fichier de config cible change (`.claude/settings.json` ou `.codex/hooks.json`). Le marché adressable couvre les trois écosystèmes simultanément, sans catalogue fragmenté.

Cette propriété transforme chaque persona : là où une collection mono-agent n'adresserait qu'un tiers de sa cible naturelle, Hookstack l'adresse entière. Voir [/architecture/multi-agent-portability.md](/architecture/multi-agent-portability.md) pour la mécanique de traduction de config.

---

## Persona 1 — Le Développeur DevSecOps Enterprise

- **Profil** : développeur senior en grande entreprise, utilisateur quotidien de GitHub Copilot, OpenAI Codex ou Claude Code selon les équipes. La coexistence de plusieurs agents dans la même organisation est la norme, pas l'exception.
- **Douleur principale** : passe du temps à configurer des hooks de sécurité, de validation et de contexte de façon ad hoc, sans référentiel partagé. Refait le même travail que le collègue du bureau d'à côté — sur un autre agent.
- **Besoin** : trouver rapidement les hooks adaptés à son projet et les activer en moins de deux minutes, quel que soit l'agent que son équipe a adopté.
- **Usage typique** :
  1. Sélectionne 3 à 4 hooks (`PreToolUse` sécurité, injection de contexte repo, validation de commandes shell).
  2. Copie la commande `npx hookstack-cli@latest install --hooks=...` générée par le `HookConfigurator`.
  3. La colle dans son terminal à la racine du projet, choisit son scope (`--project`, `--global`, `--copilot`, `--codex-project`, `--codex-profile`).
  4. Le CLI installe les `.mjs` et patche le bon fichier de config. Terminé.
- **Pourquoi Hookstack gagne** : l'angle DevSecOps + l'invariant *un hook = trois agents* lui donnent un référentiel unique à recommander à toute son équipe, quelle que soit la pile d'agents choisie.

---

## Persona 2 — L'Explorateur IA / Early Adopter

- **Profil** : développeur curieux, actif sur GitHub, contribue à des projets open source. Souvent pionnier sur un agent, puis sur un autre dès qu'il émerge.
- **Douleur principale** : a déjà mis en place des hooks intéressants mais ne sait pas où les partager. Ses patterns dorment dans des dotfiles privés au lieu de profiter à la communauté.
- **Besoin** : partager son approche, voir comment d'autres ont résolu les mêmes problèmes, et capitaliser un effort de hook une fois pour tous les agents qu'il utilise.
- **Usage typique** :
  1. Soumet l'URL de son repo GitHub via le workflow de contribution.
  2. Une GitHub Action déclenche Claude Code Agent : clone le repo, analyse les fichiers de config, identifie les hooks en place, les compare au registre existant.
  3. Une PR auto-generated est ouverte avec les nouveaux hooks détectés.
  4. Un mainteneur approuve → le hook entre dans le catalogue et devient disponible pour toute la communauté, sur les trois agents.
- **Pourquoi Hookstack gagne** : le retour visible (PR mergée, hooks utilisés par d'autres) et l'effet réseau — chaque contribution enrichit automatiquement le site pour tout le monde.

---

## Persona 3 — L'Architecte Platform / AI Champion

- **Profil** : responsable de l'adoption de GitHub Copilot, OpenAI Codex ou Claude Code dans une organisation. Souvent en charge de plusieurs agents coexistant dans des équipes différentes.
- **Douleur principale** : doit proposer des standards, des patterns validés et des bonnes pratiques à ses équipes — mais sans catalogue de référence agnostique de l'agent. Construire une politique interne mono-agent l'enfermerait dans un choix qu'il ne contrôle pas.
- **Besoin** : un catalogue de référence **agnostique de l'agent** qu'il peut recommander quel que soit l'outil adopté par chaque équipe, et auquel il peut contribuer pour faire remonter les patterns maison.
- **Usage typique** :
  1. Browse le catalogue par catégorie (security, context, validation…), exporte une liste de hooks recommandés.
  2. Documente une stack d'équipe standard sous forme de commande `npx` unique.
  3. Dépile cette commande sur les différents repos avec les flags adaptés à chaque agent (`--project`, `--codex-project`, `--copilot`).
- **Pourquoi Hookstack gagne** : le catalogue agnostique est le seul angle qui lui évite de pari sur un agent. C'est aussi la porte d'entrée pour des hooks custom privés d'équipe (voir Roadmap, monétisation future).

---

## Concepts voisins

- [/vision/mission.md](/vision/mission.md) — le slogan-boussole et l'effet de levier multi-agent qui sous-tendent ces personas.
- [/product/ux-cli-delivery.md](/product/ux-cli-delivery.md) — la commande `npx` comme livrable unique pour les trois personas.
- [/product/features-catalog.md](/product/features-catalog.md) — l'inventaire du surface produit adressé à ces cibles.
- [/marketing/strategy.md](/marketing/strategy.md) — comment atteindre concrètement chaque persona.
