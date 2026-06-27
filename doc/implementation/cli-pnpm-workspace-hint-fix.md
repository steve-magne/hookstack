# Fix des hints d'installation de prérequis CLI (pnpm workspace)

## Contexte

Après `npx hookstack-cli@latest install`, le CLI affiche des hints pour les outils externes requis (`PREREQ_HINTS` dans [`packages/cli/bin/core.mjs`](../../packages/cli/bin/core.mjs)) — ex. `post-write-biome` → `pnpm add -D @biomejs/biome`. Dans un monorepo pnpm (workspace), cette commande échoue avec `ERR_PNPM_ADDING_TO_ROOT` car pnpm refuse d'ajouter une dépendance à la racine du workspace sans le flag `-w`.

Vérifié que `-w` n'est pas une solution universelle : le flag échoue lui-même (`--workspace-root may only be used inside a workspace`) en dehors d'un contexte workspace. Impossible de deviner l'environnement de l'utilisateur statiquement sans complexifier le CLI (détection `pnpm-workspace.yaml`, DI fs supplémentaire) pour un gain marginal.

## Choix technique

- **Hints** ([`core.mjs:266-270`](../../packages/cli/bin/core.mjs)) : ajout d'une note explicite `(pnpm workspace? add -w · or npm install ...)` plutôt que de figer une commande qui casse dans un cas sur deux.
- **UX warnings** ([`packages/cli/bin/cli`](../../packages/cli/bin/cli)) : les hints `Requires X` (bloquants) et `Optional` (cosmétiques) rendaient le même `⚠` jaune — ajout de `formatHint` qui distingue visuellement les deux (`⚠` jaune pour bloquant, `○` discret pour optionnel), réutilisé dans le panel interactif (`p.note`) et l'install directe (`console.warn`).

Pas de détection runtime ajoutée (YAGNI) : le texte suffit à éviter l'erreur sans complexifier `core.mjs` (qui reste pur, sans I/O).

## Vérification

`pnpm vitest run tests/cli/core.test.mjs` (62 tests, déjà existants, aucun nouveau test requis — pas de nouvelle branche logique testable, juste du texte et du formatage cosmétique) + `pnpm typecheck`.
