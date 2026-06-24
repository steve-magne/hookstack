# Nettoyage de la dette Biome

## Contexte

Le hook `quality-check.mjs` faisait échouer chaque session sur `biome lint --error-on-warnings .` (268 erreurs, 353 warnings, 635 infos). La quasi-totalité venait de `.claude/skills/impeccable/scripts/` — un skill tiers vendored (bundle minifié `modern-screenshot.umd.js` inclus), jamais maintenu par ce projet — et de `public/*.svg` (favicon, logo statiques, pas du JSX).

## Choix techniques

1. **Exclusion du skill tiers et des assets statiques** dans [`biome.json`](../../biome.json) : `"includes": ["**", "!.claude/skills/impeccable", "!public"]`. Pas notre code, pas notre responsabilité de lint.
2. **Fixes mécaniques sûrs** appliqués par règle (`--write --unsafe --only=<règle>`, diff relu après coup) : `style/useTemplate`, `complexity/useOptionalChain`, `correctness/noUnusedImports|noUnusedFunctionParameters|noUnusedVariables`. Tests (819→834) et `tsc --noEmit` revérifiés après chaque lot.
3. **`--write --unsafe` global rejeté** : une première passe sans filtre a silencieusement transformé `map.get(key)!` en `map.get(key)?.` (cassant le typage `Group.count: number`) et supprimé `groupBy` des deps d'un `useEffect` documenté comme volontaire (régression de comportement réelle, détectée via `tsc` puis `git diff`). Tout a été annulé et refait correctement : usage de `[...map.entries()]` pour éviter le `!` au lieu de l'autoriser, `biome-ignore` documenté sur le `useEffect` avec sa raison.
4. **`noDangerouslySetInnerHtml`** : pattern JSON-LD standard Next.js (`JSON.stringify` de données serveur, jamais d'input utilisateur) → `biome-ignore` justifié sur chaque occurrence plutôt que retrait de fonctionnalité.
5. **`noArrayIndexKey`** : clé réelle utilisée quand une valeur stable existait (`iso`, `uc`, `s` au lieu de l'index) ; `biome-ignore` documenté quand la liste est statique/décorative et ne se réordonne jamais (BEATS, dots de progression, split de texte fixe).
6. **a11y** : `type="button"` ajouté sur tous les `<button>` sans type explicite ; `role="img"` ajouté sur un `<span aria-label>` (rôle implicite manquant) ; `biome-ignore` sur deux faux positifs `useAnchorContent` (liens icône-seule déjà pourvus d'un `aria-label` valide, que la règle Biome ne reconnaît pas) et sur un `div role="button"` qui ne peut pas devenir un vrai `<button>` (contenu interactif imbriqué).
7. **`noAssignInExpressions`** : réécriture standard (assignation hors expression) dans `a11y-jsx-guard.mjs` et `llms.txt/route.ts`, sans changement de comportement.

## Vérification

`biome lint --error-on-warnings .` → 0 diagnostic. `tsc --noEmit` → 0 erreur. `vitest run` → 834/834. `node .claude/sync-hooks.mjs --check` et `node .claude/hooks-timeline.mjs --check` → synchrones. Preview navigateur : catalogue, filtres, boutons et chips fonctionnent sans erreur console.
