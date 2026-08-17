---
type: Playbook
title: CLI — option --pre-commit (mêmes gates qualité/tests en session agentique et en commit manuel)
description: Le CLI installe désormais (--pre-commit, ou prompt interactif) un git pre-commit qui rejoue les hooks Stop de qualité/tests déjà installés — mêmes checks en session agentique et en `git commit` manuel. Cross-OS (sh + fallback python3→python), toolstack-aware, et évolution sans écraser un pre-commit utilisateur.
tags: [implementation, cli, install, pre-commit, git, quality, tests, ux]
timestamp: 2026-08-17T00:00:00Z
---

# CLI — option `--pre-commit`

## What

Nouvelle option `--pre-commit` sur `install` (et prompt interactif équivalent) qui
écrit/fait évoluer `.git/hooks/pre-commit` pour rejouer **les hooks de qualité
déjà installés** — le même code exécuté en fin de session agentique (`Stop`),
ré-exécuté par un `git commit` manuel. Objectif produit : qu'un commit manuel
soit vérifié exactement comme une session Claude Code / Codex.

Les gates retenus (ordre quality → tests) sont les hooks du catalogue eux-mêmes,
jamais une logique dupliquée :

| Hook | Contenu | Installé sur |
|---|---|---|
| `stop-quality-check` | tsc/biome (`.mjs`) ou ruff/pyright via uv (`.py`) | toute stack |
| `stop-run-tests` | suite de tests node/go (`pnpm/npm/yarn/bun test`, `vitest --changed`/`jest --onlyChanged`, `go test ./...`) | node/TS, Go |
| `stop-pytest` | `uv run pytest` (`-n auto` si xdist) | Python |

Le script généré est un **POSIX sh** autonome : `git rev-parse --show-toplevel`
puis `cd` à la racine, résolution `python3` avec fallback `python` (Windows),
puis un `run_gate "<label>" <bin> "$ROOT/<script>"` par gate. Il **n'aborte pas
au premier échec** : il tourne tous les gates, affiche `✓`/`✗` par gate et
n'exite 1 qu'à la fin si au moins un gate a échoué (rapport « style CI »).

## Why this shape

- **Les gates SONT les hooks** : `stop-quality-check`/`run-tests`/`pytest`
  calculent déjà leurs fichiers modifiés via `lib/changed-files` (porcelain +
  merge-base) et exposent une garde `node <script>` / `python3 <script>` qui
  sort en 2 sur échec. Le pre-commit ne fait que les pointer — zéro duplication
  de commande, et une évolution du hook profite automatiquement aux deux
  contextes.
- **Pas de détection supplémentaire** : le filtrage de stack de `install`
  garantit déjà la cohérence. Un projet Python reçoit `stop-quality-check`
  (variante `.py`) + `stop-pytest` ; un projet TS reçoit la variante `.mjs` +
  `stop-run-tests` ; `stop-run-tests` (stack typescript) et `stop-pytest`
  (stack python) ne peuvent pas coexister sur un install auto. Les gates sont
  dérivés de la liste de hooks *effectivement installés*
  (`resolvePreCommitGates`), donc un `--hooks=` explicite sans gate → pas de
  pre-commit (return null, pas de fichier vide).
- **Évolution sans écraser** (`mergePreCommit`) :
  - absent/vide → `created` (script complet avec `# @hookstack pre-commit` en
    ligne 2) ;
  - déjà à nous (ligne 2 = marker exact) → `replaced` (ou `unchanged` si
    identique) ;
  - script utilisateur sans marker → **bloc ajouté** délimité par
    `# @hookstack pre-commit (start/end)`, logique utilisateur intacte ;
  - notre bloc déjà présent → seul le bloc est rafraîchi (le marker de bloc
    `(start)` ne doit **pas** matcher la détection « fichier à nous », sinon on
    écraserait le script utilisateur auquel on a ajouté — testé).
- **Cross-OS** : hooks exécutés par git dans sa propre shell (Git Bash sur
  Windows) → un script sh est portable ; `python3` absent → repli `python`
  (contrairement à `settings.json` qui garde `python3`, décision historique des
  commandes hooks, le pre-commit peut être plus tolérant).
- **Scope projet uniquement** : un git hook vit dans le repo, donc
  `--pre-commit` est ignoré (avec avertissement) sur `global`/`codex-profile`.

## Implementation

- `packages/cli/bin/core.mjs` :
  - `parseArgs` : flag `--pre-commit` → `args.preCommit`.
  - `PRE_COMMIT_GATE_LABELS`/`PRE_COMMIT_GATE_SLUGS` (ordre quality→tests) +
    markers `PRE_COMMIT_MARKER`/`PRE_COMMIT_BLOCK_START`/`PRE_COMMIT_BLOCK_END`.
  - `resolvePreCommitGates(hooks, { scope, python })` : réutilise
    `usePythonVariant` + `resolveScriptPath` (relocalisation `.codex/`).
  - `buildPreCommitScript(gates)` (fichier complet) / `buildPreCommitBlock`
    (bloc sans shebang) / `mergePreCommit(existing, { script, block })` →
    `{ content, mode }` (created/replaced/appended/unchanged).
- `packages/cli/bin/cli` :
  - `installPreCommit(hooks, scope, pythonMode, log)` : résout le dossier hooks
    via `git rev-parse --git-common-dir` (gère worktrees, comme
    `scripts/install-git-hooks.mjs` du repo), lit l'existant, merge, écrit +
    `chmod 0o755`. `null` si pas de gates ou pas un repo git.
  - `interactiveInstall` : après le prompt tests, note + `p.confirm`
    (`initialValue: true`) listant les gates ; `--pre-commit` court-circuite le
    prompt. Ligne de résumé `✓ git pre-commit created/updated/extended/up to date`.
  - `directInstall` : `--pre-commit` → `installPreCommit` + ligne de résumé ;
    avertissement si scope global.
  - `HELP` : ligne `--pre-commit`.
- Tests : `tests/cli/core.test.mjs` — parseArgs, `resolvePreCommitGates`
  (ordre, variante python, codex, script_path absent), `buildPreCommitScript`
  (shebang+marker, interpréteurs, fallback python, newline unique),
  `buildPreCommitBlock`, `mergePreCommit` (5 scénarios dont le piège
  marker-de-bloc ≠ marker-fichier).
- Docs : `packages/cli/README.md` (option + section « Git pre-commit — same
  gates as your agentic sessions » + étapes interactives + exemple CI),
  `README.md` racine (paragraphe « Same gates in your terminal »).

## Validation

- `pnpm vitest run tests/cli/core.test.mjs` — 198 ✓.
- Script généré validé par `sh -n` et exécuté dans un repo git scratch : deux
  gates (node ok / python exit 2) → sortie `✓`/`✗` correcte, exit 1 global.

## Explicitly out of scope

- Pas de pre-commit sur `update`/`contribute` (l'évolution se fait en
  ré-exécutant `install --pre-commit`, le marker permet le remplacement).
- Pas de support des frameworks tiers (husky/lefthook) : on écrit le hook git
  natif, sans dépendance.
