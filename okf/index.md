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

* [Skill /analyze-repo — alignement sur le schéma actuel du registre](implementation/analyze-repo-schema-alignment.md) - Mise à jour du pipeline analyze-repo — suppression des champs morts (provider/i18n/community_examples), support des layouts de config non-.claude (hooks/hooks.json, hooks.json, .claude/hooks.json), remplacement de la Phase 6 (apply-best-practices) par sync-hooks.
* [CLI contribute — noms de fichiers canoniques des hooks](implementation/canonical-hook-filenames.md) - PR contribute auto-générée ajoutant des doublons <slug>.mjs byte-identiques aux hooks renommés sur main — résolue par un renommage canonique (git mv + script_path + config + tests + settings + timeline).
* [Catalogue — filtre par thématiques](implementation/catalogue-theme-filter.md) - Barre de chips thématiques sur la home pour filtrer le catalogue par cas d'usage, projetées depuis le registre vers une allowlist curée orientée besoin.
* [CLI contribute — renvoyer un hook modifié en PR](implementation/cli-contribute-command.md) - Commande npx ... contribute qui pousse une modification locale d'un hook vers le registre upstream via fork + PR, tests unitaires associés inclus.
* [CLI contribute — hooks renommés localement (fichier ≠ slug)](implementation/cli-contribute-renamed-files.md) - Le contribute du CLI échouait en ENOENT quand l'utilisateur renommait un hook .mjs installé — la copie partait de <slug>.mjs au lieu du fichier réel portant le fingerprint.
* [CLI — détection autonome complète (tous les hooks nécessaires)](implementation/cli-full-autonomy-detection.md) - Le CLI install étend sa détection contextuelle de 5 à 11 signaux pour installer automatiquement l'ensemble des hooks non-default_on pertinents pour le projet (tests, skills, registry, TTS, Slack, docs).
* [CLI install — audit détection + UX (toolchain inconnue, slugs écartés, hooks SEO Next.js-only)](implementation/cli-install-detection-ux.md) - Audit du CLI interactif à l'install : la détection de toolchain inconnue installait silencieusement tout le set default_on, les slugs écartés n'étaient pas listés, et 3 gardes SEO Next.js-only étaient proposées à tout projet TypeScript. Corrections + retours UX (spinner/log, spinner détection).
* [CLI — détection intelligente de la toolstack à l'install](implementation/cli-smart-toolstack-detection.md) - Le CLI analyse le projet (dossiers i18n/okf, package.json, remote git) et suggère ou auto-installe les hooks du catalogue qui correspondent aux systèmes réellement présents.
* [CLI install — détection de stack pour filtrer les hooks par défaut](implementation/cli-stack-detection.md) - Le CLI installait tout le set default_on sans distinction de langage (ex. le hook Biome, TypeScript-only, dans un projet purement Python) — résolu par détection de stack par manifeste + filtrage côté CLI et exposition du champ registre stack via l'API.
* [Badge de coverage du README — générateur déterministe + drift guard CI](implementation/coverage-badge.md) - scripts/coverage-badge.mjs rend le badge 4 métriques (lines/statements/branches/functions) depuis coverage-summary.json, l'insère dans le README et le CI vérifie sa fraîcheur via --check.
* [i18n-validation — find qui timeout sur les worktrees](implementation/fix-i18n-hook-timeout.md) - Le hook Stop i18n-validation explosait en ETIMEDOUT à chaque session car son find parcourait les node_modules des .claude/worktrees. Correction du prune + silence défensif.
* [Freebuff — rafraîchir main avant chaque session worktree](implementation/freebuff-startup-script-refresh-main.md) - Le startupScript Freebuff `git pull` échouait sur les worktrees frais (branche sans upstream) et chaque session partait d'un main local périmé — nouveau script fetch + fast-forward sur origin/main, sûr dans tous les cas.
* [Dédup des hooks — fusion biome/ruff et retrait des gardes redondantes](implementation/hook-dedup-biome-ruff-guards.md) - Fusion de post-write-autoformat dans post-write-biome, de post-write-ruff-format dans post-write-ruff-check (variantes .mjs et .py), suppression de pre-bash-guard-git-push-main, et correctifs miroir .mjs/.py (enforce-uv, setup-check-deps, inject-datetime, tts, fingerprint).
* [Helper commun « fichiers modifiés » — porcelain + commits locaux](implementation/hooks-changed-files-helper.md) - Les hooks Stop décidaient de tourner en lisant uniquement `git status --porcelain` — après un commit/push en session, l'arbre propre les désactivait silencieusement. Correction structurelle : module partagé lib/changed-files (mjs + py) combinant porcelain et diff merge-base/origin-main, livré aux côtés des hooks via companion_files.
* [Lien "Catalogue" dans la navbar — Implémentation](implementation/navbar-catalogue-link.md) - Ajout d'un lien de navigation qui scrolle vers la section catalogue de la home.
* [OKF Knowledge Bundle — Implémentation](implementation/okf-knowledge-bundle.md) - Mise en place de la base de connaissance agentique OKF v0.1 sur Hookstack (bundle, scripts/okf.mjs, sous-agent librarian, skill /okf, hooks catalogue).
* [Gate CI — couverture lignes ≥ 80 % par hook individuel](implementation/per-hook-coverage-gate.md) - En complément du seuil agrégé de vitest, scripts/check-hook-coverage.mjs bloque tout hook dont la couverture lignes < 80 %, avec une liste d'exceptions pour les hooks hérités.
* [Variantes Python des hooks — install language-aware](implementation/python-hook-variants.md) - Chaque hook peut porter une variante .py (stdlib only + tests pytest) ; le CLI détecte la toolstack du projet et installe les bons scripts du bon langage — plus aucun vitest/npm sur un projet Python.
* [Retrait de deux hooks obsolètes (changelog + son de fin)](implementation/remove-obsolete-notification-hooks.md) - stop-generate-changelog (remplacé par release-please) et stop-sound (Claude Code joue un son de complétion nativement) retirés du catalogue, du dogfood et de leurs tests.
* [Hook seo-schema-validation — validation JSON-LD post-édition](implementation/seo-schema-validation.md) - Nouveau hook du catalogue (PostToolUse Write|Edit) validant les blocs JSON-LD schema.org des fichiers HTML-like — adapté de https://github.com/AgriciDaniel/claude-seo, réimplémenté en Node pur avec le pattern run()+DI+test.

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
