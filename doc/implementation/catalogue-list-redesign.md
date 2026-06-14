# Refonte de la liste & sélection des hooks (CatalogueExplorer)

## Problème

En balayage, chaque ligne du catalogue ne montrait que son **nom** + un **badge de catégorie flottant tout à droite**, séparés par un grand vide horizontal. Le `benefit` (le « pourquoi je l'installe ») n'apparaissait **qu'au survol** : 11px, italique, tronqué à 200px, aligné à droite. La `description` était cachée derrière le clic (expand). Résultat : on scrollait 93 hooks sans comprendre ce que chacun apporte. Le tri se limitait à un groupage par événement figé, sans recherche.

## Décisions

### 1. Ligne à 2 lignes — le benefit devient permanent (`HookRow.tsx`)

`[checkbox] [nom + shield + stack] / [benefit toujours visible]`, méta complémentaire calée à droite au ras du nom.

- Le **benefit comble le milieu** de la ligne : l'œil ne voyage plus dans le vide jusqu'au badge.
- **Méta contextuelle à l'axe de groupage** : groupé par catégorie → badge **événement** (`HookTypeBadge`) ; groupé par événement ou date → badge **catégorie** (`CategoryBadge`). On affiche toujours l'info que le groupage ne porte pas déjà.
- Responsive : sur `< sm`, la méta passe sous le benefit ; le benefit est en `line-clamp-2`, et `sm:truncate` au-dessus (les benefits font ≤ ~60 car., une ligne suffit en desktop).
- Le panneau **expand** est mené par la `description` (le benefit, désormais sur la ligne, n'y est plus dupliqué). L'icône `Zap` du « hero benefit » a été retirée.

### 2. Recherche inline (`CatalogueExplorer.tsx`)

Champ live au-dessus de la liste, branché sur le `query` déjà supporté par `filterHooks` (cherche nom, benefit, description, événement, trigger, tags, use_cases). Bouton clear animé (`AnimatePresence`). Auparavant `query` était codé en dur à `''`.

### 3. Bascule de groupage à 3 axes — segmented control

`buildGroups(hooks, groupBy, …)` généralisé :

- **`category`** (défaut hors page catégorie) — oriente le browse par *problème résolu*. Ordre `CATEGORY_ORDER`.
- **`event`** — comportement historique, oriente par *cycle de vie*. Ordre `HOOK_TYPES`.
- **`date`** — fenêtres de récence `This week` (≤ 7 j) / `This month` (≤ 31 j) / `Earlier`, dérivées des **dates git** déjà calculées par la timeline (`timeline.hooks`, slug → date). Réutilise l'infra `/evolution`, aucune date saisie à la main. Groupes vides filtrés (pas d'« Earlier » tant que tout le catalogue a < 31 jours).

Le défaut passe de `event` à `category` (sauf `initialCategory`, où le groupage par catégorie n'a pas de sens → forcé `event`, bascule masquée). Le segmented control utilise un indicateur `layoutId="groupby-pill"` qui glisse (langage motion ⑤).

`nowMs` est figé au montage (`useMemo(() => Date.now())`) : les fenêtres sont au jour près, pas de dérive d'hydratation SSR/client.

### 4. Correctif motion — ne jamais gater la visibilité du contenu

La version initiale révélait sections et lignes via la **propagation de variants** `staggerContainer` (`animate="show"`) + `sectionReveal`/`fadeUp`, le tout sous `AnimatePresence mode="popLayout"` avec `layout`. Ce montage présentait deux défauts réels, exposés dès qu'on change d'axe de groupage (cas jamais exercé tant que seul le groupage par événement existait) :

1. **Sections entrantes bloquées à `opacity:0`** — les enfants ajoutés *après* le 1er montage ne reçoivent jamais l'état `show` propagé par le conteneur.
2. **Lignes sortantes fantômes** — `popLayout` empilait les nœuds en sortie sans les démonter (vu : 71 `HookRow` dans le DOM pour 6 résultats réels, alors que le compteur d'en-tête, lui, affichait 6).

Correctif, conforme à la règle « le contenu est visible par défaut, la motion l'enrichit » :

- Sections : `<section>` simple (plus d'`AnimatePresence` ni de motion au niveau section). Le regroupage = swap de clés ; la transition est portée par le rejeu du split-flap (⑨c) et le FLIP des lignes.
- Lignes : `m.div` avec `layout` (FLIP ②) + **`initial={false}`** — aucun gating d'opacité, donc jamais de section/ligne vide. Plus d'`AnimatePresence` ni d'`exit` au niveau ligne : une ligne filtrée se **démonte net** (zéro fantôme). Le split-flap des noms porte la cascade d'entrée.

## Vérification

- `pnpm typecheck` ✓ · `pnpm build` ✓ (lint Next inclus) · `pnpm test` ✓ (726/726).
- Navigateur (preview) : recherche `worktree` → 6 résultats exacts ; les 3 axes rendent `compteur d'en-tête == nombre de lignes rendues` (0 mismatch, 0 nœud fantôme) ; lignes toujours à `opacity:1` sur category / event / date ; 0 erreur console.

## Périmètre

Aucune dépendance ajoutée. Touché : `HookRow.tsx`, `CatalogueExplorer.tsx`, `i18n.ts` (chaînes anglaises), `DESIGN.md` (inventaire motion ①②⑤⑨). `HookModal`, `HookConfigurator`, le hero et le CLI ne sont pas modifiés — le flow utilisateur (Browse → Select → Install) est inchangé, donc pas de propagation README/CLI/docs requise.
