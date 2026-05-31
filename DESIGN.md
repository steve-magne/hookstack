# DESIGN.md — Claude Hooks

Spec de direction artistique du site. Ce document définit **l'esprit** visuel et
le **langage de motion**. Toute évolution UI/animation doit s'y conformer — ou le
faire évoluer explicitement.

---

## 1. L'esprit

Le public, ce sont des **développeurs front-end**. Ils ne disent pas « wow »
devant un effet tape-à-l'œil — ils le disent devant **une physique juste, un
timing précis et une cohérence totale**.

> Le wow vient de la *retenue maîtrisée*, pas du nombre d'effets.

Conséquences directes :

- **Chaque animation justifie sa présence** : elle sert la compréhension (où va
  cet élément ?) ou le feedback (mon action a-t-elle été prise en compte ?).
  Jamais la décoration pure.
- **Un seul langage** : toute la grammaire vit dans `src/lib/motion.ts`. Rien
  n'invente sa propre physique localement. C'est ce qui produit la signature.
- **Le contenu reste instantané** : pas de transitions de page lourdes, pas de
  gating du contenu derrière une animation.

## 2. Identité visuelle (existant)

- **Thème** : dark sobre. `--color-bg #0a0a0a`, surfaces `#141414` / `#1c1c1c`,
  bordures `#2e2e2e`. Texte `#f0f0f0` / muted `#909090`.
- **Accent** : dégradé indigo→violet (réservé au highlight du hero et aux
  signaux `is_must`). Le reste du site est neutre (blanc/zinc) — l'accent garde
  sa valeur parce qu'il est rare.
- **Halo** : un radial-gradient blanc très faible en haut de page (`body::before`).
- **Formes** : coins arrondis généreux (`rounded-xl` / `rounded-2xl`),
  `ring-1 ring-inset` pour les surfaces, `divide-y` pour les listes.
- **Typo** : sans-serif système ; mono (`ui-monospace`) pour code, noms
  d'événements (`PreToolUse`…) et commandes.

## 3. Le système de motion — `src/lib/motion.ts`

La librairie est **Motion** (ex-Framer Motion, paquet `motion`, import
`motion/react`). Tous les tokens partagés :

| Token | Valeur | Usage |
|---|---|---|
| `EASE_OUT` | `[0.16, 1, 0.3, 1]` | Easing maison (expo-out) — révélations |
| `spring.snappy` | stiffness 500 / damping 32 | Micro-gestes directs : checkbox, toggle, tap, copy |
| `spring.smooth` | stiffness 300 / damping 30 | Surfaces & reflows : modale, FLIP, layout |
| `spring.gentle` | stiffness 200 / damping 28 | Suivi continu (réservé) |
| `duration` | micro .15 · base .3 · reveal .4 | Durées de référence (s) |
| `fadeUp` | y 12→0, opacity 0→1 | Variant de révélation de base |
| `staggerContainer` | staggerChildren .04 | Orchestration de cascade |
| `sectionReveal` | fade + staggerChildren .025 | Section qui s'éclaircit *et* cascade ses lignes |

### Provider — `src/components/MotionProvider.tsx`

Monté à la racine (`src/app/layout.tsx`). Deux responsabilités :

1. `LazyMotion features={domMax} strict` — features (layout, drag, gestures)
   chargées à la demande. **Condition impérative** : on utilise `m.*`, jamais
   `motion.*` (le mode `strict` lève une erreur sinon).
2. `MotionConfig reducedMotion="user"` — l'accessibilité est **automatique** sur
   100 % des effets. Pour `prefers-reduced-motion`, Motion neutralise
   transform/layout et ne garde que l'opacity. **On n'écrit aucune media query
   motion manuelle.**

## 4. Inventaire des effets

| # | Effet | Où | Intention |
|---|---|---|---|
| ① | Cascade d'entrée | `CatalogueExplorer` | Révéler le catalogue avec qualité au 1er paint (joué une seule fois) |
| ② | Filtrage vivant (FLIP) | `CatalogueExplorer` + `HookRow` | Les lignes *glissent* au filtre/regroupement au lieu de sauter |
| ③ | Modale spring + drag | `HookModal` | Vraie animation d'entrée/sortie ; bottom-sheet glissable sur mobile |
| ④ | Checkbox / Plus→Check | `AnimatedCheck`, `HookRow`, `HookModal` | Le ✓ se *dessine* (pathLength) ; geste central rendu satisfaisant |
| ⑤ | Toggle glissant | `CatalogueExplorer` | Indicateur `layoutId` partagé qui glisse sous l'onglet actif |
| ⑥ | Compteur + chips | `Header`, `HookConfigurator` | Pill qui pulse au changement ; chips qui entrent/sortent en reflow |
| ⑦ | Copy→Check | `CopySwap` | Swap d'icône unique et cohérent sur les 3 boutons « Copier » |
| ⑧ | Bannière d'install sticky + pulse | `CatalogueExplorer` | Commande épinglée en haut, reflète la sélection en direct, et pulse (anneau indigo + badge de compte) à chaque coche/décoche : « le lien vient d'être modifié ». Garde-fou 800 ms contre le pulse d'init. |

## 5. Règles de contribution motion

1. **Importer les tokens** depuis `@/lib/motion`. Ne pas redéfinir un spring ou
   un easing en local. Si un nouveau besoin émerge → l'ajouter à `motion.ts`.
2. **`m.*` uniquement** (jamais `motion.*`) — sinon `LazyMotion strict` casse.
3. **Transform & opacity seulement** (+ `layout` pour le FLIP). Jamais d'animation
   de `width`/`height`/`top`/`left` brute.
4. **Une entrée = une sortie** : tout élément conditionnel (`{x && …}`) animé doit
   vivre sous `<AnimatePresence>` avec un `exit`.
5. **Pas de media query motion** : laisser `reducedMotion="user"` gérer l'a11y.
6. **Doser** : si l'effet ne répond pas à « ça sert la compréhension ou le
   feedback ? », il ne va pas dans le site.

## 6. Ce qu'on n'implémente PAS

❌ Parallax · ❌ scroll-reveal sur chaque bloc · ❌ hover `scale-1.1` généralisé ·
❌ transitions de page lourdes · ❌ animation des blocs de code · ❌ effets
purement décoratifs sans rôle fonctionnel.
