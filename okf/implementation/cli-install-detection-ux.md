---
type: Playbook
title: CLI install — audit détection + UX (toolchain inconnue, slugs écartés, hooks SEO Next.js-only)
description: Audit du CLI interactif à l'install : la détection de toolchain inconnue installait silencieusement tout le set default_on, les slugs écartés n'étaient pas listés, et 3 gardes SEO Next.js-only étaient proposées à tout projet TypeScript. Corrections + retours UX (spinner/log, spinner détection).
tags: [implementation, cli, install, detection, ux, seo, nextjs]
timestamp: 2026-08-14T00:00:00Z
---

# CLI install — audit détection + UX

## What

Audit du parcours `install` interactif (demandé : « le CLI détecte-t-il bien la
toolstack et propose-t-il les bons hooks ? »). Quatre problèmes corrigés :

1. **Toolchain inconnue = silence + tout le set `default_on`.** Un projet Go,
   Rust ou sans manifeste installait les 83 hooks par défaut *sans aucun
   message* — y compris les hooks Python (`stop-pytest`, `post-write-ruff-*`,
   `pre-bash-enforce-uv`) inutilisables. → Désormais : si la détection tourne
   (`detected: true`) et ne trouve aucune stack, seuls les hooks **universels**
   (sans champ `stack`) sont installés, avec un message explicite
   (« No TypeScript/Python toolchain detected — installing N universal hooks
   only … --stacks= ou --no-detect pour surcharger »).
2. **Slugs écartés invisibles.** Le filtre de stack annonçait un compte
   (« skipped 15 hooks ») sans dire lesquels. → En mode détection auto, le
   message liste désormais les slugs écartés
   (« Detected stack: typescript — skipped 5 hooks: post-write-ruff-format, … »).
   Un `--stack=` explicite garde le compte seul (l'utilisateur a choisi le
   filtre, la liste est du bruit).
3. **Hooks SEO Next.js-only proposés à tout projet TypeScript.** `seo-page-
   metadata-guard` (métadonnées `src/app/**/page.tsx`), `seo-next-image-guard`
   (`next/image`) et `stop-seo-structure-check` (`src/app` robots/sitemap)
   étaient `default_on: true` avec `stack: ["typescript"]` : un projet Vite ou
   Express recevait des gardes App Router inutiles. → `default_on: false` +
   rattachés au signal `nextjs` de `AUTO_DETECT` (avec
   `post-write-nextjs-quality`). Un projet Next.js les reçoit via le multiselect
   contextuel (interactif) ou l'auto-add (`--yes`) ; un projet TS non-Next ne
   les voit plus. `seo-heading-hierarchy-guard` (un seul `<h1>` par `.tsx`) et
   `a11y-jsx-guard` (JSX général) restent `default_on` — pas Next.js-spécifiques.
4. **UX : spinner/log en conflit + attente muette.**
   - `applyStackFilter` loggait via `p.log.info` *pendant* que le spinner de
     fetch animait → artefacts d'affichage. Les messages sont collectés puis
     émis après `spin.stop()`.
   - La détection contextuelle (`detectContextualHooks`) fait un probe fs + un
     fetch réseau sans aucun feedback. → spinner « Checking for project
     systems… » (seulement quand la détection va réellement tourner :
     install par défaut, pas `--no-detect`, scope non-global).
   - `resolveStacks` (détection fs) était recalculée 2-3× par flow
     (`applyStackFilter` + `purePythonStack`) → calculée une fois, passée en
     paramètre.

## Why this shape

- **`detectStacks` inchangé** : `package.json` → `typescript` reste le bon
  signal — dans ce registre, `typescript` signifie *écosystème node/JS/TS* (le
  hook `post-tool-batch-typecheck` se garde lui-même : il ne se déclenche que
  sur des fichiers `.tsx?` édités ; `post-write-biome`/`setup-install-deps`
  marchent sur JS). Une détection « content-aware » (typescript seulement si
  `tsconfig.json` ou dép `typescript`) a été testée puis **rejetée** : elle
  cassait les projets Next.js sans `tsconfig.json` committé (un Next par
  défaut est TS, mais le tsconfig est souvent généré au premier `next dev`),
  qui perdaient tout l'écosystème node. Le vrai trou était le cas *aucune
  stack* → traité par le point 1, pas par un raffinement du signal TS.
- **Décision registre ≠ décision CLI** : sortir les 3 hooks SEO du `default_on`
  a un effet site (ils ne sont plus pré-sélectionnés pour les visiteurs du
  catalogue) — c'est voulu : ils ne concernent qu'une minorité Next.js. Le
  pattern était déjà établi par `post-write-nextjs-quality` (non-`default_on`,
  atteint via le signal `nextjs`).
- `--stack=all` / `--no-detect` continuent d'installer le set complet (aucun
  filtrage) — le changement du point 1 ne s'applique qu'à la détection auto.

## Implementation

- `packages/cli/bin/core.mjs` :
  - `AUTO_DETECT.nextjs` : `["post-write-nextjs-quality",
    "seo-page-metadata-guard", "seo-next-image-guard",
    "stop-seo-structure-check"]`.
- `packages/cli/bin/cli` :
  - `resolveStacks(args)` calculé une fois ; `applyStackFilter(hooks,
    isDefault, stackFilter, log)` et `purePythonStack(stackFilter)` prennent le
    résultat.
  - `applyStackFilter` : branche « detected && stacks vide » → filtre
    universel-only (`!h.stack?.length`) + message ; branche « skipped > 0 » en
    détection auto → liste des slugs.
  - `interactiveInstall` : `filterNotes` collectées puis `p.log.info` après
    `spin.stop()` ; spinner « Checking for project systems… » autour de
    `detectContextualHooks` (garde `willDetect = isDefault && !noDetect &&
    !isGlobalScope`), stop avec « Detected … » quand `extra.length > 0`.
- `registry/registry.json` : `default_on: false` sur `seo-page-metadata-guard`,
  `seo-next-image-guard`, `stop-seo-structure-check` (métadonnées uniquement —
  `code_snippet` reste miroir des `.mjs`, intact).
- Tests : `tests/cli/core.test.mjs` — `suggestHooksForSignals(["nextjs"])`
  attend désormais les 4 slugs.
- Docs : README racine (Language-aware by default), `packages/cli/README.md`
  (Quick start + tableau Smart toolstack detection + étapes interactives),
  `CLAUDE.md` (install language-aware), `okf/architecture/cli-scopes.md`.

## Validation

- Tests unitaires : `pnpm test` (1004 ✓, dont 154 CLI).
- `pnpm typecheck` · `pnpm validate:registry` · `node .claude/sync-hooks.mjs
  --check` · `node .claude/hooks-timeline.mjs --check` ✓.
- E2E mode direct (`--yes`) contre une API locale servant le registre du
  worktree, 4 projets scratch :
  - TS (package.json + tsconfig) : « Detected stack: typescript — skipped 5
    hooks: post-write-ruff-format, … », 75 hooks (les 3 SEO ne sont plus dans
    le set).
  - JS-only (package.json sans typescript) : idem TS (écosystème node) — pas
    de régression.
  - Go : « No TypeScript/Python toolchain detected — installing 64 universal
    hooks only », plus aucun hook Python.
  - Next.js : set TS + « ⚡ Detected a front-end codebase + a Next.js app —
    auto-added: post-write-nextjs-quality, post-edit-visual-check,
    seo-page-metadata-guard, seo-next-image-guard, stop-seo-structure-check »
    (80 hooks).
- E2E interactif (PTY, `pty_drive.py` : raw mode + `TIOCSWINSZ` 120×24 —
  sans winsize, clack word-wrappe les frames à `stdout.columns` = 0 et chaque
  octet s'affiche sur sa propre ligne) : banner → « ◇ Selected 75 hooks » →
  « ● Detected stack: typescript — skipped 5 hooks: … » (note émise après
  l'arrêt du spinner) → scope (défaut This project) → summary sécurité →
  confirm → install → tests vitest → panneau « Resume installation » →
  « Done! ».

## Explicitly out of scope

- Pas de changement du signal `typescript`/`python` (le « node ecosystem »
  reste détecté par `package.json` seul, cf. Why this shape).
- Pas de suppression du flag `--stack` (alias singulier de `--stacks`,
  rétro-compat).
- Pas de détection pour `update`/`contribute`.
