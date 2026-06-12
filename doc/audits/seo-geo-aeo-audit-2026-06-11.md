# Audit SEO / GEO / AEO — hookstack.app

**Site audité :** https://www.hookstack.app/
**Date :** 2026-06-11
**Type :** Full Audit (crawl du site rendu + lecture du code source réel)
**Méthode :** analyse du HTML rendu (WebFetch) **et** des sources Next.js (`src/app/`, `registry/registry.json`, `public/`) — l'avantage du dogfood : chaque recommandation pointe le fichier exact à modifier.

> **Comment lire ce document.** Chaque recommandation (`R1`…`R14`) est autonome et conçue pour être implémentée par une session Claude Code future **sans contexte supplémentaire** : fichier(s) cible, changement exact (souvent le code complet), et **critère de vérification** déterministe. Implémenter dans l'ordre des priorités. Toujours terminer par `pnpm typecheck && pnpm build` puis `node .claude/sync-hooks.mjs --check`.

---

## Scores

| Dimension | Score | Statut |
|---|---|---|
| **SEO** (Search Engine Optimization) | 7 / 10 | On Track |
| **GEO** (Generative Engine Optimization) | 6 / 10 | Needs Work |
| **AEO** (Answer Engine Optimization) | 6 / 10 | Needs Work |
| **Combiné** | **19 / 30** | Base solide, corrections ciblées |

**Top 3 priorités :**
1. `sitemap.ts` publie `/contribute` qui **n'existe plus** (route et composant supprimés) → URL 404 dans le sitemap (R1).
2. `public/llm.txt` est **périmé et factuellement faux** (« 68 hooks » vs 86 réels, repo `hookit` au lieu de `hookstack`) — données qu'un moteur génératif citera telles quelles (R2).
3. **Aucune `og:image`** sur tout le site alors que la Twitter card est `summary_large_image` → aperçu cassé à chaque partage (R3).

**Plus grande force :** le catalogue des 86 hooks est **rendu côté serveur** (entièrement crawlable, pas de mur JavaScript) et la couche structurée est riche — 4 blocs JSON-LD sur la home (`WebSite` + `SearchAction`, `ItemList`, `SoftwareApplication`, `FAQPage`) et 2 sur chaque page hook (`SoftwareSourceCode`, `BreadcrumbList`).

---

## Pages auditées

| URL / route | Type | Constat |
|---|---|---|
| `/` (`src/app/page.tsx`) | Home — hero + catalogue + FAQ | 4 JSON-LD, canonical, OG/Twitter sans image, H1 sans mot-clé |
| `/hook/[slug]` (`src/app/hook/[slug]/page.tsx`) | Détail hook (×86, `generateStaticParams`) | 2 JSON-LD, canonical, **`benefit` non affiché**, contenu mince pour l'AEO |
| `/sitemap.xml` (`src/app/sitemap.ts`) | Sitemap dynamique | **Émet `/contribute` (404)** ; `lastModified` = `new Date()` partout |
| `/robots.txt` (`src/app/robots.ts`) | Robots | ✅ Bots IA autorisés (GPTBot, ClaudeBot, PerplexityBot) |
| `/llms.txt` (`src/app/llms.txt/route.ts`) | Profil IA dynamique | ✅ Correct, compte dynamique, regroupé par catégorie |
| `/llm.txt` (`public/llm.txt`) | Profil IA **statique** | ❌ Périmé (68 hooks, repo `hookit`), fait doublon avec `/llms.txt` |
| `/site.webmanifest` (`public/site.webmanifest`) | Manifest PWA | ❌ Boilerplate (« MyWebSite », thème blanc) |
| `/not-found` (`src/app/not-found.tsx`) | 404 | ✅ H1 présent, riche, liens de récupération |
| `/contribute` | — | ❌ **N'existe pas** (route + `ContributeForm.tsx` supprimés) mais référencé dans sitemap, `llm.txt`, `CLAUDE.md` |

---

## Analyse par dimension

### SEO — 7/10 (On Track)

| Signal | Constat | Statut |
|---|---|---|
| Title (home) | « HookStack — Agentic Hooks for Claude Code & Vibe Coding » (55 car., mot-clé en tête) | ✅ Bon |
| Meta description | 145 car., CTA « Install in one npx command » | ✅ Bon |
| Title template | `%s \| HookStack` sur les pages hook | ✅ Bon |
| Canonical | Auto-référençant sur `/` et `/hook/[slug]` | ✅ Bon |
| `robots` meta | `index: true, follow: true` partout, aucun `noindex` accidentel | ✅ Bon |
| Sitemap | Dynamique, priorités différenciées (`default_on` → 0.9) | ⚠️ Émet une URL 404 (`/contribute`) — R1 |
| H1 home | Unique, mais = slogan « Ship fast. / Break nothing. » → **0 mot-clé** | ⚠️ R9 |
| Hiérarchie Hn | Catalogue sans H2 à mot-clé ; FAQ en H2 OK | ⚠️ R9 |
| Rendu / crawlabilité | Catalogue **SSR** : 86 noms de hooks dans le HTML initial | ✅ Fort |
| Open Graph / Twitter | `og:*` + `twitter:summary_large_image` présents **mais sans image** | ❌ R3 |
| Manifest | Boilerplate non personnalisé | ❌ R4 |
| `theme-color` | Absent (pas de `viewport` export) | ⚠️ R10 |
| Performance (asset) | `public/favicon.svg` = **423 Ko** référencé en `<head>` | ⚠️ R11 |
| Asset orphelin | `public/demo-hookstack.gif` = 1 Mo, **aucune référence** dans `src/` | 🟢 R12 |
| GA4 | `G-TX6095K45G` chargé via `next/script` | ✅ Bon |

> **Hors périmètre HTML (à mesurer avec un outil dédié) :** Core Web Vitals / vitesse réelle → [pagespeed.web.dev](https://pagespeed.web.dev) ; profil de backlinks / autorité de domaine → Google Search Console + Ahrefs. La verification Google (`verification.google`) est en place, donc Search Console est connectable.

### GEO — 6/10 (Needs Work)

| Signal | Constat | Statut |
|---|---|---|
| Accès crawlers IA | `robots.ts` autorise explicitement GPTBot, ClaudeBot, PerplexityBot | ✅ Fort |
| `llms.txt` | Route dynamique correcte (`/llms.txt`) | ✅ Bon |
| Fichier IA concurrent | `/llm.txt` statique, **périmé et faux** (repo `hookit`, 68 hooks) | ❌ R2 |
| Schema entité | `WebSite`, `SoftwareApplication`, `SoftwareSourceCode` présents | ✅ Bon |
| **`Organization` + `sameAs`** | **Absent** — aucune déclaration d'entité de marque reliée à GitHub/npm/X | ❌ R5 |
| E-E-A-T / auteur | Pas de page À propos / auteur identifié / signaux d'autorité | ⚠️ R5 |
| Clarté de l'entité | « HookStack » nommé de façon cohérente partout | ✅ Bon |
| Densité factuelle | FAQ riche et précise ; pages hook minces pour la synthèse | ⚠️ R6/R7 |
| HTTPS | Oui, `metadataBase` en https | ✅ Bon |
| Cohérence inter-surfaces | `llm.txt` (68), site (86), README : **divergence des chiffres** | ❌ R2 |

### AEO — 6/10 (Needs Work)

| Signal | Constat | Statut |
|---|---|---|
| `FAQPage` schema | 7 Q&R, questions naturelles, réponses 40-90 mots | ✅ Fort |
| Patterns de définition | « An agentic hook is a Node.js script… » | ✅ Bon |
| `BreadcrumbList` | Sur chaque page hook | ✅ Bon |
| `HowTo` schema | **Absent** alors qu'un flow en 3 étapes existe (`howItWorksSteps`) | ⚠️ R8 |
| Réponse directe (pages hook) | Pas de paragraphe « What does X do? » ni de H2 interrogatif | ⚠️ R7 |
| `benefit` (phrase de valeur) | Présent sur 86/86 hooks mais **non rendu sur la page détail** | ❌ R6 |
| FAQ sur pages hook | Absente (FAQ uniquement sur la home) | 🟢 R14 |
| `Speakable` schema | Absent (faible priorité) | 🟢 (optionnel) |
| Langage conversationnel | FAQ excellente ; reste du site orienté slogan | ✅ Bon |

---

## Recommandations priorisées

| ID | Issue | Dimension | Effort | Impact | Priorité |
|---|---|---|---|---|---|
| R1 | Sitemap publie `/contribute` (404) | SEO | XS | Élevé | 🔴 Critical |
| R2 | `llm.txt` périmé + faux (repo, compte) | GEO | XS | Élevé | 🔴 Critical |
| R3 | Aucune `og:image` (cartes sociales cassées) | SEO/GEO | S | Élevé | 🟠 High |
| R4 | `site.webmanifest` boilerplate | SEO | XS | Moyen | 🟠 High |
| R5 | `Organization` JSON-LD + `sameAs` absent | GEO | S | Élevé | 🟠 High |
| R6 | `benefit` non affiché sur page hook | AEO/conv. | S | Moyen | 🟡 Medium |
| R7 | Pages hook : réponse directe + H2 interrogatif | AEO | M | Élevé | 🟡 Medium |
| R8 | `HowTo` JSON-LD pour l'install (home) | AEO | S | Moyen | 🟡 Medium |
| R9 | H2 catalogue à mot-clé (H1 sans mot-clé) | SEO | S | Moyen | 🟡 Medium |
| R10 | `viewport.themeColor` sombre | SEO | XS | Faible | 🟢 Quick win |
| R11 | `favicon.svg` 423 Ko → optimiser | SEO/perf | S | Moyen | 🟢 Quick win |
| R12 | Asset orphelin `demo-hookstack.gif` 1 Mo | perf | XS | Faible | 🟢 Quick win |
| R13 | `sitemap.lastModified` figé honnête | SEO | S | Faible | 🟢 Quick win |
| R14 | `FAQPage` par hook (dérivé des champs) | AEO | M | Moyen | 🟢 Quick win |

---

### 🔴 R1 — Retirer la route fantôme `/contribute` du sitemap

**Problème.** `src/app/contribute/` et `src/components/ContributeForm.tsx` ont été supprimés, mais `src/app/sitemap.ts:14-19` émet toujours `${BASE}/contribute`. Le sitemap déclare donc une URL qui renvoie un 404 → Search Console signalera « Submitted URL not found (404) » et le budget de crawl est gaspillé.

**Fichier :** `src/app/sitemap.ts`

**Changement.** Supprimer l'objet `/contribute` du tableau `staticPages` :

```ts
const staticPages: MetadataRoute.Sitemap = [
  {
    url: BASE,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  },
  // ← supprimer entièrement l'entrée { url: `${BASE}/contribute`, ... }
]
```

**Nettoyage associé (cohérence inter-surfaces, obligatoire) :**
- `public/llm.txt` : retirer les mentions de `/contribute` (lignes « Contribute » et la dernière ligne du Sitemap) — traité conjointement en R2.
- `CLAUDE.md` : la structure projet liste encore `contribute/` et `ContributeForm.tsx` ; retirer ces 2 lignes pour ne pas induire en erreur les sessions futures.

> **Alternative** si la page doit revenir : recréer `src/app/contribute/page.tsx` au lieu de retirer l'entrée. Décision par défaut = **retirer**, car le composant et la route ont été supprimés volontairement (seul le sitemap a été oublié).

**Vérification :**
```bash
pnpm build && grep -c "contribute" .next/server/app/sitemap.xml.body 2>/dev/null || \
  (pnpm dev & sleep 8 && curl -s localhost:3000/sitemap.xml | grep -c contribute)
# Attendu : 0
```

---

### 🔴 R2 — Supprimer le `public/llm.txt` périmé (conserver uniquement `/llms.txt`)

**Problème.** Deux fichiers de profil IA coexistent à deux URL :
- `/llms.txt` (route `src/app/llms.txt/route.ts`) — **dynamique et correct** : compte réel des hooks, liste à jour.
- `/llm.txt` (fichier statique `public/llm.txt`) — **périmé et faux** :
  - ligne 19 : « **68 hooks** » (le registre en compte **86**),
  - ligne 54 : `Source: https://github.com/steve-magne/hookit` (le repo réel est **`steve-magne/hookstack`**),
  - référence `/contribute` (route supprimée, cf. R1).

Un moteur génératif (Perplexity, ChatGPT Search) qui lit `/llm.txt` citera un compte faux et une URL de repo inexistante — atteinte directe à la confiance (GEO).

**Fichier :** `public/llm.txt`

**Changement (le plus sûr) :** **supprimer** `public/llm.txt`. Le standard de facto est `/llms.txt` (pluriel), déjà servi correctement par la route. Aucun lien interne ne pointe vers `/llm.txt`.

```bash
git rm public/llm.txt
```

**Option de robustesse (si on veut couvrir aussi l'ancienne URL) :** ajouter une redirection 308 `/llm.txt → /llms.txt` dans `next.config.ts` plutôt que de supprimer :

```ts
const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: '/llm.txt', destination: '/llms.txt', permanent: true }]
  },
}
```

**Amélioration complémentaire de la route `/llms.txt`** (recommandée) : ajouter le bon lien repo et les liens npm/CLI au bloc `## Links` de `src/app/llms.txt/route.ts` pour densifier l'entité :

```ts
## Links

- Catalogue: ${BASE}
- Source (GitHub): https://github.com/steve-magne/hookstack
- CLI (npm): https://www.npmjs.com/package/hookstack-cli
- Sitemap: ${BASE}/sitemap.xml
```

**Vérification :**
```bash
# Le fichier statique ne doit plus exposer de données fausses :
test ! -f public/llm.txt && echo "OK: llm.txt supprimé" || grep -E "68 hooks|hookit" public/llm.txt
# La route dynamique doit mentionner le bon repo :
pnpm dev & sleep 8 && curl -s localhost:3000/llms.txt | grep "steve-magne/hookstack"
```

---

### 🟠 R3 — Générer une `og:image` (cartes sociales + aperçus IA)

**Problème.** Aucune image Open Graph n'est définie (vérifié : aucun `images:` dans les `metadata`, aucun fichier `opengraph-image.*`). Or `src/app/page.tsx:23` déclare `twitter.card = 'summary_large_image'` → X/LinkedIn/Slack affichent une **grande carte vide**. Les aperçus IA et le CTR social en pâtissent sur **toutes** les pages.

**Solution la plus fiable (100 % autonome, aucun asset à dessiner) :** le fichier-convention Next.js `opengraph-image.tsx` génère l'image programmatiquement et **injecte automatiquement** `og:image`, `twitter:image` et leurs dimensions sur toutes les pages.

**Fichier à créer :** `src/app/opengraph-image.tsx`

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'HookStack — Agentic Hooks for Claude Code'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0b0b12 0%, #1a1635 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2 }}>HookStack</div>
        <div style={{ fontSize: 40, marginTop: 16, color: '#a5b4fc' }}>
          Agentic Hooks for Claude Code
        </div>
        <div style={{ fontSize: 28, marginTop: 32, color: '#a1a1aa' }}>
          Ship fast. Break nothing. — install in one npx command
        </div>
      </div>
    ),
    { ...size },
  )
}
```

**(Optionnel)** Pour des cartes par-hook spécifiques, ajouter `src/app/hook/[slug]/opengraph-image.tsx` sur le même modèle, en lisant `getHookBySlug(slug)` pour afficher `hook.name` + `hook.benefit`.

**Vérification :**
```bash
pnpm build && pnpm start & sleep 8
curl -s localhost:3000 | grep -o 'og:image[^>]*'        # doit apparaître
curl -sI localhost:3000/opengraph-image | grep "image/png"  # 200 + image/png
```
Puis valider visuellement sur https://www.opengraph.xyz/url/https%3A%2F%2Fwww.hookstack.app après déploiement.

---

### 🟠 R4 — Corriger `site.webmanifest` (actuellement le boilerplate par défaut)

**Problème.** `public/site.webmanifest` est resté le template générateur : `name: "MyWebSite"`, `short_name: "MySite"`, `theme_color: "#ffffff"`, `background_color: "#ffffff"` — incohérent avec une marque sombre, et nuit à l'installabilité PWA / aux signaux de marque.

**Fichier :** `public/site.webmanifest`

**Remplacer intégralement par :**

```json
{
  "name": "HookStack — Agentic Hooks for Claude Code",
  "short_name": "HookStack",
  "description": "Community catalogue of agentic hooks for Claude Code. Install a production-ready stack in one npx command.",
  "start_url": "/",
  "id": "/",
  "icons": [
    {
      "src": "/web-app-manifest-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/web-app-manifest-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "theme_color": "#0b0b12",
  "background_color": "#0b0b12",
  "display": "standalone",
  "categories": ["developer", "productivity", "utilities"]
}
```

**Vérification :**
```bash
node -e "const m=require('./public/site.webmanifest'); if(/MyWebSite|MySite/.test(JSON.stringify(m))||m.theme_color!=='#0b0b12') process.exit(1); console.log('manifest OK')"
```

---

### 🟠 R5 — Ajouter un JSON-LD `Organization` avec `sameAs` (graphe d'entité)

**Problème.** Le site déclare `WebSite`, `SoftwareApplication`, `SoftwareSourceCode` mais **aucune entité `Organization`** reliant la marque à ses profils externes. Les moteurs génératifs construisent leur graphe d'entité à partir de `sameAs` ; sans lui, « HookStack » reste un terme flou plutôt qu'une entité identifiée → moins de citations, E-E-A-T plus faible.

**Fichier :** `src/app/page.tsx` (ajouter un 5ᵉ bloc JSON-LD au même endroit que les autres)

**Changement.** Dans `HomePage`, ajouter l'objet puis son `<script>` :

```tsx
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'HookStack',
  url: BASE,
  logo: `${BASE}/web-app-manifest-512x512.png`,
  description: T.metaDescription,
  sameAs: [
    'https://github.com/steve-magne/hookstack',
    'https://www.npmjs.com/package/hookstack-cli',
  ],
}
```

```tsx
{/* à placer avec les autres <script> ld+json */}
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
```

> Si un compte X/Twitter de marque existe, l'ajouter au tableau `sameAs` (renforce encore le graphe). Sinon, laisser GitHub + npm.

**Vérification :**
```bash
pnpm build && pnpm start & sleep 8
curl -s localhost:3000 | grep -o '"@type":"Organization"'   # doit apparaître 1×
```
Valider ensuite sur https://validator.schema.org/ (coller l'URL après déploiement) — 0 erreur.

---

### 🟡 R6 — Afficher le `benefit` sur la page détail d'un hook

**Problème.** Chaque hook possède un `benefit` (phrase courte orientée résultat, présent sur **86/86**), héros des cartes du catalogue — mais la page `/hook/[slug]` ne l'affiche **pas**. C'est à la fois une perte de conversion et la **meilleure phrase de réponse directe** disponible pour l'AEO (résumé d'une ligne, idéal pour un featured snippet).

**Fichier :** `src/app/hook/[slug]/page.tsx`

**Changement.** Sous le `<h1>` (ligne 121) et avant la `description`, insérer le `benefit` en accroche :

```tsx
<h1 className="mb-3 text-3xl font-bold text-white">{hook.name}</h1>
{hook.benefit && (
  <p className="mb-3 text-lg font-medium text-[var(--color-brand)]">{hook.benefit}</p>
)}
<p className="mb-6 text-lg text-zinc-300">{hook.description}</p>
```

**Bonus AEO (gratuit) :** inclure `benefit` dans le JSON-LD `SoftwareSourceCode` (`description` enrichie) :

```tsx
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareSourceCode',
  name: hook.name,
  description: hook.benefit ? `${hook.benefit} — ${hook.description}` : hook.description,
  // …reste inchangé
}
```

**Vérification :**
```bash
pnpm typecheck && pnpm build
# choisir un slug réel et vérifier que le benefit est dans le HTML pré-rendu :
SLUG=$(node -e "const r=require('./registry/registry.json');const a=Array.isArray(r)?r:r.hooks;console.log(a[0].slug)")
grep -q "$(node -e "const r=require('./registry/registry.json');const a=Array.isArray(r)?r:r.hooks;console.log(a[0].benefit)")" .next/server/app/hook/$SLUG.html && echo "benefit rendu OK"
```

---

### 🟡 R7 — Pages hook : ajouter une réponse directe + un H2 interrogatif (AEO)

**Problème.** Les 86 pages `/hook/[slug]` sont les pages de longue traîne du site (« comment bloquer les secrets dans Claude Code », etc.) mais leur contenu est mince : H1 + description + puces. Aucun **H2 formulé en question** ni **paragraphe de réponse directe** — les deux ingrédients d'un featured snippet / d'une citation IA.

**Fichier :** `src/app/hook/[slug]/page.tsx`

**Changement.** Juste après le bloc badges (ligne ~119), insérer une section « réponse directe » templatée à partir des champs existants (aucune donnée nouvelle requise) :

```tsx
{/* HookDetailPage-answer — direct-answer block for AEO/snippets */}
<section data-component="HookDetailPage-answer" className="mb-6">
  <h2 className="mb-2 text-lg font-semibold text-white">
    What does the {hook.name} hook do?
  </h2>
  <p className="text-zinc-300">
    {hook.name} is a Claude Code <strong>{hook.hook_type}</strong> hook
    {hook.trigger && hook.trigger !== '*' ? ` (matcher: ${hook.trigger})` : ''}.{' '}
    {hook.benefit ? `${hook.benefit}. ` : ''}{hook.description}
  </p>
</section>
```

> Le `<h1>` reste `hook.name` (entité claire) ; ce H2 ajoute la formulation interrogative que les moteurs de réponse recherchent. Le paragraphe fait 1 à 3 phrases (≈ 40-60 mots), longueur idéale d'un snippet.

**Vérification :**
```bash
pnpm typecheck && pnpm build
SLUG=$(node -e "const r=require('./registry/registry.json');const a=Array.isArray(r)?r:r.hooks;console.log(a[0].slug)")
grep -q "What does the" .next/server/app/hook/$SLUG.html && echo "H2 interrogatif rendu OK"
```

---

### 🟡 R8 — Ajouter un JSON-LD `HowTo` pour le flow d'installation (home)

**Problème.** `T.howItWorksSteps` décrit un processus en 3 étapes (Browse → Select → Install) mais il n'est ni rendu en contenu structuré, ni marqué `HowTo`. Or « how to install Claude Code hooks » est une requête de réponse directe naturelle — un `HowTo` schema est éligible aux rich results et aux réponses vocales.

**Fichier :** `src/app/page.tsx`

**Changement.** Ajouter le bloc, alimenté par `T.howItWorksSteps` (déjà défini dans `src/lib/i18n.ts`) :

```tsx
const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to install Claude Code hooks with HookStack',
  description: T.metaDescription,
  step: T.howItWorksSteps.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.title,
    text: s.desc,
    url: `${BASE}/#catalogue`,
  })),
}
```

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
```

**Vérification :**
```bash
pnpm build && pnpm start & sleep 8
curl -s localhost:3000 | grep -o '"@type":"HowTo"'   # 1 occurrence
```

---

### 🟡 R9 — Donner au catalogue un H2 à mot-clé (le H1 n'en a aucun)

**Problème.** Le seul H1 de la home est le slogan rotatif « Ship fast. / Break nothing. » (`HeroRotatingTitle`) — délibéré côté design, mais **dépourvu de mot-clé cible**. La section catalogue (`page.tsx:124-127`) n'a pas de titre `<h2>` indexable ; elle n'expose qu'une petite légende `howItWorksTitle`.

**Ne pas toucher au H1** (choix artistique, cf. `DESIGN.md`). Ajouter à la place un **H2 à mot-clé** en tête de la section catalogue.

**Fichier :** `src/app/page.tsx` (section `CatalogueSection`, ligne 125)

**Changement :**

```tsx
<section data-component="CatalogueSection" id="catalogue" className="scroll-mt-20 pb-24">
  <h2 className="mb-6 text-center text-2xl font-bold text-white">
    Browse the Claude Code hooks catalogue
  </h2>
  <CatalogueExplorer />
</section>
```

> Variante si `CatalogueExplorer` rend déjà un titre : promouvoir ce titre interne en `<h2>` avec le libellé ci-dessus plutôt que d'en ajouter un second. Garder **un seul** H2 « catalogue ».

**Vérification :**
```bash
pnpm build
grep -q "Browse the Claude Code hooks catalogue" .next/server/app/index.html && echo "H2 catalogue OK"
# Vérifier qu'il n'y a toujours qu'un seul H1 :
grep -o "<h1" .next/server/app/index.html | wc -l   # attendu : 1
```

---

### 🟢 R10 — Déclarer un `themeColor` sombre

**Problème.** Aucun `<meta name="theme-color">` (pas d'export `viewport`). Sur mobile, la barre d'adresse n'adopte pas la couleur de marque.

**Fichier :** `src/app/layout.tsx`

**Changement.** Ajouter à côté de l'export `metadata` :

```tsx
import type { Metadata, Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: '#0b0b12',
}
```

**Vérification :**
```bash
pnpm build && pnpm start & sleep 8
curl -s localhost:3000 | grep -o 'theme-color[^>]*'   # doit apparaître
```

---

### 🟢 R11 — Optimiser `favicon.svg` (423 Ko)

**Problème.** `public/favicon.svg` pèse **423 Ko** et est référencé en `<head>` (`layout.tsx:32`). Un favicon SVG de cette taille est anormal (probablement un PNG embarqué en base64) — coût réseau inutile sur chaque page, pénalisant les Core Web Vitals.

**Fichier :** `public/favicon.svg` + éventuellement `src/app/layout.tsx`

**Changement (au choix, par ordre de préférence) :**
1. Remplacer `favicon.svg` par un vrai SVG vectoriel léger (< 5 Ko) du logo.
2. Si pas de source vectorielle disponible : **retirer** la ligne `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` de `layout.tsx:32` — les `favicon-96x96.png`, `favicon.ico` et `apple-touch-icon.png` (déjà déclarés et de taille normale) suffisent largement.

**Vérification :**
```bash
test $(stat -f%z public/favicon.svg 2>/dev/null || stat -c%s public/favicon.svg) -lt 20000 && echo "favicon léger OK" || echo "favicon toujours trop lourd — appliquer l'option 2"
```

---

### 🟢 R12 — Supprimer l'asset orphelin `demo-hookstack.gif` (1 Mo)

**Problème.** `public/demo-hookstack.gif` pèse **1 Mo** et n'est **référencé nulle part** dans `src/` (grep vide). Poids mort dans le bundle de déploiement.

**Changement.**
- Si le GIF n'est utilisé que dans le `README.md` GitHub : le **déplacer hors de `public/`** (ex. `doc/assets/`) pour ne pas le déployer, et mettre à jour le lien du README.
- S'il n'est utilisé nulle part : `git rm public/demo-hookstack.gif`.

**Vérification :**
```bash
grep -rn "demo-hookstack" src README.md packages 2>/dev/null
# si 0 hit dans src/ et que seul README l'utilise → déplacer ; sinon supprimer
```

---

### 🟢 R13 — Signaux de fraîcheur honnêtes dans le sitemap

**Problème.** `sitemap.ts` met `lastModified: new Date()` sur **toutes** les URL → à chaque build, toutes les pages paraissent « modifiées maintenant ». C'est un faux signal de fraîcheur ; les moteurs finissent par l'ignorer.

**Fichier :** `src/app/sitemap.ts`

**Changement.** Utiliser une date de build stable pour les pages statiques et, si le registre expose une date par hook (`updated_at`/`created_at`), l'utiliser pour les pages hook :

```ts
const BUILD_DATE = new Date()  // une seule fois par build

const hookPages: MetadataRoute.Sitemap = allHooks.map((hook) => ({
  url: `${BASE}/hook/${hook.slug}`,
  lastModified: hook.updated_at ? new Date(hook.updated_at) : BUILD_DATE,
  changeFrequency: 'monthly',
  priority: hook.default_on ? 0.9 : 0.7,
}))
```

> Si `registry.json` n'a pas de champ date, conserver `BUILD_DATE` partout : déjà mieux que 86 `new Date()` distincts, et ouvre la voie à de vraies dates si le champ est ajouté plus tard.

**Vérification :** `pnpm build` puis inspecter que les `<lastmod>` sont cohérents (une seule valeur, ou par-hook si `updated_at` existe).

---

### 🟢 R14 — `FAQPage` schema par hook (dérivé des champs existants)

**Problème.** La FAQ structurée n'existe que sur la home. Les pages hook pourraient exposer leur propre `FAQPage` généré à partir de `use_cases` / `benefit` — multipliant les surfaces éligibles aux People Also Ask sur la longue traîne.

**Fichier :** `src/app/hook/[slug]/page.tsx`

**Changement.** Ajouter un bloc FAQ minimal templaté (n'ajouter que si les champs existent, pour éviter un schema vide) :

```tsx
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: `What does the ${hook.name} hook do?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: hook.benefit ? `${hook.benefit}. ${hook.description}` : hook.description,
      },
    },
    {
      '@type': 'Question',
      name: `When does the ${hook.name} hook run?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: `It runs on the Claude Code ${hook.hook_type} event${
          hook.trigger && hook.trigger !== '*' ? ` for the ${hook.trigger} matcher` : ''
        }.`,
      },
    },
  ],
}
```

```tsx
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
```

> **Cohérence AEO :** si R7 est implémenté, le texte de la 1ʳᵉ question doit **correspondre** au H2 visible « What does the {name} hook do? » (le contenu visible doit refléter le schema, sinon risque de pénalité « structured data mismatch »).

**Vérification :**
```bash
pnpm build && pnpm start & sleep 8
SLUG=$(node -e "const r=require('./registry/registry.json');const a=Array.isArray(r)?r:r.hooks;console.log(a[0].slug)")
curl -s localhost:3000/hook/$SLUG | grep -o '"@type":"FAQPage"'   # 1 occurrence
```

---

## Ce qui fonctionne déjà bien (à préserver)

| Force | Preuve |
|---|---|
| Catalogue crawlable sans JS | Les 86 noms de hooks sont dans le HTML SSR (confirmé via fetch) |
| Données structurées riches | 4 JSON-LD home + 2 par page hook, types pertinents (`ItemList`, `SoftwareApplication`, `SoftwareSourceCode`, `BreadcrumbList`, `FAQPage`) |
| Accès explicite aux crawlers IA | `robots.ts` autorise GPTBot, ClaudeBot, PerplexityBot, Googlebot |
| Profil IA dynamique | `/llms.txt` route synchronisée avec le registre (compte + liste à jour) |
| Title & description | Longueurs optimales, mot-clé en tête, CTA présent |
| Canonical & métadonnées par page | `generateMetadata` propre sur les 86 pages hook, canonical auto-référençant |
| FAQ de qualité | 7 Q&R conversationnelles, réponses denses et factuelles (excellent socle AEO) |
| Verification Google en place | `verification.google` → Search Console connectable immédiatement |
| 404 soignée | `not-found.tsx` avec H1, diagnostics et liens de récupération |

---

## Ordre d'exécution conseillé

1. **Bloc « vérité factuelle » (30 min)** — R1 + R2 + R4 : corrige les données fausses/cassées exposées aux crawlers et aux moteurs IA. Plus haut ROI, effort minimal.
2. **Bloc « entité & partage » (1 h)** — R3 + R5 : rend le site citable (image) et identifiable (entité).
3. **Bloc « longue traîne AEO » (2 h)** — R6 + R7 + R8 (+ R14, R9) : transforme les 86 pages hook en surfaces de réponse.
4. **Quick wins perf/propreté** — R10 + R11 + R12 + R13 : à grouper en un commit.

**Garde-fou final après chaque bloc :**
```bash
pnpm typecheck && pnpm test && pnpm build && node .claude/sync-hooks.mjs --check
```

---

## Glossaire

- **SEO (Search Engine Optimization)** — optimisation pour les moteurs classiques (Google, Bing) : balises, structure, contenu, performance, indexabilité.
- **GEO (Generative Engine Optimization)** — optimisation pour les moteurs génératifs (ChatGPT Search, Perplexity, Google AI Overviews, Gemini) qui *synthétisent* une réponse en citant des sources : autorité, clarté de l'entité, densité factuelle, fichiers `llms.txt`, schema `Organization`.
- **AEO (Answer Engine Optimization)** — optimisation pour les *réponses directes* (featured snippets, People Also Ask, recherche vocale) : titres interrogatifs, paragraphes-réponses de 40-60 mots, schémas `FAQPage` / `HowTo`, langage conversationnel.

---

*Audit généré le 2026-06-11. Chaque recommandation est implémentable de façon autonome ; en cas de doute, le bloc « Vérification » de chaque item est le critère de succès faisant foi.*
