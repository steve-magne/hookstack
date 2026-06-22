# Guide : SEO & Accessibility Guardrails for Next.js with Hooks

**Issue** : [#151](https://github.com/steve-magne/hookstack/issues/151)  
**Fichier modifié** : `src/lib/guides.ts`  
**Slug** : `claude-code-seo-accessibility-nextjs-hooks`

---

## Contexte

Ce guide cible l'intersection `Next.js × SEO/a11y × hooks` — un cluster à zéro concurrence identifié dans le backlog de contenu Hookstack (issue #151). Les hooks concernés (`seo-page-metadata-guard`, `seo-heading-hierarchy-guard`, `seo-next-image-guard`, `a11y-jsx-guard`, `stop-seo-structure-check`, `post-write-nextjs-quality`) existaient déjà dans le registre mais n'avaient aucune page informationnelle pour les rendre découvrables en recherche organique.

---

## Décisions techniques

### Emplacement unique : `src/lib/guides.ts`

Tous les guides long-form vivent dans un seul tableau `guides` exporté. Le routing `/guides/[slug]`, le sitemap, `/llms.txt`, et les cross-links hook→guide sont générés automatiquement en mappant sur ce tableau — aucun fichier de route à créer.

### Structure de l'objet Guide

L'interface `Guide` impose :
- `intro: string[]` — 2 paragraphes d'accroche rendus sous le H1
- `sections: { heading; body: (string | {list} | {code})[] }[]` — corps structuré
- `faq: { q; a }[]` — exactement 4 entrées (JSON-LD FAQPage)
- `relatedHookSlugs` — slugs du registre (vérifiés avant commit)
- `related` — slugs d'autres guides (vérifiés avant commit)

### Contraintes de syntaxe TypeScript appliquées

**Apostrophes** : les strings de prose étant en quotes simples, toutes les contractions ont été évitées (« does not » plutôt que « doesn't ») pour ne pas briser la string sans recourir au caractère courbe U+2019.

**Blocs de code** : template literals avec double-échappement des backslashes (`\\s`, `\\/`, `\\.`) pour que les regex s'affichent correctement au rendu, et `\${var}` pour les interpolations à l'intérieur du code montré.

### Contenu des sections (7 sections + FAQ)

| # | Heading | Hook montré |
|---|---------|-------------|
| 1 | Why does an AI agent cause SEO and a11y regressions? | — (argumentaire) |
| 2 | How do you enforce title + description on every Next.js page? | `seo-page-metadata-guard` |
| 3 | How do you guarantee a single h1 per page? | `seo-heading-hierarchy-guard` |
| 4 | How do you block a raw `<img>` in favour of next/image? | `seo-next-image-guard` |
| 5 | How do you catch WCAG violations in the JSX? | `a11y-jsx-guard` (version statique simplifiée) |
| 6 | How do you prevent any SEO regression at end of session? | `stop-seo-structure-check` |
| 7 | How do you install the full SEO and a11y stack? | `npx hookstack-cli@latest install` |

Les blocs de code dans le guide sont des versions simplifiées des hooks réels — ils illustrent le pattern (fonction pure `run()` + garde d'entrée) sans inclure la complexité du parsing JSON (`--reporter=rdjson`) côté Biome. La logique complète reste dans `.claude/hooks/a11y-jsx-guard.mjs`.

### Maillage interne

- **Lien entrant** : ajout de `'claude-code-seo-accessibility-nextjs-hooks'` au champ `related` de `claude-code-hooks-examples` (seul guide existant qui couvre un cluster adjacent).
- **related** du nouveau guide : `automate-code-quality-claude-code-hooks`, `claude-code-hooks-examples`, `what-are-claude-code-hooks`.

### Validation pre-commit

Script fourni dans l'issue #151 lancé avant le commit :

```
OK — all refs resolve
```

`pnpm typecheck` et `pnpm build` passent. La page `/guides/claude-code-seo-accessibility-nextjs-hooks` renvoie 200 avec `<h1>` présent et JSON-LD `TechArticle + FAQPage + BreadcrumbList`.

---

## Ce qui n'a pas été modifié

- Aucun composant de route (`src/app/guides/`) — tout est câblé automatiquement.
- `registry/registry.json` — les hooks référencés existaient déjà.
- `/llms.txt`, `sitemap.xml` — générés dynamiquement, pas de fichier statique à mettre à jour.
