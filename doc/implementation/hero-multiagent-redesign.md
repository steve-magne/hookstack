# Hero — Multi-agent redesign & single-line slogan

**Date :** 2026-06-13  
**Fichiers modifiés :**
- `src/components/HeroRotatingTitle.tsx`
- `src/lib/i18n.ts`
- `src/app/page.tsx`

---

## Contexte

Le hero affichait un bloc `CompatibilityStrip` ("WORKS WITH · Claude Code · OpenAI Codex · GitHub Copilot") séparé du reste, avec un label uppercase tracké + pills + caption. Triple redondance jugée trop lourde. Problème connexe : le slogan rotatif ("Ship fast. / Leak nothing.") était sur deux lignes via un `<br className="hidden sm:block" />` forcé.

---

## Décisions techniques

### 1. Suppression du CompatibilityStrip (page.tsx)

Le bloc entier (`data-component="CompatibilityStrip"`) est retiré de `page.tsx`. Les clés i18n associées (`worksWithLabel`, `worksWithAgents`, `worksWithCaption`) sont conservées dans `i18n.ts` pour ne pas casser un éventuel usage futur, mais ne sont plus référencées.

**Pourquoi :** le label uppercase tracké (`WORKS WITH`) est exactement le pattern anti-référencé dans PRODUCT.md ("tiny uppercase tracked eyebrow"). La triple couche (label + pills + caption) surchargeait la zone hero pour une information qui peut s'exprimer plus simplement.

### 2. Subtitle réécrit (i18n.ts)

Avant : `'Install a production-ready Claude Code HookStack in one command'`  
Après : `'Production-ready hooks for Claude Code, Codex & Copilot'`

**Pourquoi :** l'info multi-agent est absorbée directement dans la promesse principale plutôt que dans un bloc séparé. "— installed in one command" a été retiré : c'est une promesse UX déjà couverte par le `<h2>` "Up and running in 60 seconds" juste en dessous, et ce n'est pas un keyword de recherche — impact SEO nul. La phrase courte tient sur une ligne sans orphelin. "Claude Code" reste dans le subtitle pour le SEO. Le terme "agentic" a été écarté : trop générique, volume de recherche faible comparé à "Claude Code hooks".

### 3. Slogan sur une ligne (HeroRotatingTitle.tsx)

Changements :
- Suppression de `<br className="hidden sm:block" />` entre les deux `SplitFlap`
- `max-w-3xl` → `max-w-4xl` sur le `<h1>` (48rem → 56rem)

**Pourquoi du `<br>` :** il était intentionnel à l'origine pour forcer deux lignes distinctes sur desktop. La demande utilisateur est de les mettre sur une ligne.

**Pourquoi `max-w-4xl` :** à `text-6xl` (3.75rem = 60px) avec `tracking-tight`, le slogan le plus court ("Ship fast. Leak nothing.") dépasse légèrement 768px (max-w-3xl). Passer à 896px (max-w-4xl) absorbe les slogans courts et mi-longs sur une ligne. Les slogans plus longs ("Coverage enforced.", "Tests always run.") peuvent encore wrapper à deux lignes — `text-balance` gère la répartition proprement dans ce cas.

---

## Invariants préservés

- Le split-flap `eager` et sa logique de rotation restent inchangés.
- L'a11y (`useReducedMotion`, doublon `sr-only` dans SplitFlap) n'est pas touchée.
- Le SEO : "Claude Code" apparaît dans `<title>`, `<meta description>`, le subtitle, le `<h2>` du catalogue et les JSON-LD — la suppression du bloc CompatibilityStrip n'affecte pas le keyword density significatif.
