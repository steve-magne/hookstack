# Bundle Update Log

Historique des changements du bundle OKF. Date la plus récente en haut.
Toute session qui enrichit le bundle ajoute une entrée ici (voir [self-improvement](meta/self-improvement.md)).

## 2026-08-05
* **Update**: [implementation/canonical-hook-filenames](implementation/canonical-hook-filenames.md) — PR #228 transformée en renommage canonique des 3 hooks (`biome-check.mjs` → `post-write-biome.mjs`, `quality-check.mjs` → `stop-quality-check.mjs`, `update-deps.mjs` → `worktree-create-update-deps.mjs`) : script_path + commandes config + tests + settings.json (sync) + artefacts timeline régénérés. Élimine les doublons de la PR contribute auto-générée et réaligne le dépôt sur la convention `<slug>.mjs`.
* **Update**: [implementation/cli-contribute-renamed-files](implementation/cli-contribute-renamed-files.md) — fix du `contribute` CLI qui échouait en ENOENT quand l'utilisateur renommait un hook `.mjs` installé (`post-write-biome.mjs` → `biome-check.mjs`) : `scanInstalledHooks` retourne `{ slug, file }` (le fingerprint est la source de vérité, pas le nom de fichier), `detectScriptChanges` accepte un override `fileBySlug`, et `pushContribution` copie depuis le fichier réel vers le nom canonique `<slug>.mjs` dans la PR.

## 2026-08-04
* **Update**: [product/features-catalog](product/features-catalog.md) — le mode **Event** du catalogue utilise désormais des sections façon Vercel `/eve` (`EventSections`, pin-and-scroll + filet de progression) ; le mode `Date` groupe par récence alimentée par les dates git de premier ajout. Le composant explicateur scroll-piloté `HooksFlow` a été retiré de la home (dead code nettoyé).

## 2026-06-30
* **Initialization**: Création du bundle OKF conforme à la spec v0.1 — structure `vision/`, `architecture/`, `product/`, `business/`, `marketing/`, `roadmap/`, `strategy/`, `implementation/`, `meta/`. Contenu seedé depuis `doc/product/` (personas, vision, valeur, hook-101, UX), `CLAUDE.md` (architecture, scopes CLI, sync registre, outillage Claude Code) et `README.md`.
* **Creation**: `meta/agent-protocol.md`, `meta/self-improvement.md`, `meta/porting.md` — protocole de consommation agent, mécanisme d'auto-bonification (test de relecture + staleness 14j), guide de portage.
* **Creation**: 3 hooks catalogue `session-start-okf-staleness` (SessionStart), `stop-okf-staleness-check` (Stop), `okf-validate-on-change` (FileChanged) — boucle d'auto-maintien du bundle. Documentés dans [implementation/okf-knowledge-bundle](implementation/okf-knowledge-bundle.md).
