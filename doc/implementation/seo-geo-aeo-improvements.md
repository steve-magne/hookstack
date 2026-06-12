# Implémentation — Améliorations SEO / GEO / AEO

**Date** : 12 juin 2026
**Branche** : `feat/seo-geo-aeo-improvements`
**Contexte** : suite à l'audit SEO/GEO/AEO de `hookstack.app` (skill `/seo-geo-aeo`), implémentation de l'ensemble des recommandations pour maximiser le score on-page.

> **GEO** = Generative Engine Optimization (ChatGPT Search, Perplexity, Gemini, AI Overviews).
> **AEO** = Answer Engine Optimization (featured snippets, People-Also-Ask, recherche vocale).

---

## Scores de départ → projetés

| Dimension | Avant | Projeté | Levier principal |
|---|---|---|---|
| SEO | 8/10 | 9/10 | Profondeur de contenu, maillage interne, citations, `lastmod` stable |
| GEO | 7/10 | 9/10 | E-E-A-T (About + mainteneur nommé), preuve sociale, schémas enrichis |
| AEO | 8/10 | 9/10 | Table comparative HTML, Speakable, FAQ des guides |

*Projeté = effet attendu des leviers on-page ; le gain réel dépend du crawl, du temps et des signaux off-page.*

---

## Récapitulatif recommandation → implémentation

| # | Recommandation | Implémentation | Dim. |
|---|---|---|---|
| 1 | Couche E-E-A-T / About | Page **`/about`** (mission, mainteneur, MIT, contact) + schéma `AboutPage` + `Organization` + `founder` | GEO |
| 2 | Preuve sociale on-page | Bandeau hero (nb hooks, ★ GitHub **live**, MIT, « unit-tested ») + footer « Built & maintained by… » | GEO |
| 3 | Contenu long-format | **3 guides** (`/guides/[slug]`) + index `/guides`, schémas `TechArticle` + `FAQPage` + `BreadcrumbList` | SEO/GEO |
| 4 | Profondeur + citations | Paragraphe enrichi par page hook + bloc « Learn more » (doc Anthropic officielle + source GitHub) | SEO/GEO |
| 5 | Maillage interne | Section **« Related hooks »** (pages hook + guides) + nav header/footer | SEO |
| 6 | Table comparative | **`<table>` HTML réel** hooks vs slash-commands vs prompt instructions | AEO |
| 7 | Schémas enrichis | `SoftwareSourceCode` (author, maintainer, license, codeRepository, dates), `Organization` (founder, sameAs élargi), `authors`/`creator`/`publisher` | GEO/SEO |
| 8 | Cohérence des compteurs | Vérifié : tous dérivent de `allHooks.length` (l'écart 85/95 observé en live était un lag de déploiement) | SEO |
| 9 | `lastmod` stable | Sitemap basé sur `SITE.contentUpdated` (plus de timestamp de build) + dates « Reviewed » visibles | SEO |
| 10 | Speakable + voice | `SpeakableSpecification` sur la FAQ home ; *twitter:site* **omis** (aucun handle X réel dans le repo) | AEO |
| — | Backlinks + découverte IA | `llms.txt` enrichi (sections Guides + About) + liens Guides/About dans le README GitHub | GEO |

---

## Fichiers

### Nouveaux

| Fichier | Rôle |
|---|---|
| `src/lib/site.ts` | Source unique de l'entité de marque, du mainteneur (E-E-A-T), des références externes et de la date de contenu. Helper `hookSourceUrl()`. |
| `src/lib/guides.ts` | Contenu des 3 guides (sections, FAQ, sources, hooks liés) + `getGuideBySlug()`. |
| `src/app/about/page.tsx` | Page About (Server Component) + JSON-LD `AboutPage`/`Organization`/`founder` + `BreadcrumbList`. |
| `src/app/guides/page.tsx` | Index des guides + JSON-LD `ItemList` + `BreadcrumbList`. |
| `src/app/guides/[slug]/page.tsx` | Détail d'un guide + `TechArticle` + `FAQPage` + `BreadcrumbList` + hooks liés + sources. `generateStaticParams`. |
| `tests/lib/site.test.ts` | Tests de `hookSourceUrl` + invariants des constantes. |
| `tests/lib/guides.test.ts` | Tests de `getGuideBySlug` + intégrité des données (slugs uniques, liens hooks valides, dates ISO). |

### Modifiés

| Fichier | Changement |
|---|---|
| `src/app/page.tsx` | Home `async` + fetch live des ★ GitHub (revalidate 1 h, fallback gracieux), bandeau preuve sociale, table comparative, `Organization` enrichi, schéma `WebPage` + `SpeakableSpecification`, liens guides/about. |
| `src/app/hook/[slug]/page.tsx` | `SoftwareSourceCode` enrichi (author/maintainer/license/codeRepository/dates), réponse approfondie, bloc « Learn more » (citations), section « Related hooks ». Accès défensif à `HOOK_TYPE_INFO`. |
| `src/app/layout.tsx` | Métadonnées `authors`/`creator`/`publisher` ; footer enrichi (nav Catalogue/Guides/About/GitHub/npm + attribution mainteneur). |
| `src/components/Header.tsx` | Nav interne (Guides, About). |
| `src/app/sitemap.ts` | Ajout `/guides`, `/guides/[slug]`, `/about` ; `lastmod` stable. |
| `src/app/llms.txt/route.ts` | Sections **Guides** + **About** + liens. |
| `src/lib/i18n.ts` | Clés `navGuides`, `navAbout`, `compareTitle/Intro/Cols/Rows`, `guidesLinkText`. |
| `README.md` | Liens Guides + About dans la section Community. |

---

## Schémas JSON-LD ajoutés / enrichis

- **Home** : `WebPage` + `SpeakableSpecification` (nouveau) ; `Organization` enrichi (`founder` Person, `foundingDate`, `sameAs` élargi).
- **Page hook** : `SoftwareSourceCode` enrichi (`author`, `maintainer`, `license` MIT, `codeRepository`, `datePublished`, `dateModified`, `runtimePlatform`, `isAccessibleForFree`).
- **Page About** : `AboutPage` + `Organization` (`founder`) + `BreadcrumbList`.
- **Guides** : `ItemList` (index) ; `TechArticle` + `FAQPage` + `BreadcrumbList` (détail).

---

## Vérification

- `pnpm typecheck` ✅
- `pnpm build` ✅ — 99 routes pré-rendues (3 guides + 85 hooks SSG, `/about`, `/guides` statiques, home en ISR 1 h).
- Nouveaux tests ✅ — `tests/lib/site.test.ts` + `tests/lib/guides.test.ts` (15 tests). Le test sur `relatedHookSlugs` valide que **tous les liens internes guide→hook résolvent**.
- Présence des schémas/contenus confirmée dans le HTML pré-rendu (`.next/server/app/**`).

### Bug latent corrigé

Le build a révélé que `registry.json` contient des `hook_type` absents du type `HOOK_TYPE_INFO` (ex. `PostToolBatch`, `FileChanged`) — le nouveau code plantait dessus (`Cannot read properties of undefined (reading 'blocking')`). L'accès est devenu défensif (`HookTypeInfo | undefined` + garde). **Dette préexistante** : le type `HookType` mérite d'être resynchronisé avec les données du registre.

---

## Points à valider avant déploiement

- **Identité publique** : `/about` et les schémas affichent « Steve Magné » comme mainteneur (déjà semi-public via le repo). Adapter le nom/contact si besoin.
- **Compte X** : à ajouter dans `SAME_AS` (`src/lib/site.ts`) + `twitter.site` si un handle réel existe.
- **★ GitHub** : masqué si le fetch échoue (build hors-ligne) ; s'affiche en production.
