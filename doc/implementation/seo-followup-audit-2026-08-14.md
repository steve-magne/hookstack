# Implémentation — SEO follow-up audit (14 août 2026)

**Date** : 14 août 2026
**Contexte** : audit SEO de `https://www.hookstack.app/` (skill `/seo`), suite de l'audit du 11 juin (`doc/audits/seo-geo-aeo-audit-2026-06-11.md`). Vérification live + build local, puis implémentation des recommandations restantes.

---

## Vérifié OK sur le site live (R1–R9, R11, R13 déjà implémentées)

- Sitemap sans `/contribute`, `lastmod` stable (`SITE.contentUpdated`)
- `og:image` + `twitter:image` sur la home (`/opengraph-image`, 70 Ko PNG)
- JSON-LD : 7 blocs home (WebSite+SearchAction, ItemList, SoftwareApplication, FAQPage, Organization+sameAs, HowTo, WebPage+Speakable), 2+ par page hook (SoftwareSourceCode, BreadcrumbList), 3 par guide (TechArticle, FAQPage, BreadcrumbList)
- `benefit` rendu sous le H1 des pages hook + réponse directe H2 « What does the X hook do? »
- Manifest personnalisé, favicon 8,7 Ko, robots IA exhaustif, `/llms.txt` dynamique
- 1 seul H1 par page, hiérarchie Hn propre

## Problèmes constatés → fixes

| # | Problème | Fix |
|---|---|---|
| P1 | **`og:image` absente sur les pages hook ET guides** — la convention de fichier racine `src/app/opengraph-image.tsx` n'est **pas héritée** par les routes imbriquées qui exportent leur propre `openGraph` (vérifié : home OK, `/hook/*` et `/guides/*` sans image, build Next 16.3 local + site live) | Nouveau `src/app/hook/[slug]/opengraph-image.tsx` (carte par hook : nom + benefit + event), référence explicite dans `generateMetadata` des pages hook + `twitter:card: summary_large_image`. Constante `OG_IMAGE` dans `src/lib/site.ts`, référencée explicitement dans les metadata guides (index + `[slug]`) + twitter card |
| P2 | **`theme-color` absent** (R10 de l'audit juin) | `export const viewport` dans `src/app/layout.tsx` → `themeColor: "#0b0b12"` |
| P3 | **`FAQPage` absent sur les pages hook** (R14) | JSON-LD `FAQPage` (2 Q&R) sur `src/app/hook/[slug]/page.tsx`, questions alignées sur le H2 visible |
| P4 | **`WebSite` SearchAction cible `?q=` que rien ne lit** — structured data mensongère, pas de recherche profonde | `CatalogueExplorer` lit `?q=` au montage (client-side, `useEffect` + `URLSearchParams`) → l'URL `?q=` effectue réellement une recherche. **Choix : côté client uniquement** — lire `searchParams` serveur rendrait `/` dynamique (`ƒ` au lieu de `○`), et `useSearchParams` + Suspense perdrait le catalogue SSR |
| P5 | **`public/demo-hookstack.gif` 1 Mo orphelin** servi en prod (R12) | `git mv` → `doc/assets/` + mise à jour README, `scripts/coverage-badge.mjs` (ancre d'insertion) et son test |

## Leçon durable (Next.js)

> La convention de fichier `opengraph-image.tsx` d'un segment **ne s'applique pas** aux routes enfants qui exportent un objet `openGraph`/`twitter` dans `generateMetadata` — l'image est alors silencieusement omise. Tout nouveau type de page qui définit ses propres metadata doit référencer explicitement l'image (`openGraph.images` / `twitter.images`) via `OG_IMAGE`.

## Vérification

```bash
pnpm typecheck && pnpm test && pnpm build   # ✅ 1004 tests, `/` reste statique (○)
# HTML généré : theme-color, og:image hook (per-slug) + guides, FAQPage hook, twitter summary_large_image
curl -s localhost:PORT/hook/<slug>/opengraph-image   # 200 image/png
```
