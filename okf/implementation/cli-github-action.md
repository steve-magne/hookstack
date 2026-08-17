---
type: Playbook
title: CLI — option --github-action + mode full-check des hooks de gate
description: Le CLI propose désormais d'écrire une GitHub Action (.github/workflows/hookstack-gates.yml) qui rejoue les mêmes gates qualité/tests qu'en session agentique et en pre-commit. Pour que les hooks tournent en CI (arbre git propre), ils gagnent un mode HOOKSTACK_FULL_CHECK=1 (check complet).
tags: [implementation, cli, install, github-action, ci, quality, tests, hooks, ux]
timestamp: 2026-08-17T00:00:00Z
---

# CLI — option `--github-action` + full-check des hooks

## What

Troisième surface d'exécution des **mêmes gates** (après le `Stop` agentique et le
pre-commit manuel) : la CI. `--github-action` (ou le prompt interactif) écrit
`.github/workflows/hookstack-gates.yml` qui appelle les **hooks de gate déjà
installés** — `stop-quality-check`, `stop-run-tests`, `stop-pytest` — via les
mêmes `resolvePreCommitGates`.

Problème CI : sur un checkout GitHub Actions, l'arbre git est propre et
`origin/main` absent → le helper `lib/changed-files` retourne `[]`, et les hooks
court-circuitent (0 check). Pour que la CI lance *tout*, les trois hooks de gate
(+ leurs variantes Python) gagnent un mode explicite :

```
HOOKSTACK_FULL_CHECK=1 → changed = null → check complet (comme hors dépôt git)
```

Le workflow généré le pose en `env` de job. Il est toolstack-aware : projet Node
→ `actions/setup-node@v4` + install selon le lockfile (pnpm/yarn/bun/npm) ; projet
Python → `astral-sh/setup-uv@v5` + `uv sync` ; mixte → les deux. Déclencheurs :
`pull_request` + `push` sur `[main, master]`.

## Why this shape

- **Une source de vérité** : le workflow n'exécute que les scripts de hooks
  installés — pas de commandes `tsc`/`ruff`/`pytest` dupliquées. Une évolution
  d'un hook profite aux trois surfaces (session, commit, CI).
- **Full check plutôt que scope** : le scope « fichiers modifiés » (optimisation
  locale) n'a pas de sens sur un checkout CI propre, et le faire marcher en CI
  exigerait de fetcher la branche de base et de deviner son nom (`origin/main`
  hardcodé dans les hooks). `HOOKSTACK_FULL_CHECK` est déterministe : la CI
  vérifie tout, ce qui est le comportement attendu d'un filet de sécurité.
- **L'env var plutôt qu'un argument** : les gardes `node <script>` / `python3
  <script>` n'acceptent pas d'args et le pre-commit les invoque tels quels.
  `HOOKSTACK_FULL_CHECK=1` ne change rien à la signature `run()` ni aux tests
  existants (override de `changed` après les défauts, testable avec `vi.stubEnv`
  / `monkeypatch.setenv`).
- **YAML ≠ shell** : contrairement au pre-commit (append possible), un workflow
  est un document YAML unique. `mergeWorkflow` ne fait que created / replaced
  (marker en tête) / unchanged / **skipped** — jamais d'écrasement d'un workflow
  utilisateur, jamais d'append.
- **GitHub-hosted only** : le prompt n'apparaît que si `isGithubHosted`
  (dossier `.github/` ou remote `github.com`, réutilise `hasGithubSignal`).
  `--github-action` hors GitHub → avertissement et skip.

## Implementation

- Hooks (`.claude/hooks/`) : `stop-quality-check.mjs`, `run-tests.mjs`,
  `pytest.mjs`, `quality-check.py`, `pytest.py` — lecture de
  `HOOKSTACK_FULL_CHECK` au début de `run()`, override `changed = null`.
- `packages/cli/bin/core.mjs` :
  - `parseArgs` : flag `--github-action`.
  - `detectPackageManager(root, { existsSync })` (pnpm > bun > yarn > npm,
    install frozen-lockfile / `npm ci`).
  - `isGithubHosted(root, { readdirSync, readFileSync })` (wrapper de
    `hasGithubSignal`).
  - `buildWorkflowYaml(gates, { packageManager })` → YAML complet ;
    `WORKFLOW_MARKER` + `mergeWorkflow(existing, generated)` (created /
    replaced / unchanged / skipped).
- `packages/cli/bin/cli` :
  - `installGithubAction(hooks, pythonMode, log)` : gates → hébergement →
    package manager → `mergeWorkflow` → écrit dans `.github/workflows/`.
  - `interactiveInstall` : note listant les gates + `p.confirm`
    (`initialValue: false`, l'utilisateur valide) après le prompt pre-commit,
    gardé par `!isGlobalScope && isGithubHosted && gates.length > 0`.
  - `directInstall` : `--github-action` → `installGithubAction` + ligne de
    résumé ; avertissement scope global / non-GitHub.
  - `HELP` : ligne `--github-action`.
- Sync : `node .claude/sync-hooks.mjs` a miroité les `.mjs`/`.py` modifiés dans
  `code_snippet`/`python_code_snippet` (+ test snippets) du registre.
- Tests : hook-level (JS + Python, parité préservée via
  `check:python-parity`) et CLI-level (`tests/cli/core.test.mjs` :
  `detectPackageManager`, `isGithubHosted`, `buildWorkflowYaml`, `mergeWorkflow`,
  parseArgs).
- Docs : `packages/cli/README.md` (option + section « GitHub Action — same gates
  in CI » + étapes interactives + exemple CI), `README.md` racine (paragraphe
  « Same gates in your terminal »).

## Validation

- `pnpm test` : 1155 ✓ (127 fichiers) ; `pnpm vitest run tests/cli/core.test.mjs`
  : 223 ✓.
- `node scripts/check-python-coverage-parity.mjs --check` : 0 échec.
- `pnpm typecheck` · `pnpm validate:registry` ·
  `node .claude/sync-hooks.mjs --check` ✓.
- Smoke E2E (fonctions pures + repo git scratch) : hébergement détecté, workflow
  créé → re-run unchanged → workflow utilisateur « skipped » (non écrasé).

## Explicitly out of scope

- Pas de support husky/lefthook ni d'auto-commit du workflow (l'utilisateur
  committe `.github/workflows/` lui-même).
- `HOOKSTACK_FULL_CHECK` n'affecte que les 3 hooks de gate — les autres hooks
  `Stop`/`FileChanged` conservent leur scope « fichiers modifiés ».
- Pas de rafraîchissement automatique du workflow via `update` (comme le
  pre-commit : re-exécuter `install --github-action`).
