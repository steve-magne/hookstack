---
type: Playbook
title: CLI — détection intelligente de la toolstack à l'install
description: Le CLI analyse le projet (dossiers i18n/okf, package.json, remote git) et suggère ou auto-installe les hooks du catalogue qui correspondent aux systèmes réellement présents.
tags: [implementation, cli, install, autodetect, i18n, okf]
timestamp: 2026-08-12T00:00:00Z
---

# CLI smart toolstack detection

## What

`install` (par défaut, sans `--hooks=`) ne se contente plus du set
`default_on` : il probe le projet courant et propose (interactif) ou
auto-ajoute (`--yes`) les hooks du catalogue qui n'ont de sens que si un
système donné est présent — ex. un système de traduction i18n, ou un bundle
de connaissance OKF.

## Why this shape

Deux couches de détection coexistent, complémentaires :

- **Stack filter** (upstream, PR #231) : `detectStacks`/`filterHooksByStack`
  filtrent le set `default_on` par langage (typescript/python via manifestes)
  — un projet purement Python ne reçoit pas le hook Biome.
- **Contextual detection** (cette feature) : `detectProjectSignals`/
  `suggestHooksForSignals` **ajoutent** des hooks non-`default_on` pour les
  systèmes non-langagiers du projet (i18n, OKF, Next.js, front-end, GitHub).

Mêmes règles de scope pour les deux : install par défaut uniquement (un
`--hooks=` explicite est installé tel quel, jamais filtré ni enrichi),
scopes globaux exclus, `--no-detect` désactive les deux.

Deux options de design écartées :

- **Étendre le registre** (champ `requires`/`signals` par hook) : plus
  « source de vérité », mais touche `registry.schema.json`
  (`additionalProperties: false`), `src/types/hook.ts`, le sync, l'API et le
  front pour un gain marginal — le CLI est le seul consommateur de la
  détection. KISS : table statique dans `core.mjs`, comme `PREREQ_HINTS`.
- **Détection via métadonnées API** : l'API `/api/hooks` ne renvoie ni `tags`
  ni `stack` ; la table locale est triviale à tester et à étendre.

## Implementation

- `packages/cli/bin/core.mjs` :
  - `AUTO_DETECT` — table plate `signal → slugs`.
  - `detectProjectSignals(root, { readdirSync, readFileSync })` — pur, DI
    comme `findInstalledSlugs`. Signaux : `i18n` (marche récursive
    profondeur ≤ 5 sur les dossiers `locales?|messages?|i18n`, en sautant
    node_modules/.git/.next/…, OU package i18n dans package.json —
    liste exacte de noms : next-intl, react-i18next, i18next, react-intl,
    vue-i18n, @formatjs/intl, @lingui/*, …) ; `okf` (dossier racine
    `okf|OKF|.okf|.OKF` via readdir, pas existsSync — couvre la casse) ;
    `nextjs` (dép `next` ou `next.config.{js,mjs,cjs,ts}` racine) ;
    `frontend` (dép react/vue/svelte/astro/preact/solid-js/@angular/*) ;
    `github` (dossier `.github/` OU remote git `github.com` — gère les
    worktrees via le fichier `gitdir:`).
  - `suggestHooksForSignals(signals, selectedSlugs)` — mappe signaux → slugs,
    exclut déjà sélectionnés/installés, dédoublonne.
  - `SIGNAL_LABELS` — libellés humains des signaux (« an i18n/translation
    system », « an OKF knowledge bundle »…).
- `packages/cli/bin/cli` :
  - `detectContextualHooks({ isDefault, args, scope, dirs, hooks })` — helper
    partagé : garde `isDefault && !noDetect && !global`, détecte, exclut les
    slugs déjà installés (fingerprint `findInstalledSlugs`), fetch les hooks
    suggérés. Best-effort : probe ou fetch en échec → silencieux, jamais
    d'abort.
  - `interactiveInstall` : après le choix du scope, multiselect pré-coché
    (« Detected an i18n/translation system + an OKF knowledge bundle — add
    the matching hooks? »), puis enrichit `hooks` avant le panneau de résumé.
    Le multiselect affiche les **noms** des hooks (pas les slugs) avec le
    benefit en hint : clack ne montre le hint que sur l'option active, donc
    un label slug seul ne disait rien de l'utilité.
  - `directInstall` (`--yes`) : auto-ajoute et logge
    « ⚡ Detected a Next.js app + an OKF knowledge bundle — auto-added: … ».
  - `parseArgs` : aucun changement — upstream (#231) a déjà `--no-detect`
    (`noDetect`) pour le stack filter ; la contextual detection réutilise le
    même flag.
- Tests : `tests/cli/core.test.mjs` — `detectProjectSignals` (projet vide,
  locales racine, src/locales, package i18n, non-i18n ignoré, okf/OKF/.okf,
  i18n+okf combinés, node_modules ignoré, dossier illisible, nextjs dep et
  config, frontend dep, github via .github/ / .git/config / worktree gitdir,
  remote non-GitHub ignorée, cumul de 5 signaux) et `suggestHooksForSignals`
  (mapping de tous les signaux, exclusion des sélectionnés, signaux inconnus,
  dédoublonnage).
- Docs : `packages/cli/README.md` (section « Smart toolstack detection » +
  option `--no-detect`) et README racine (paragraphe dans Installation),
  conformément à la règle de cohérence des deux README.

## Update — test interactif réel (2026-08-12)

Parcours interactif piloté via PTY (script `pty_drive.py` : envoie une touche
quand la sortie est stable 0,6 s — le spinner de fetch anime la sortie, donc
les touches arrivent au bon prompt) sur un projet scratch cumulant Next.js +
React + next-intl + `okf/` + `.github/`.

Verdict : le flux fonctionne — scope → détection (multiselect pré-coché) →
résumé sécurité (8 hooks, dont les 7 détectés) → confirmation → install →
prompt tests unitaires. Deux défauts UX corrigés dans la foulée :

1. **Message cryptique** — « Detected i18n, okf » ne parle qu'aux initiés.
   Corrigé : `SIGNAL_LABELS` → « Detected a front-end codebase + a
   GitHub-hosted repo + an i18n/translation system + a Next.js app + an OKF
   knowledge bundle — add the matching hooks? ».
2. **Options illisibles** — seuls les slugs s'affichaient ; clack ne montre le
   hint (benefit) que sur l'option active. Corrigé : label = nom du hook
   (« Full i18n validation (Stop) », « GitHub context loader »…).

Couverture de la collection étendue de 2 à 5 signaux : `nextjs` →
`post-write-nextjs-quality`, `frontend` → `post-edit-visual-check`, `github`
→ `session-start-github-context` (les trois sont non-`default_on` et donc
inatteignables par le fast path sans cette détection).

## Explicitly out of scope (v1)

- Pas de signal « typescript »/« python » : déjà couverts par le stack filter
  upstream (#231) sur le set `default_on`.
- `motion-rules-guard` volontairement non détecté : garde trop opinée sur un
  langage d'animation maison, auto-installer un blocage serait du bruit.
- `file-changed-docs-consistency` non détecté : niche monorepo « surfaces
  produit » (marketing).
- Pas de champ registre pour piloter la détection (table statique CLI).
- Pas de détection pour `update`/`contribute` — uniquement `install`.
- Colonne `name` du panneau sécurité tronquée à 24 car. : comportement
  préexistant du panneau, hors périmètre détection.
