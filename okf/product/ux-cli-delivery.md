---
type: Reference
title: Livrable produit — la commande npx
description: Le livrable unique de Hookstack est une commande npx, jamais un copier-coller JSON. Anatomie du flow interactif @clack/prompts, des flags multi-agent, de la fusion intelligente mergeConfig et de la table de sécurité côté CI.
tags: [cli, npx, ux, multi-agent, fusion, sécurité, clack]
timestamp: 2026-06-30T00:00:00Z
---

# Livrable produit — la commande npx

## L'invariant de livraison

> **Le livrable de Hookstack est une commande `npx hookstack-cli@latest`, jamais un copier-coller de JSON.**

Cet invariant arbitre toute la chaîne UX. Il a été choisi après comparaison de cinq alternatives (script node généré, prompt Claude Code, skill `implement-hooks`, plugin MCP) — le CLI `npx` a gagné sur quatre critères simultanés : friction zéro, OS-agnosticité, fusion intelligente du `settings.json` existant, et **identité produit** (URL mémorisable, versioning npm, loop viral naturel via le nom `hookstack-cli`).

## La commande

```bash
npx hookstack-cli@latest install --hooks=<slug1>,<slug2>,...
```

Le contrat avec le site est porté par le flag `--hooks` : la liste des slugs sélectionnés dans le `HookConfigurator` est sérialisée en une commande copiable. Le CLI ne réinvente pas la sélection — il l'exécute.

Que fait la commande :

1. Télécharge / lit les scripts `.mjs` des hooks sélectionnés.
2. Les place dans `.claude/hooks/` (scope **project**) ou `~/.claude/hooks/` (scope **global**), ou leur équivalent `.codex/hooks/` pour OpenAI Codex.
3. Patche le fichier de config cible (`.claude/settings.json` ou `.codex/hooks.json`) en **mergeant intelligemment** — regroupement par événement puis par matcher, aucun écrasement d'une config préexistante.
4. Affiche un résumé de ce qui a été fait.

## Les cinq scopes (multi-agent)

Le CLI installe les **mêmes hooks** vers cinq scopes couvrant trois agents. L'utilisateur choisit via le menu interactif (ordre canonique : This project → All my projects → Codex profile → Codex project → GitHub Copilot) ou via un flag :

| Scope | Flag | Cible | Format | Réécriture des chemins |
|---|---|---|---|---|
| `project` | *(défaut)* | `./.claude/settings.json` | claude (clé `hooks`) | conserve `$CLAUDE_PROJECT_DIR` |
| `global` | `--global` / `-g` | `~/.claude/settings.json` | claude | `$CLAUDE_PROJECT_DIR` → racine absolue |
| `copilot` | `--copilot` | `./.claude/settings.json` | claude | retire `$CLAUDE_PROJECT_DIR/` (chemin relatif) |
| `codex-project` | `--codex-project` | `./.codex/hooks.json` | codex (events racine) | `$CLAUDE_PROJECT_DIR/.claude/` → `.codex/` |
| `codex-profile` | `--codex-profile` | `~/.codex/hooks.json` | codex | `$CLAUDE_PROJECT_DIR/.claude/` → `<home>/.codex/` |

Détail important pour Codex : les événements sont écrits **à la racine** du `hooks.json`, sans wrapper `hooks` — c'est la traduction de format que le CLI opère. La mécanique complète est documentée dans [/architecture/multi-agent-portability.md](/architecture/multi-agent-portability.md).

## Le flow interactif (@clack/prompts)

En terminal TTY, l'installeur lance un flow inspiré de `skills.sh`. Quatre étapes :

1. **Installation scope** — choix du scope parmi les cinq ci-dessus, avec affichage du chemin cible (ex. `./.claude — committed with your repo`).
2. **Installation Summary** — par hook : chemin de destination, catégorie, event (+ « can block »), matcher, repo source. L'utilisateur voit exactement ce qui va changer.
3. **Security** — un **tableau honnête** par hook. Colonnes locales calculées en statique sur le code :
   - `Shell` — exécution de commandes
   - `Net` — accès réseau
   - `Writes` — écritures disque
   … **plus une colonne Snyk** : verdict SAST `Safe` / `Low` / `Med` / `High Risk`, ou `—` si pas encore scanné.
4. **Confirm** avant écriture.

Le flow **dégrade en installation directe** hors TTY ou avec `--yes` : c'est le chemin qu'empruntent les scripts et la CI, sans interaction. Une garde anti path-traversal s'applique à toute écriture — un `script_path` ne peut jamais sortir de la racine cible.

## La colonne Snyk — sécurité sans friction pour l'utilisateur final

Le scan Snyk tourne **côté CI**, pas côté client :

- `.claude/scan-snyk.mjs` + workflow `snyk-scan.yml`, authentifiés par `SNYK_TOKEN`.
- Les verdicts sont écrits dans `registry/registry.json` sous `implementation.security.snyk`.
- L'API `/api/hooks` les sert au CLI, qui les affiche.

**L'utilisateur final n'a jamais besoin d'un token Snyk.** La sécurité est intégrée à la livraison, pas laissée comme exercice au lecteur.

## Flags synthèse

| Flag | Rôle |
|---|---|
| `--hooks=<slugs>` | Contrat avec le site — liste des slugs à installer |
| `--global` / `-g` | Scope `~/.claude` (tous les projets) |
| `--scope=project\|global` | Choix explicite du scope Claude Code |
| `--copilot` | GitHub Copilot (chemins relatifs) |
| `--codex-project` | OpenAI Codex, committé avec le repo |
| `--codex-profile` | OpenAI Codex, pour tous les projets |
| `--yes` / `-y` | Installation non-interactive (scripts, CI) |

## Côté site — le `HookConfigurator`

Le site tient la promesse *« configure en temps réel »* via `src/components/HookConfigurator.tsx` :

- Construit `pluginCmd` (la commande `npx`) à partir des slugs sélectionnés en temps réel.
- Une **bannière sticky** pulse à chaque sélection / désélection pour attirer l'attention sur la commande mise à jour.
- Trois boutons de copie coexistent :
  - **Copier la commande** (principal) — `npx hookstack-cli@latest install --hooks=...`
  - **Copier le settings.json** (secondaire) — pour inspection ou merge manuel
  - **Copier les scripts** — les `.mjs` individuels

La sélection est **persistée** dans `localStorage` (clé `hookstack-selection`) via Zustand — l'utilisateur peut fermer l'onglet et revenir à sa stack.

## La fusion intelligente — `mergeConfig.ts`

`src/lib/mergeConfig.ts` est le cerveau de la composition : il fusionne les fragments `implementation.config.hooks` de plusieurs hooks sélectionnés en un `settings.json` valide.

- **Regroupement par événement** — tous les `PreToolUse` se retrouvent sous la même clé.
- **Sous-regroupement par matcher** — les hooks partageant un matcher sont agrégés.
- **`collectScripts`** extrait les scripts associés.

Le CLI applique la même logique côté cible : il ne **jamais** écraser une config existante — il la fusionne. C'est ce qui rend l'installation non-destructive, même sur un projet qui a déjà des hooks maison.

## Concepts voisins

- [/product/hook-101.md](/product/hook-101.md) — la structure du `implementation.config` que ce CLI patche.
- [/product/features-catalog.md](/product/features-catalog.md) — le catalogue filtrable qui alimente le `HookConfigurator`.
- [/vision/mission.md](/vision/mission.md) — pourquoi ce livrable unique incarne la promesse *« in 1 minute »*.
- [/architecture/overview.md](/architecture/overview.md) — l'architecture du CLI dans `packages/cli/`.
