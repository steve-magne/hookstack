# Commande `update` du CLI

## Contexte

Un utilisateur installe des hooks via `npx hookstack-cli@latest install --hooks=...` puis, des semaines plus tard, veut récupérer les évolutions des scripts (fix, nouvelle option) sans se souvenir des slugs qu'il avait choisis. Le [README racine](../../README.md) annonçait déjà une section « Updating » avec `npx hookstack-cli@latest update`, mais la commande n'existait pas dans le code : `main()` rejetait tout token autre que `install` (`✗ Unknown command`). Les docs étaient en avance sur l'implémentation — ce travail comble l'écart.

Point de départ favorable : le CLI ne bundle aucune métadonnée. `fetchHooks()` ([`packages/cli/bin/cli`](../../packages/cli/bin/cli)) appelle toujours `https://hookstack.vercel.app/api/hooks` en live. Donc « mettre à jour » revient à : retrouver quels slugs sont installés, puis rejouer le même `doInstall` qu'à l'install (écrase le `.mjs`, fusion idempotente de `settings.json`/`hooks.json`).

## Choix techniques

- **Retrouver les slugs sans `--hooks`** : chaque `.mjs` posé par `install` porte déjà un fingerprint `// @hookstack <slug>` en ligne 2 (injecté par [`.claude/sync-hooks.mjs`](../../.claude/sync-hooks.mjs) côté registre). `findInstalledSlugs(hooksDir, { readdirSync, readFileSync })` ([`core.mjs`](../../packages/cli/bin/core.mjs)) scanne le dossier de scripts du scope ciblé et lit ce fingerprint via `extractFingerprint`. Pas de fichier d'état séparé à maintenir (pas de `.hookstack-lock.json`) — la source de vérité est déjà sur disque.
- **Détecter ce qui a changé** : `detectScriptChanges(hooks, scope, root, { readFileSync })` compare le `code_snippet` fraîchement fetché au contenu disque existant et classe chaque slug en `changed`/`unchanged`. Sert uniquement à l'affichage (« 3 hooks peuvent être mis à jour ») — `doInstall` réécrit de toute façon tous les fichiers fetchés, changé ou non, ce qui reste correct et idempotent.
- **`settings.json` non touché si rien n'a changé** : pas de logique dédiée nécessaire — `mergeHooks` est déjà idempotent (dédoublonnage par `command`), donc rejouer la fusion sur une config identique produit un fichier identique. Aucune nouvelle fonction requise pour cette garantie.
- **Tests** : `doUpdateTests(hooks, projectRoot, { existsSync, writeFileSync, join })` rafraîchit `tests/hooks/<slug>.test.mjs` uniquement si le fichier existe déjà (l'utilisateur avait dit oui à `--with-tests` lors de l'install). `update` ne crée jamais de nouveau fichier de test — créer en est la responsabilité d'`install`, pas de duplication de ce choix.
- **Réutilisation** : `update` réutilise `doInstall`, `resolveScopeRoot`, `SCOPE_LABELS`, `fetchHooks` tels quels. Le flux interactif/direct suit le même pattern que `interactiveInstall`/`directInstall` (spinner → fetch → confirm → écrit → panel de résultat) pour rester cohérent avec l'UX existante.

## Vérification

- `pnpm vitest run tests/cli/core.test.mjs` — 13 nouveaux tests (`extractFingerprint`, `findInstalledSlugs`, `detectScriptChanges`, `doUpdateTests`), 73/73 passent.
- `pnpm vitest run` (suite complète) — 848/848 tests passent, aucune régression.
- `pnpm typecheck` et `biome lint` sur les fichiers touchés — propres.
- Docs alignées : [`packages/cli/README.md`](../../packages/cli/README.md) (section « Updating » détaillée) et [`README.md`](../../README.md) (section « Updating » déjà présente, enrichie pour refléter le mécanisme du fingerprint et des scopes).
