# Bundle Update Log

Historique des changements du bundle OKF. Date la plus récente en haut.
Toute session qui enrichit le bundle ajoute une entrée ici (voir [self-improvement](meta/self-improvement.md)).

## 2026-08-14
* **Update**: [implementation/python-hook-variants](implementation/python-hook-variants.md) — 22 variantes `.py` supplémentaires (TTS/sons, worktrees, permissions, vie de session) puis tri des 9 derniers fallbacks : 3 hooks taggés `stack: ["typescript"]` (`post-write-autoformat`, `session-start-node-version-check`, `stop-run-tests` dont la variante `.py` a été retirée — no-op sur Python, convention CLAUDE.md), 7 internes repo passés `default_on: false` explicite. Résultat : set d'install Python par défaut **66/66 en `.py` (100 %, zéro fallback `.mjs`)** ; 80/105 variantes au catalogue. Leçon : compter sur `default_on` (82 hooks), pas sur le catalogue complet.
* **Update**: [README](../README.md) + [CLI README](../packages/cli/README.md) + [doc/product/01-overview](../doc/product/01-overview.md) + `--help` CLI — wording aligné sur la réalité Python (66 hooks `.py`, 100 % sur install Python, pytest/vitest, fingerprint `# @hookstack`).
* **Creation**: [implementation/cli-install-detection-ux](implementation/cli-install-detection-ux.md) — audit du CLI install : toolchain inconnue (Go/Rust) → hooks universels seuls avec message explicite (avant : tout le set en silence) ; slugs écartés listés ; `seo-page-metadata-guard`/`seo-next-image-guard`/`stop-seo-structure-check` sortis du `default_on` et rattachés au signal `nextjs` ; notes de filtre émises après l'arrêt du spinner + spinner de détection contextuelle ; `resolveStacks` calculé une fois. E2E `--yes` (4 scénarios) + interactif PTY.
* **Update**: [architecture/cli-scopes](architecture/cli-scopes.md) — toolchain inconnue + hooks SEO Next.js-only hors default_on.

## 2026-08-13
* **Creation**: [implementation/python-hook-variants](implementation/python-hook-variants.md) — variantes Python des hooks (install language-aware) : chaque hook peut porter un `.py` stdlib-only + tests pytest, le CLI détecte la toolstack et n'installe plus jamais de vitest sur un projet Python. 58 hooks transcrits en 3 vagues (stack python, language-aware, cœur universel).
* **Update**: [architecture/cli-scopes](architecture/cli-scopes.md) — section install language-aware (`detectStacks`, `--stack`/`--stacks`, fallback `.mjs`).

## 2026-08-12
* **Creation**: [implementation/cli-smart-toolstack-detection](implementation/cli-smart-toolstack-detection.md) — le CLI `install` (par défaut) analyse la toolstack du projet (dossiers i18n/okf, package.json, remote git) et suggère/auto-installe les hooks non-`default_on` correspondants (`AUTO_DETECT` + `detectProjectSignals` dans `core.mjs`). Complète le stack filter upstream (#231) ; `--no-detect` commun désactive les deux.
* **Update**: test interactif PTY du parcours → libellés humains des signaux (`SIGNAL_LABELS`), noms des hooks dans le multiselect, 3 nouveaux signaux (`nextjs`, `frontend`, `github`) couvrant `post-write-nextjs-quality`, `post-edit-visual-check`, `session-start-github-context`.

## 2026-08-11
* **Update**: [product/features-catalog](product/features-catalog.md) — les trois modes de groupage du catalogue (**Event**, **Category**, **Recently added**) partagent désormais le même visuel en sections façon Vercel (`EventSections`) : colonne gauche sticky (sous-ligne, blurb, valeurs dominantes, filet de progression) + tuiles à droite. Le mode `Date` décrit sa fenêtre de récence dans la colonne gauche. La liste classique (`CatalogueExplorer-grouped-list`) a été supprimée (dead code).

## 2026-08-05
* **Creation**: [Badge de coverage du README](implementation/coverage-badge.md) — `scripts/coverage-badge.mjs` génère un badge SVG 4 métriques depuis `coverage-summary.json` et l'insère dans le README (bloc `COVERAGE_BADGE`), vérifié par la CI via `--check`.
* **Creation**: [Gate CI — couverture lignes ≥ 80 % par hook individuel](implementation/per-hook-coverage-gate.md) — `scripts/check-hook-coverage.mjs` bloque tout hook sous 80 % de couverture lignes (en plus du seuil agrégé vitest), avec liste d'exceptions auto-périmable pour 16 hooks hérités.
* **Update**: [CLI contribute](implementation/cli-contribute-command.md) — pousse désormais aussi les tests unitaires localement modifiés (`tests/hooks/`) avec leur hook (`detectTestChanges`, PR body listant les tests).
* **Update**: [Outillage Claude Code](architecture/claude-code-tooling.md) — le CI exécute les tests unitaires avec un gate de coverage (`pnpm test:coverage`, `@vitest/coverage-v8`) : lignes/statements/branches ≥ 80 %, fonctions ≥ 75 % ; `validate:registry` exige désormais un test unitaire pour chaque hook dogfoodé.
* **Update**: [implementation/canonical-hook-filenames](implementation/canonical-hook-filenames.md) — PR #228 transformée en renommage canonique des 3 hooks (`biome-check.mjs` → `post-write-biome.mjs`, `quality-check.mjs` → `stop-quality-check.mjs`, `update-deps.mjs` → `worktree-create-update-deps.mjs`) : script_path + commandes config + tests + settings.json (sync) + artefacts timeline régénérés. Élimine les doublons de la PR contribute auto-générée et réaligne le dépôt sur la convention `<slug>.mjs`.
* **Update**: [implementation/cli-contribute-renamed-files](implementation/cli-contribute-renamed-files.md) — fix du `contribute` CLI qui échouait en ENOENT quand l'utilisateur renommait un hook `.mjs` installé (`post-write-biome.mjs` → `biome-check.mjs`) : `scanInstalledHooks` retourne `{ slug, file }` (le fingerprint est la source de vérité, pas le nom de fichier), `detectScriptChanges` accepte un override `fileBySlug`, et `pushContribution` copie depuis le fichier réel vers le nom canonique `<slug>.mjs` dans la PR.

## 2026-08-04
* **Update**: [product/features-catalog](product/features-catalog.md) — le mode **Event** du catalogue utilise désormais des sections façon Vercel `/eve` (`EventSections`, pin-and-scroll + filet de progression) ; le mode `Date` groupe par récence alimentée par les dates git de premier ajout. Le composant explicateur scroll-piloté `HooksFlow` a été retiré de la home (dead code nettoyé).

## 2026-06-30
* **Initialization**: Création du bundle OKF conforme à la spec v0.1 — structure `vision/`, `architecture/`, `product/`, `business/`, `marketing/`, `roadmap/`, `strategy/`, `implementation/`, `meta/`. Contenu seedé depuis `doc/product/` (personas, vision, valeur, hook-101, UX), `CLAUDE.md` (architecture, scopes CLI, sync registre, outillage Claude Code) et `README.md`.
* **Creation**: `meta/agent-protocol.md`, `meta/self-improvement.md`, `meta/porting.md` — protocole de consommation agent, mécanisme d'auto-bonification (test de relecture + staleness 14j), guide de portage.
* **Creation**: 3 hooks catalogue `session-start-okf-staleness` (SessionStart), `stop-okf-staleness-check` (Stop), `okf-validate-on-change` (FileChanged) — boucle d'auto-maintien du bundle. Documentés dans [implementation/okf-knowledge-bundle](implementation/okf-knowledge-bundle.md).
