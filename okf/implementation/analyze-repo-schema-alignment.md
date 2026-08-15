---
type: Playbook
title: Skill /analyze-repo — alignement sur le schéma actuel du registre
description: Mise à jour du pipeline analyze-repo — suppression des champs morts (provider/i18n/community_examples), support des layouts de config non-.claude (hooks/hooks.json, hooks.json, .claude/hooks.json), remplacement de la Phase 6 (apply-best-practices) par sync-hooks.
tags: [implementation, analyze-repo, skill, registry, schema, sync-hooks]
timestamp: 2026-08-14T00:00:00Z
---

# Skill `/analyze-repo` — alignement sur le schéma actuel du registre

## Problème

Le pipeline `/analyze-repo` avait dérivé du schéma du registre (durci en #236 avec
`additionalProperties: false`) :

- `validate-hooks.js` exigeait `provider` (champ supprimé) et notifiait des overlays
  `i18n.en` (mécanisme i18n abandonné — registre canoniquement en anglais).
- `merge-hooks.js` injectait `community_examples` dans les entrées → entrées invalides
  au schéma (le champ n'existe plus ; la traçabilité vit dans `scanned-repos.json`).
- `fetch-hook-sources.sh` ne détectait que le layout `.claude/` : un dépôt au layout
  plugin (`hooks/hooks.json`, commandes `${CLAUDE_PLUGIN_ROOT}` — ex.
  `AgriciDaniel/claude-seo`) était déclaré `has_hooks: false` à tort.
- La Phase 6 (`apply-best-practices.js`) écrivait `settings.json` à la main, alors que
  `sync-hooks.mjs` reconstruit déjà `settings.json` depuis le registre (et seede les
  `.mjs` manquants) — doublon fonctionnel.

## Résolution

- **`fetch-hook-sources.sh`** : layouts candidats `.claude/settings.json`,
  `.claude/settings.local.json` (→ `hooks_local`), `.claude/hooks.json`, `hooks.json`,
  `hooks/hooks.json`. Scripts collectés : `.claude/hooks/*` (toujours) + `hooks/*` si
  `hooks/hooks.json` existe, filtrés par extensions code. Nouvelle clé `config_paths`
  en sortie (fichiers de config réellement trouvés). Retour arrière `mapfile` →
  boucle `read` (bash 3.2 macOS).
- **`validate-hooks.js`** : suppression des exigences `provider`/`i18n` ; checks
  alignés sur le schéma (pattern slug, `tags` non vide, `trigger` présent,
  `implementation.type === "settings_json"`, `script_path` en `.mjs`, benefit ≤ 90) ;
  enum `hook_type` aligné sur la liste du schéma (ajout PostCompact, WorktreeRemove,
  InstructionsLoaded).
- **`merge-hooks.js`** : plus de `community_examples` — déduplication par slug,
  slugs existants ignorés (log), nouveaux appendés.
- **`apply-best-practices.js` supprimé** : Phase 6 du skill = `node .claude/sync-hooks.mjs`
  (mécanique canonique, garde-fou CI `--check`). Permission `settings.json`
  correspondante remplacée par `fetch-hook-sources.sh` + scripts du skill + sync.
- **`SKILL.md`** : schéma d'entrée mis à jour (sans id/provider/i18n/community_examples/
  votes), langue anglaise canonique documentée, note sur les layouts non-`.claude`,
  launcher ≠ concept de hook, résumé et Phase 6 réécrits.

## Pourquoi pas garder apply-best-practices.js

`sync-hooks.mjs` fait tout ce que le script faisait (seeder les `.mjs` depuis
`code_snippet`, reconstruire `settings.json` depuis les `implementation.config`) et
c'est la mécanique vérifiée par la CI (`--check`). Tout écriture parallèle dans
`settings.json` serait écrasée au sync suivant — garder le script n'aurait créé que
de la confusion.

## Vérifications

- `fetch-hook-sources.sh` sur `AgriciDaniel/claude-seo` (plugin) → `has_hooks: true`,
  `hooks/run-python-hook.js` + `hooks/validate-schema.py` collectés ; sur
  `steve-magne/hookstack` (classique) → inchangé.
- Pipeline complet rejoué sur claude-seo : validation PASS (1/1), merge skip le slug
  déjà présent (déduplication vérifiée).
- `pnpm validate:registry` + `sync-hooks --check` PASS.
