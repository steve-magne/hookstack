---
type: Playbook
title: Helper commun « spawn env » — cache npm relocalisé pour les spawns sandboxés
description: Les hooks qui spawnt un gestionnaire de paquets (npx, npm, pnpm, yarn) mouraient en EPERM avant d'avoir lancé la moindre commande — npx écrit dans ~/.npm par défaut, inaccessible en écriture depuis une sandbox d'agent. Correction structurelle : module partagé lib/spawn-env.mjs (hookSpawnEnv) posant NPM_CONFIG_CACHE=<repo>/.npm-cache-tmp, appliqué aux 11 hooks concernés.
tags: [implementation, hooks, npm, sandbox, package-manager, tests]
timestamp: 2026-08-24T00:00:00Z
---

# Helper commun « spawn env » — cache npm relocalisé pour les spawns sandboxés

## What

Les hooks qui lancent un outil de l'écosystème npm (`npx --no-install tsc|biome`,
`pnpm test`, `npm ci`, `yarn install`…) échouaient en environnement d'exécution
sandboxé (spawn d'agent) avec :

```
npm error code EPERM
npm error path /Users/<me>/.npm/_cacache/tmp/***
npm error Your cache folder contains root-owned files…
```

Cause réelle : `npx` — même `--no-install`, qui ne fait que résoudre un binaire
local mais passe par la machinerie npm — et tout `npm exec`/`npm test` écrivent
dans `~/.npm` par défaut. Quand le home n'est pas accessible en écriture, la
commande meurt **avant** d'avoir lancé le moindre test : un gate vert passe pour
rouge. Le message « root-owned files » de npm n'est que sa supposition générique
devant un EPERM.

Second piège, découvert en dogfooding juste après : depuis une sandbox, pnpm
bascule son store sur `<cwd>/.pnpm-store` quand le store global n'est pas
inscriptible — divergent de celui enregistré dans `node_modules/.modules.yaml`.
Le check `verify-deps-before-run` de pnpm 11 juge alors les deps obsolètes et
lance un **`pnpm install` implicite au moindre `pnpm test`** : crash EPERM sur
ses fichiers temporaires (`_tmp_<pid>_<hash>` à la racine du repo) en CI-mode,
`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY` sinon. Fix : le helper pose aussi
`PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false`. ⚠️ pnpm 11 lit ses réglages via le
préfixe `PNPM_CONFIG_*`, PAS via `npm_config_*` (vérifié empiriquement :
`npm_config_verify_deps_before_run=false` est ignoré ; la forme CLI
`pnpm --config.verify-deps-before-run=false` fonctionne mais imposable à chaque
spawn générique `<manager> test`). Un hook n'a pas vocation à réinstaller des
dépendances — c'est le job de `setup-install-deps`.

Fix : helper partagé `hookSpawnEnv(projectDir)` (`.claude/hooks/lib/spawn-env.mjs`)
qui retourne `{ ...process.env, NPM_CONFIG_CACHE: <projectDir>/.npm-cache-tmp,
PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN: "false" }`.
Appliqué aux 11 hooks qui spawnt une commande de l'écosystème npm :
`run-tests`, `file-changed-run-tests`, `setup-install-deps`,
`worktree-create-update-deps`, `task-completed-test-gate`, `stop-quality-check`,
`typecheck` (post-edit-typecheck), `post-tool-batch-typecheck`,
`post-write-biome`, `per-file-lint`, `a11y-jsx-guard`.

## Why this shape

- **Invariant simple, pas de cas par cas** : « tout hook qui spawn npm/npx/pnpm/yarn
  pose `env: hookSpawnEnv(projectDir)` au lieu de `process.env` brut ». Les outils
  hors écosystème npm (`git`, `uv`, `pytest`, `go`) ignorent `NPM_CONFIG_CACHE` —
  l'env est donc sans risque partout.
- **Helper lib plutôt que 11 copies** : même logique que `lib/changed-files` —
  un seul module testé = un seul comportement ; livré aux côtés des hooks via
  `implementation.companion_files` (détection sync des imports `./lib/...`).
- **`.npm-cache-tmp/` est gitignoré** : cache éphémère et recréable, jamais
  commité.
- **Variantes Python non concernées** : les `.py` du catalogue ne spawnt que
  `uv`/`pytest`/`python3` (jamais npm) → pas de miroir `lib/spawn_env.py`
  (anti-over-doc).

## Implementation

### Helper `.claude/hooks/lib/spawn-env.mjs`

Fonction pure `hookSpawnEnv(projectDir)` : spread de `process.env` +
`NPM_CONFIG_CACHE: join(projectDir, ".npm-cache-tmp")`. Pas de shebang,
fingerprint `// @hookstack lib-spawn-env` ligne 1 (convention libs).

### Branchement dans les hooks

Trois shapes selon la structure existante :

1. **Exec déjà construit avec le bon répertoire** (`run-tests` : `runDir`;
   `setup-install-deps`, `stop-quality-check` : `cwd`/`projectDir`) →
   `env: { ...hookSpawnEnv(dir), CI: "true" }`.
2. **`defaultExec` au niveau module sans accès à `projectDir`**
   (`file-changed-run-tests`, `post-tool-batch-typecheck`, `post-write-biome`,
   `per-file-lint`, `a11y-jsx-guard`) →
   `process.env.CLAUDE_PROJECT_DIR ?? process.cwd()` résolu dans le default
   (même shape que la PR source cyber-harp#598).
3. **`defaultExec` transformé en factory** (`task-completed-test-gate` :
   `defaultExec(projectDir)` retournant `(cmd) => …`; `typecheck` avait déjà
   `makeDefaultExec`). ⚠️ Dans la déstructuration des deps, l'ordre compte :
   `projectDir` doit être déclaré **avant** `exec = defaultExec(projectDir)`
   pour que le défaut voie la valeur (fournie ou par défaut).

### Tests

- `tests/hooks/lib-spawn-env.test.mjs` (vitest, 3 cas) — le contrat du helper :
  NPM_CONFIG_CACHE posé, env courant préservé, `process.env` non muté.
- `tests/hooks/run-tests.test.mjs` : le fake `spawn` reçoit l'objet opts complet
  → assertion `NPM_CONFIG_CACHE` + `CI` sur l'env réellement passé.
- Pour les hooks dont l'exec injecté ne capte que `cmd` (biome/tsc…), l'env est
  appliqué dans le `defaultExec` interne : non observable via DI → couvert par
  le test du helper + dogfooding (ces hooks tournent sur ce repo à chaque
  session). Ne PAS changer la signature `exec(cmd)` en `exec(cmd, opts)` :
  casserait toutes les assertions `toHaveBeenCalledWith(cmd)` existantes.

## Pièges

- **pnpm 11 lit `PNPM_CONFIG_*`, pas `npm_config_*`** : les deux préfixes
  coexistent dans la doc npm-heritée mais seul le premier a été effectif pour
  `verify-deps-before-run` (testé : `npm_config_verify_deps_before_run=false`
  ignoré, `PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false` honoré).
- **Ne pas tester l'env via les fakes `exec`** : ils remplacent justement le
  `defaultExec` qui porte l'env. Seuls les fakes qui voient l'objet d'options
  complet (`spawn(cmd, args, opts)`) peuvent l'assertionner.
- **Ordre de déstructuration** (shape 3) : `{ exec = defaultExec(projectDir) }`
  placé avant `projectDir` lève un ReferenceError (TDZ) ou capte `undefined`.
- **Parité Python intacte** : aucun `it()` ajouté aux tests des deux hooks à
  double variante (`file-changed-run-tests`, `task-completed-test-gate`) — leur
  surface Python ne spawne pas npm, donc rien à miroiter.

## Source

Cherry-pick du pattern mergé sur cyber-harp
([PR steve-magne/cyber-harp#598](https://github.com/steve-magne/cyber-harp/pull/598),
« chore(hooks): relocalise le cache npm dans le repo pour les spawns sandboxés »)
— adapté à hookstack : helper déplacé dans `lib/` (convention modules partagés),
surface étendue aux hooks npx-only, variantes Python exclues après lecture du code.

Voir [/implementation/hooks-changed-files-helper](/implementation/hooks-changed-files-helper.md)
pour le pattern companion_files.
