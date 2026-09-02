---
type: Playbook
title: Nouveau hook stop-mobile-ui-test-gate — contribution généralisée depuis un projet consommateur
description: Ajout au catalogue d'un hook Stop qui bloque la fin de session quand un écran/composant React Native change sans son test de régression. Découvert déjà écrit (avec fingerprint @hookstack) dans un projet consommateur sans jamais avoir été poussé via `contribute` — généralisé (chemin monorepo en dur retiré) avant intégration.
tags: [implementation, hooks, catalogue, mobile, react-native, tests]
timestamp: 2026-09-02T00:00:00Z
---

# Nouveau hook stop-mobile-ui-test-gate

## What

`stop-mobile-ui-test-gate` rejoint le catalogue : gate `Stop` qui bloque la
fin de session si un écran (`src/screens/**/*.tsx`) ou composant
(`src/components/**/*.tsx`) React Native a changé sans que son test de
régression (convention plate `tests/screens|components/<Name>.test.tsx`) ait
lui aussi changé dans le même diff. `default_on: false`, `stack:
["typescript"]` — pas de signal `AUTO_DETECT` associé (pas de détection
`react-native`/`expo` dans le CLI aujourd'hui, cf. Explicitly out of scope).

## Origine — un hook contribué sans passer par `contribute`

Trouvé lors d'un audit `git status` d'un monorepo consommateur
(`apps/mobile` React Native + `apps/web`) : le fichier
`.claude/hooks/stop-mobile-ui-test-gate.mjs` portait déjà le fingerprint
`// @hookstack stop-mobile-ui-test-gate` en ligne 2, exactement comme un hook
catalogue — mais `git log --all` sur hookstack ne référence ce slug nulle
part. Conclusion : un hook écrit directement dans le projet consommateur, en
imitant la convention (probablement par une session Claude Code antérieure
outillée par `hook-author`/le CLAUDE.md de ce projet-là), jamais remonté par
`hookstack-cli contribute`. Cas différent de
[cli-contribute-renamed-files](cli-contribute-renamed-files.md) (qui traite
un hook déjà catalogué mais renommé localement) : ici le hook n'a jamais
existé côté catalogue.

## Résolution — généralisation avant intégration

Le code original codait en dur `apps/mobile/` (nom du package du monorepo
source) dans le pattern de détection ET dans le calcul du chemin de test
attendu — inutilisable tel quel pour un autre consommateur (repo simple sans
monorepo, ou monorepo avec un autre nom de package). Généralisé par capture
du préfixe avant `src/` :

```js
const UI_FILE_RE = /^(.*?)src\/(screens|components)\/.+\.tsx$/;
```

`apps/mobile/src/screens/Foo.tsx` → préfixe `apps/mobile/`, test attendu
`apps/mobile/tests/screens/Foo.test.tsx` (comportement identique à
l'original) ; `src/screens/Foo.tsx` (repo simple, sans monorepo) → préfixe
vide, test attendu `tests/screens/Foo.test.tsx`. Le test unitaire original
(`node:test`/`assert`, co-localisé dans le projet source) réécrit en style
catalogue (`vitest`, `describe`/`it`, `run()` + DI) sous
`tests/hooks/stop-mobile-ui-test-gate.test.mjs`, avec un cas dédié au repo
sans préfixe pour couvrir la généralisation.

## Why this shape

- Comportement inchangé pour le cas d'origine (monorepo `apps/mobile/`) —
  seule la portée s'élargit, aucune régression pour le projet qui l'a inventé.
- Pas de nouveau signal CLI : la détection `react-native`/`expo` n'existe pas
  aujourd'hui dans `packages/cli/bin/core.mjs` (`FRONTEND_PACKAGE_NAMES` ne
  couvre que le web) — ajouter un signal dédié pour un seul hook
  était hors du périmètre demandé (l'utilisateur voulait le hook + son test,
  pas une nouvelle détection). `default_on: false` le rend accessible via
  `--hooks=stop-mobile-ui-test-gate` ou un futur signal `react-native`.
- Message d'erreur enrichi : liste désormais le chemin de test *attendu* pour
  chaque fichier manquant (`expectedTest(file)`), pas seulement le fichier en
  faute — plus actionnable que l'original.

## Implementation

- `.claude/hooks/stop-mobile-ui-test-gate.mjs` — nouveau, pattern `run()` +
  DI (`exec`, `projectDir`), fingerprint en ligne 2.
- `tests/hooks/stop-mobile-ui-test-gate.test.mjs` — 8 cas (no-op sans dépôt
  git, bloque/laisse passer un screen, structure plate pour un composant
  niché, fichier hors périmètre, détection via untracked, repo sans
  préfixe monorepo, plusieurs fichiers manquants dans un seul message).
- `registry/registry.json` — entrée ajoutée manuellement (metadata) puis
  `node .claude/sync-hooks.mjs` pour peupler `code_snippet`/`test_snippet`
  depuis le disque et reconstruire `.claude/settings.json` (dogfoodé ici
  malgré `default_on: false` — le rebuild settings.json de ce repo inclut
  tout le catalogue sauf `EXCLUDED_STACKS`/`EXCLUDED_SLUGS`, cf.
  `.claude/sync-hooks.mjs`; sur hookstack il ne se déclenchera jamais, ce
  repo n'a pas de `src/screens/`).
- Docs : comptages régénérés via `pnpm readme:counts` (105→106 hooks,
  93→94 dogfoodés, TypeScript 18→19).

## Explicitly out of scope

- Pas de signal `react-native`/`expo` dans `AUTO_DETECT` — resterait à faire
  si ce hook (ou d'autres futurs hooks mobile) justifie une détection dédiée.
- Pas de portage Python (`.py`) — hook spécifique à un écosystème React
  Native/TypeScript, aucun équivalent Python pertinent.
