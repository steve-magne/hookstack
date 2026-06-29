# Activation du formatter + assist Biome (alignement double quotes)

## Contexte

En important les hooks Hookstack dans un autre projet (cyber-harp), la CI cassait massivement : `biome.json` y désactive le formatter et l'assist (`organizeImports`) là où la plupart des consommateurs (dont cyber-harp) tournent avec les défauts Biome (double quotes, indentation tab, imports triés). Chaque `.mjs` copié depuis le catalogue arrivait donc en single quotes / imports non triés et faisait échouer le `biome check .` du projet cible.

## Choix techniques

1. **`biome.json`** : `formatter.enabled` et `assist.enabled` passent à `true` (avec `organizeImports: "on"`) au lieu d'être désactivés — retour aux défauts Biome plutôt qu'une config custom (YAGNI). Tout le repo est reformaté en conséquence (296 fichiers : `.claude/hooks/*.mjs`, `src/`, `tests/`).
2. **Exclusion des artefacts JSON régénérés** : `registry/registry.json`, `registry/hooks-timeline.json`, `registry/scanned-repos.json` et `.claude/settings.json` sont retirés du périmètre Biome (`files.includes`). Ces fichiers sont réécrits par des scripts internes (`sync-hooks.mjs`, `hooks-timeline.mjs`) en `JSON.stringify(_, null, 2)` (2 espaces) ; le formatter par défaut de Biome utilise des tabs, ce qui aurait créé un conflit permanent entre la régénération et `biome check --write` (faux positifs sur les garde-fous `--check` de la CI).
3. **Repositionnement de commentaires `biome-ignore`** : le formatter a éclaté plusieurs JSX multi-attributs sur plusieurs lignes (ex. `<script dangerouslySetInnerHTML={...} />`), déplaçant la ligne réellement fautive sous le commentaire `biome-ignore` qui ne couvre que *la ligne suivante*. Corrigé dans `about/page.tsx`, `evolution/page.tsx`, `guides/[slug]/page.tsx`, `guides/page.tsx`, `page.tsx` (`noDangerouslySetInnerHtml`), `guides/[slug]/page.tsx` (`noArrayIndexKey`) et `tests/cli/core.test.mjs` (`noTemplateCurlyInString`) en déplaçant chaque commentaire juste au-dessus de la ligne ciblée.
4. **Test fragile sur le style de quotes** : [`notFoundPage.test.ts`](../../tests/app/notFoundPage.test.ts) vérifiait littéralement `'use client'` dans le code source — mis à jour en `"use client"`.

Pas de nouvelle dépendance, pas de config de quote style explicite : on s'aligne sur le comportement par défaut de Biome, identique à celui des projets consommateurs.

## Vérification

`biome check .` → 0 diagnostic. `pnpm typecheck` → 0 erreur. `pnpm test` → 853/853 (+ test ajouté pour `src/lib/zip.ts`, jusqu'ici sans couverture, touché par le reformat). `pnpm build` → OK. `node .claude/sync-hooks.mjs --check`, `node .claude/hooks-timeline.mjs --check`, `pnpm validate:registry`, `node scripts/ci-check-content.mjs` → tous synchrones/valides.
