# Passage du catalogue en cards + expand accordéon (HookRow / CatalogueExplorer)

## Problème

Le catalogue affichait les hooks en **liste verticale** (`divide-y`) : une ligne =
checkbox à gauche, nom + benefit, méta à droite. Lisible mais peu « scannable » —
faible densité visuelle, chaque hook se ressemble, et le balayage de 100+ entrées
manque de points d'accroche. L'objectif : passer en **cards** pour donner du
volume et une meilleure hiérarchie à chaque hook, sans casser le système de motion
existant (FLIP, split-flap, `AnimatedCheck`) ni la promesse « 60-second install ».

3 maquettes de card ont été proposées à l'utilisateur (tuile compacte / spec card /
datasheet), puis 3 comportements d'expand (accordéon en place / morph vers modale /
master-détail). Choix retenu : **spec card (layout B) + accordéon en place**.

## Décisions

### 1. `HookRow` : ligne → card (`HookRow.tsx`)

Structure de la card, en `flex flex-col h-full` :

- **En-tête** : nom (héros) + `ShieldCheck` (default_on) + badges stack + chevron
  d'expand. Le nom utilise `SplitFlap` en mode **`block`** (au lieu de `truncate`)
  pour **wrapper sur plusieurs lignes** — en card on a de la place verticale, et un
  titre tronqué/débordant est banni (cf. règle « text overflows its container »).
- **`benefit`** en `flex-1` : il pousse le rail de pied vers le bas, ce qui **aligne
  les hauteurs de card** d'une même ligne de grille (footers au même niveau).
- **Panneau expand** sous `AnimatePresence` (height 0 → auto, `EASE_OUT`) : reprend
  tel quel le contenu de l'ancien expand — description, badges (catégorie +
  événement), matcher, use_cases. C'est la raison du choix « accordéon » : zéro
  nouveau contenu, on reskine l'existant.
- **Rail de pied** (`border-t`) : méta adaptative à gauche, **checkbox carré arrondi**
  (`rounded-md border-2` + `AnimatedCheck`) à droite. La checkbox `stopPropagation`
  pour ne pas déclencher l'expand, et expose `role="checkbox"` + `aria-checked` +
  navigation clavier (Enter/Espace).

La méta du rail reste la logique d'origine : groupé par catégorie → on montre
l'**événement** (`PreToolUse · Bash`) ; sinon → la **catégorie**. Cohérent dans les
deux modes de groupage.

État sélectionné : `border-white/30 bg-white/[0.04]` sur la card entière (feedback
plus lisible qu'en liste où seule la checkbox changeait).

### 2. `CatalogueExplorer` : liste → grille (`CatalogueExplorer.tsx`)

`divide-y` remplacé par
`grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-start gap-3`.

- **`auto-fill` + `minmax(260px,1fr)`** : responsive sans breakpoint (3 col desktop,
  2 col tablette, 1 col mobile), conforme à la reco brand pour les grilles de cards.
- **`items-start`** : quand une card se déplie (accordéon), elle grandit et pousse la
  **ligne suivante** ; ses voisines de ligne ne s'étirent pas (elles restent en haut,
  espace sous elles). Le reflow est animé par le `layout` FLIP déjà porté par `HookRow`.

## Ce qui n'a pas changé

- `SplitFlap` (intro/cascade), `AnimatedCheck`, tokens `motion.ts`, store Zustand.
- Le contenu de l'expand (mêmes champs, mêmes badges).
- `HookModal` / `setActive` : déjà du code mort avant ce changement (HookRow fait un
  expand inline, `setActive` n'est jamais appelé) — laissé tel quel, hors périmètre.

## Vérification

`pnpm typecheck` OK · `biome check` clean · preview navigateur : grille 2/1 col,
accordéon fonctionnel desktop + mobile, console vide. Pas de test `.mjs` impacté
(changement purement composant React).
