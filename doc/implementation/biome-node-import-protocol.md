# Activation de `useNodejsImportProtocol` (imports `node:*`)

## Contexte

[`biome.json`](../../biome.json) désactivait explicitement la règle `style.useNodejsImportProtocol` du preset `recommended`. Le projet utilisait donc des imports de modules natifs sans préfixe (`import { join } from 'path'`), alors que le standard Biome (et la convention Node.js moderne) impose `import { join } from 'node:path'`. Comparé à un autre projet utilisant le catalogue Hookstack, qui tourne avec la config par défaut de Biome, cette dérogation locale était une incohérence sans justification documentée.

## Choix technique

- Suppression de l'override (`biome.json`) : la règle revient à son état `recommended` (activée).
- Correction en masse via `biome lint . --write --unsafe` plutôt que des edits manuels — la règle a un fixer sûr, c'est exactement le cas d'usage de l'auto-fix Biome. 110 fichiers touchés (`.claude/hooks/*.mjs`, `packages/cli/bin/core.mjs`, `src/lib/*.ts`, tests, scripts).
- Propagation via `node .claude/sync-hooks.mjs` : les `.mjs` sous `.claude/hooks/` sont la source de vérité du `code_snippet` dans `registry/registry.json` — toute édition de hook doit être suivie du sync pour éviter une dérive détectée par `--check` en CI.

Pas de nouvelle règle custom ni de config supplémentaire (YAGNI) : on revient simplement au comportement par défaut du preset `recommended`.

## Vérification

`pnpm typecheck` (clean) + `pnpm test` (117 fichiers, 853 tests, tous verts) + `node .claude/sync-hooks.mjs --check` (registre synchrone) + `pnpm validate:registry` (schéma valide).
