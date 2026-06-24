# Suppression de la popover sur `HookTypeBadge`

## Contexte

Le badge `PreToolUse · Read` (et équivalents) dans `CatalogueExplorer`/`HookModal` affichait une popover au survol (`HookTypeBadge` dans [`src/components/Badge.tsx`](../../src/components/Badge.tsx)) qui dupliquait une explication déjà visible ailleurs (description du hook, modale de détail). Jugée inutile et bruyante en usage réel.

## Choix technique

Suppression pure : retrait du `span role="tooltip"` (et de son wrapper `group`/`relative`) dans `HookTypeBadge`, qui ne rend plus que le texte du badge (`type` + `trigger` optionnel). `HOOK_TYPE_INFO`/`HookType` ne sont plus importés dans ce fichier (toujours utilisés ailleurs, ex. `src/app/hook/[slug]/page.tsx`, donc conservés dans `src/types/hook.ts`).

Aucune autre logique modifiée — pas d'abstraction ajoutée, pas de prop nouvelle.

## Vérification

Preview lancé (`pnpm dev`), survol du badge confirmé sans popover ni erreur console.
