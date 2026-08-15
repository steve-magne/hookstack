---
type: Playbook
title: Helper commun « fichiers modifiés » — porcelain + commits locaux
description: Les hooks Stop décidaient de tourner en lisant uniquement `git status --porcelain` — après un commit/push en session, l'arbre propre les désactivait silencieusement. Correction structurelle : module partagé lib/changed-files (mjs + py) combinant porcelain et diff merge-base/origin-main, livré aux côtés des hooks via companion_files.
tags: [implementation, hooks, git, cli, registry, sync, tests]
timestamp: 2026-08-14T00:00:00Z
---

# Helper commun « fichiers modifiés » — porcelain + commits locaux

## What

Les hooks de fin de session (`stop-run-tests`, `stop-pytest`, `stop-quality-check`,
`stop-duplication-check`) décidaient de tourner en lisant **uniquement**
`git status --porcelain` (arbre de travail). Bug détecté en conditions réelles :
l'agent **committe puis pousse** ses fichiers avant la fin du tour → l'arbre de
travail redevient propre → « aucun fichier changé » → les 4 hooks se désactivent
**silencieusement**, sans jamais relancer pytest. Le test unitaire cassé partait
en CI sans avoir tourné localement.

Fix : un helper partagé combine les **deux** sources de fichiers modifiés —
l'arbre de travail (porcelain) **et** les commits déjà faits sur la branche depuis
le merge-base avec `origin/main` (`git diff --name-only <base> HEAD`), comme le
faisait déjà `missing-test-detection.mjs`. Les 4 hooks utilisent ce helper au lieu
de leur détection dupliquée et incomplète. Variantes **.mjs ET .py** couvertes.

## Why this shape

- **Un hook qui décide de tourner doit voir le travail « non livré »**, pas
  seulement l'arbre de travail : un commit local non poussé est exactement aussi
  « en attente de validation » qu'un fichier modifié. Le merge-base avec
  `origin/main` capture ce que la branche apporte et que `origin/main` ne connaît
  pas encore.
- **Helper commun plutôt que 4 copies** : c'était la duplication (avec des
  variantes incomplètes, ex. `defaultChanged` sans le diff merge-base) qui a
  permis au bug d'exister. Un seul module testé = un seul comportement.
- **`null` hors dépôt git** : les hooks conservent leur comportement historique
  (analyser quand même) — même sémantique que l'ancien `defaultChanged`.

## Implementation

### Helper `.claude/hooks/lib/changed-files.mjs` + `lib/changed_files.py`

Fonction pure `changedFiles({ exec, cwd })` (mjs) / `changed_files(*, exec_cmd, cwd)`
(py) :

1. `git status --porcelain` (staged + unstaged + untracked) — échec/`null` →
   retourne `null` (hors dépôt git).
2. `git merge-base origin/main HEAD` + `git rev-parse HEAD` ; si `base && base !==
   head` → `git diff --name-only <base> HEAD` (commits locaux). Toute commande git
   est tolérante (`""` si échec — ex. pas de `origin/main` → repli porcelain seul).
3. Union dédupliquée **triée**. Renames porcelain (`R  old -> new`) → cible.

Contrat d'exécution : `exec(cmd, { cwd })` (le 2e arg est ignoré par les execs
injectés simples). Le défaut exécute en `shell: true`, timeout 10 s, ne lève
jamais — les execs injectés qui lèvent (ex. `defaultExec` de
`stop-duplication-check`) sont captés par try/catch.

### Hooks refactorés

- `.mjs` : `run-tests.mjs`, `pytest.mjs`, `stop-quality-check.mjs`,
  `stop-duplication-check.mjs` — `defaultChanged` supprimé, `changed` par défaut =
  `changedFiles({ cwd: projectDir })` (ou `{ exec }` pour duplication-check).
- `.py` : `pytest.py`, `quality-check.py`, `stop-duplication-check.py` — import du
  helper via `sys.path.insert(0, str(Path(__file__).resolve().parent))` puis
  `from lib.changed_files import changed_files`. Le sentinel `_UNSET` de
  `stop-duplication-check.py` est conservé (distinction « non fourni » /
  « explicitement None »).

### Livraison catalogue : `implementation.companion_files`

Les hooks installés par le CLI sont des **fichiers uniques** : un `import ./lib/...`
ne résoudrait pas chez l'utilisateur. Le sync dérive donc
`implementation.companion_files` (`[{ path, snippet }]`) : scan des `.mjs`/`.py`
sur disque (regex `from "./lib/..."` et `from lib.xxx import`), résolution
**verrouillée sous `.claude/hooks/lib/`** (`path.resolve` + préfixe — un import
`./lib/../x` ne sort pas), contenu des fichiers miroité dans le registre (le
registre est le seul canal qui survit au déploiement — l'API Vercel ne peut pas
lire `.claude/` à chaud). Champ absent si aucun import (diff minimal).

Surfaces touchées : `registry.schema.json` (`implementation.companion_files`),
`src/types/hook.ts` (`CompanionFile`), route API `src/app/api/hooks/route.ts`
(pass-through), CLI `packages/cli/bin/cli` (`doInstall` écrit les companions à
côté du script, dédup par cible, `resolveScriptPath` gère les scopes Codex →
`.codex/hooks/lib/`), `packages/cli/bin/core.mjs` inchangé (les helpers
`resolveScriptPath`/`assertSafeTarget` existants suffisent). `--check` du sync
couvre la dérive companion_files.

### Tests

- `tests/hooks/lib-changed-files.test.mjs` (vitest, 11 cas) +
  `tests/hooks/test_lib_changed_files.py` (pytest, 8 cas) — incluent le scénario
  exact du bug : **worktree propre + commits non poussés → fichiers du diff
  merge-base**.
- Les tests existants des 4 hooks injectent déjà `changed` → non cassés.
- Bonus : le refactor a porté `pytest.mjs` à 100 % et `run-tests.mjs` à 90,7 % de
  couverture lignes → leurs exceptions ont été retirées de
  `scripts/check-hook-coverage.mjs` (EXCEPTIONS ne doit que décroître).

## Pièges

- **`relative()` est déjà relatif au repo** : ne pas re-préfixer avec
  `.claude/hooks/lib/` (le premier jet du sync produisait des chemins
  double-préfixés → `existsSync` échouait → le champ n'était jamais écrit).
- **Distinguer « arbre propre » de « hors git »** : l'exec par défaut retourne
  `""` sur échec — c'est le **throw** de `git status` (ou `null` injecté) qui
  signale « hors dépôt », pas la sortie vide.
- **Pas de fingerprint `@hookstack` ligne 2 dans les libs** (pas de shebang) :
  le marqueur est un commentaire ligne 1. `scanInstalledHooks` du CLI ne lit que
  les fichiers racines de `hooks/` → les libs dans `lib/` ne sont pas confondues
  avec des hooks installés.

## Reste à faire / hors scope

- `missing-test-detection.mjs/.py` et `per-file-coverage.mjs` gardent leur propre
  logique merge-base (déjà correcte) — une migration vers le helper est possible
  plus tard.
- `hookExports.collectScripts` (export de script d'installation autonome du site)
  n'inclut pas les companions — code mort aujourd'hui (aucun usage dans `src/`),
  à brancher si la feature est un jour activée.
- `contribute` du CLI ne pousse pas les libs — le PR de contribution d'un hook qui
  importe `lib/` doit inclure le fichier à la main.

Voir [/architecture/cli-scopes](/architecture/cli-scopes.md) pour les scopes
d'installation et [/implementation/python-hook-variants](/implementation/python-hook-variants.md)
pour le pattern des variantes `.py`.
