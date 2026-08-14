---
type: Playbook
title: Variantes Python des hooks — install language-aware
description: Chaque hook peut porter une variante .py (stdlib only + tests pytest) ; le CLI détecte la toolstack du projet et installe les bons scripts du bon langage — plus aucun vitest/npm sur un projet Python.
tags: [implementation, python, hooks, cli, registry, sync]
timestamp: 2026-08-13T00:00:00Z
---

# Variantes Python des hooks

## What

Sur un projet Python, `npx hookstack-cli@latest install` installait **tous** les hooks du set
par défaut en `.mjs` + tests vitest — forçant un CI GitHub Actions avec `npm` pour tester des
hooks. La feature corrige le besoin à la racine : chaque hook peut désormais porter une
**variante Python** dans le registre, et le CLI installe les bons scripts du bon langage selon
la toolstack détectée du projet.

Résultat sur un install Python par défaut : **58 hooks en `.py` (67 % du set), 0 test vitest**,
tests pytest uniquement — le CI de l'utilisateur reste 100 % Python.

## Why this shape

- **Le `.mjs` reste la source de vérité du code** (dogfood, tests vitest, timeline) ; la variante
  `.py` est un **miroir comportemental** du même contrat (`run()` + deps injectables). On ne
  bascule pas la machinerie entière (sync, CLI, fingerprint, timeline) sur Python : on l'étend.
- **Un hook universel n'est pas « npm » par nature** — c'est l'outil qu'il invoque qui l'est.
  Les hooks de logique pure (détection de secrets, gardes git, protection de chemins, injection
  de contexte…) fonctionnent à l'identique sur un projet Python : ils sont transcrits tels quels.
  Ce qui rendait un hook « npm » (biome, vitest, tsc) est traité par deux mécanismes : le champ
  `stack` (exclusion par écosystème) et le comportement **language-aware** (le même hook exécute
  `uv run ruff`/`pytest` côté Python, `tsc`/`biome` côté TS).
- **Jamais de vitest sur un projet Python** : le CLI écrit `tests/hooks/test_<slug>.py` (pytest)
  au lieu de `.test.mjs` — décision produit, pas un détail d'implémentation.

## Implementation

### Registre — 3 nouveaux champs (miroirs automatiques)

Chaque hook peut déclarer `implementation.python_script_path` → `.claude/hooks/<slug>.py`.
Les deux snippets `python_code_snippet` / `python_test_snippet` sont **dérivés** par le sync
(comme `code_snippet` l'est du `.mjs`) — jamais éditables à la main. Le schéma
`registry/registry.schema.json`, le type `Hook` (`src/types/hook.ts`) et la route API
`src/app/api/hooks/route.ts` ont été étendus en conséquence.

### Sync — `.claude/sync-hooks.mjs`

- Miroir `.py` → `python_code_snippet` (résolution via `python_script_path`, préfixe
  `.claude/hooks/` **obligatoire** — un chemin sans préfixe est silencieusement ignoré).
- Miroir `tests/hooks/test_<slug>.py` → `python_test_snippet` (résolution **par slug**, pas par
  nom de fichier — d'où des fichiers `test_<slug>.py` différents du nom du script, ex.
  `i18n-validation.py` → `test_stop-i18n-validation.py`).
- Injection du fingerprint `# @hookstack <slug>` en ligne 2 (après `#!/usr/bin/env python3`),
  comme pour les `.mjs`. `--check` couvre les deux familles.

### CLI — `packages/cli/bin/core.mjs` + `bin/cli`

- `detectToolstack` : `package.json`/`tsconfig.json` → TypeScript ; `pyproject.toml`/
  `requirements.txt`/`setup.py`/`setup.cfg`/`Pipfile`/`uv.lock`/`poetry.lock` → Python.
- `filterHooksByStack` : hooks universels (sans `stack`) toujours installés ; hooks stackés
  seulement si leur stack intersecte la détection. Flag `--stack=typescript|python|all`
  (`--language` en alias) pour surcharger.
- `collectIncomingHooks` : sur un projet Python, choisit la variante `.py` quand elle existe
  (commande `python3 $CLAUDE_PROJECT_DIR/.claude/hooks/<slug>.py`), sinon fallback `.mjs`
  (résumé d'installation explicite : « N Python · M .mjs fallback »).
- `doInstallTests` : écrit pytest (`tests/hooks/test_<slug>.py`) sur projet Python, **jamais**
  de vitest.
- `detectScriptChanges`/`findInstalledSlugs` : comparent la variante installée, reconnaissent
  les deux fingerprints (`//` et `# @hookstack`).
- `analyzeSecurity` : comprend les patterns Python (`subprocess`, `urllib`, `open(..., "w")`…).

### Pattern des variantes `.py`

stdlib uniquement, `#!/usr/bin/env python3`, même contrat que le `.mjs` : fonction pure
`run(...)` avec deps injectables par kwargs (jamais d'effet de bord dans la logique), garde
`if __name__ == "__main__":` qui lit stdin JSON, marshalle le résultat (stdout/stderr/exit code
selon le contrat). Toujours préférer `uv run <tool>` à l'appel direct (`ruff`, `pytest`,
`pyright`).

### Infra pytest dans le repo

`pytest.ini` + script `test:python` dans `package.json` + step `python3 -m pytest -q` dans
`.github/workflows/ci.yml`. Les tests de hook importent le script via
`importlib.util.spec_from_file_location` (aucun package à installer).

**Installer pytest dans le CI** : le runner `ubuntu-latest` n'a pas pytest, et son `python3`
système est « externally-managed » (PEP 668) — `pip install` direct échoue avec
`error: externally-managed-environment`. Le CI passe par `actions/setup-python` (Python non
géré, `pip install pytest` fonctionne) avant le run pytest.

## Pièges de transcription (capturés par les tests)

- **`os.path.join` Python réinitialise sur un composant absolu** — contrairement à `path.join`
  Node qui concatène et normalise. Corrigé dans `stop-dead-image-checker.py` (résolution
  `public/` des chemins absolus).
- **`re.match` est ancré en début de chaîne** — le `.mjs` utilisait `test()` (recherche
  globale) ; il faut `.search` (`stop-duplication-check.py`).
- **Deps par kwargs** : les tests passent les fakes en kwargs nommés, jamais dans l'input JSON ;
  un compteur interne passé par `**deps` non prévu lève une erreur (`pre-webfetch-html-to-markdown`).
- **Enregistrement des `python_script_path`** : oublier le préfixe `.claude/hooks/` fait passer
  le sync sans erreur mais sans miroir (décompte faux). Vérifier avec
  `node .claude/sync-hooks.mjs --check` + comptage des variantes complètes.

## Transcription — 58 hooks en 5 vagues

1. **Stack Python (6)** : `post-write-ruff-format`, `post-write-ruff-check`, `post-edit-pyright`,
   `stop-pytest`, `pre-bash-enforce-uv`, `setup-check-install-deps`.
2. **Language-aware (2)** : `stop-quality-check` (ruff + pyright via uv), `task-completed-test-gate`
   (gate pytest).
3. **Cœur universel (50)** : sécurité (secret detection, guards git, protection de chemins),
   contexte (git, agents.md, conventions, datetime, deps versions), audits/logs (tool failures,
   config, api errors, permission denied, audit session, compact), qualité (i18n, dead links,
   dead images, duplication, debug statements, conflict markers, missing tests), utilitaires
   (cleanup temp, reinject après compaction, redaction de secrets, file→markdown…).

## Reste à faire / hors scope

- **29 hooks encore en fallback `.mjs`** sur un install Python : majoritairement des mécanismes
  internes à Claude Code (TTS/sons, worktrees hookstack, permission auto-allow, OKF) — la
  prochaine vague pertinente : `stop-session-dedup-autodisable`, `session-start-worktree-if-main`,
  `worktree-remove-cleanup`, `cwd-changed-reload-direnv`, `user-prompt-llm-agent-name`.
- Les variantes `.py` n'ont pas de timeline dédiée (la timeline reste indexée sur les `.mjs`).
- Pas d'i18n, pas de changement de l'API publique du catalogue au-delà des 3 champs.

Voir [/architecture/cli-scopes](/architecture/cli-scopes.md) pour les 5 scopes d'installation
et [/implementation/okf-knowledge-bundle](/implementation/okf-knowledge-bundle.md) pour la
machinerie OKF elle-même.
