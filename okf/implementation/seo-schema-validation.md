---
type: Playbook
title: Hook seo-schema-validation — validation JSON-LD post-édition
description: Nouveau hook du catalogue (PostToolUse Write|Edit) validant les blocs JSON-LD schema.org des fichiers HTML-like — adapté de https://github.com/AgriciDaniel/claude-seo, réimplémenté en Node pur avec le pattern run()+DI+test.
tags: [implementation, hooks, seo, jsonld, schema, registry, analyze-repo]
timestamp: 2026-08-14T00:00:00Z
---

# Hook `seo-schema-validation` — validation JSON-LD post-édition

## Contexte

Analyse du dépôt communautaire `AgriciDaniel/claude-seo` (pipeline `/analyze-repo`).
Le dépôt n'utilise **pas** le layout `.claude/settings.json` : ses hooks vivent dans
`hooks/hooks.json` (racine, format plugin). Le script `fetch-hook-sources.sh` ne
détecte que `.claude/settings.json` / `.claude/settings.local.json` / `.claude/hooks/`
→ `has_hooks: false`. Décision : extraction manuelle des sources réelles du dépôt.

Un seul concept fonctionnel réutilisable : **validation post-édition des blocs
JSON-LD schema.org** (PostToolUse, matcher `Edit|Write`). Le second script du dépôt
(`run-python-hook.js`) est un launcher d'interpréteur Python (plomberie, pas un
concept de hook) → non extrait.

## Résolution

- **`.claude/hooks/seo-schema-validation.mjs`** : réimplémentation Node idiomatique
  (builtins only) du `validate-schema.py` original, au pattern `run()` + DI + garde :
  - Filtre par extension HTML-like (`.html/.htm/.jsx/.tsx/.vue/.svelte/.php/.ejs`),
    garde taille ≤ 10 Mo (stat injectable `getSize`, lecture injectable `readFile`).
  - Extrait les blocs `<script type="application/ld+json">` (regex `gis`).
  - Erreurs bloquantes (exit code 2, comme l'original) : texte placeholder
    (`[Business Name]`, `[Your…`, `REPLACE`…) et types schema.org dépréciés/retirés
    (HowTo, ClaimReview, VehicleListing…). Erreurs non bloquantes : JSON invalide,
    `@context` manquant/non schema.org, `@type` manquant.
  - Sémantique des blocs : chaque `<script>` = un bloc ; un tableau JSON-LD = N objets
    validés sous le **même** numéro de bloc (fidèle à l'original Python).
- **`tests/hooks/seo-schema-validation.test.mjs`** : 15 cas vitest (extensions,
  garde taille, illisible, bloc valide, JSON invalide, @context/@type, placeholder,
  types dépréciés/retirés, tableaux, mix warnings+critiques).
- **Registre** : entrée `seo-schema-validation` (anglais canonique, catégorie
  `validation`, PostToolUse `Write|Edit`, `benefit` orienté résultat). Appendu en fin
  de `registry.json` (le registre n'est pas trié ; `merge-hooks.js` append aussi).
- **`registry/scanned-repos.json`** : entrée `AgriciDaniel/claude-seo`
  (hooks_found 1, hooks_added 1, status success).
- **Sync** : fingerprint `// @hookstack seo-schema-validation` injecté ligne 2,
  `code_snippet`/`test_snippet` miroirs du disque, hook activé dans `.claude/settings.json`
  (dogfooding — PostToolUse Write|Edit passe de 12 à 13 hooks).

## Écarts pipeline (scripts `/analyze-repo` obsolètes — résolu)

Au moment de l'analyse, les scripts `validate-hooks.js` / `merge-hooks.js` /
`apply-best-practices.js` exigeaient encore `provider`, `i18n.en`,
`community_examples` — champs retirés du schéma (`additionalProperties: false`)
depuis #236. Les exécuter tels quels aurait injecté des entrées invalides →
contournement : entrée construite à la main au format schéma actuel, merge via
`jq`, validation par `pnpm validate:registry` (PASS) + `sync-hooks --check` (PASS).

Résolu ensuite par la mise à jour du pipeline (voir `analyze-repo-schema-alignment.md`) :
`provider`/`i18n`/`community_examples` supprimés des exigences, layouts non-`.claude`
(`hooks/hooks.json`…) supportés par `fetch-hook-sources.sh`, Phase 6 remplacée par
`node .claude/sync-hooks.mjs`, `apply-best-practices.js` supprimé.

## Suite

- `pnpm timeline` à lancer **après le commit** du `.mjs` (la timeline dérive de
  l'historique git : un fichier non commité n'a pas de date de premier ajout).
