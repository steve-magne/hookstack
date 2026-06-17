# Hook stop-dead-image-checker + garde-fou CI liens/images

## Objectif

Compléter la couverture doc du hook existant `stop-dead-link-checker` : les images
`![alt](src)` dans les Markdown étaient déjà **exclues** du link-checker (regex
`(?<!!)`) mais **jamais vérifiées**. Ajout d'un hook symétrique + montée d'un script
CI qui rejoue les deux en mode exit-1 pour protéger `main`.

## Ce qui a été créé

| Fichier | Rôle |
|---|---|
| `.claude/hooks/stop-dead-image-checker.mjs` | Hook Stop — scanne tous les `.md`/`.mdx` pour les `![alt](src)` cassés |
| `tests/hooks/stop-dead-image-checker.test.mjs` | 12 tests unitaires (tous verts) |
| `scripts/ci-check-content.mjs` | Script CI qui importe les deux `run()` et fait `process.exit(1)` si dérive |
| `.github/workflows/ci.yml` | +1 step "Dead link & image check (full repo)" |

## Choix techniques notables

### 1. Symétrie exacte avec le link-checker

Le hook réutilise le même `walkMd()`, les mêmes `SKIP_DIRS`, le même pattern de DI
(`readFile`, `exists`, `readdir`, `projectDir`). La seule différence est la regex :
- link-checker : `(?<!!)\[([^\]]*)\]\(([^)]+)\)` — negative lookbehind sur `!`
- image-checker : `!\[([^\]]*)\]\(([^)]+)\)` — positive, `!` obligatoire

Cette symétrie garantit qu'aucun cas ne tombe dans un angle mort entre les deux hooks.

### 2. Résolution des chemins absolus depuis `public/`

Les images Markdown peuvent être référencées avec un chemin absolu au site (ex.
`![heatmap](/hooks-timeline.svg)`). En Next.js, ces assets vivent dans `public/`.
Le hook résout donc `/foo.png` → `<projectDir>/public/foo.png`, ce qui est la
convention universelle pour les sites statiques et Next.js.

Les chemins relatifs (`./img/foo.png`) sont résolus depuis le dossier du fichier MD,
identiquement au link-checker.

### 3. Script CI qui réutilise les `run()` des hooks

Plutôt que de dupliquer la logique en script autonome, `scripts/ci-check-content.mjs`
importe directement les fonctions `run()` exportées par les deux hooks. La même logique
tourne en session (hook Stop, non-bloquant → warning sur stderr) et en CI (exit 1).

Le fait que les hooks exportent `run()` avec des dépendances injectables était déjà
prévu pour les tests — le script CI en est un second bénéficiaire naturel.

### 4. Ce qui est intentionnellement ignoré

- **URLs externes** : pas de requêtes réseau (fiabilité CI, pas de dépendance à
  l'accès internet, faux positifs sur les sites derrière auth)
- **`data:` URIs** : inline, aucun fichier à vérifier
- **Ancres** (`#section`) : couvertes par le link-checker, hors périmètre images
- **Images dans les TSX/JSX** : périmètre élargi possible mais non demandé — le
  compilateur TypeScript attrape déjà les `import` d'assets manquants

## Tests

12 cas couvrant : aucun MD, aucune image, image relative OK, image relative cassée,
HTTP ignoré, data: ignoré, chemin absolu OK (via public/), chemin absolu cassé,
lien texte non capturé, scan complet .md+.mdx, skip dirs, multi-fichiers multi-images.

## Déploiement

```bash
node .claude/sync-hooks.mjs   # injecte @hookstack fingerprint + code_snippet
pnpm validate:registry         # 101 hooks conformes
pnpm test                      # 817/817
node scripts/ci-check-content.mjs  # 0 problème sur le repo courant
```
