# Implement — Planner → Generator → Evaluator

Conçoit (si user-facing) puis **livre** une feature, selon le pattern à 3 rôles séparés
(anti-biais d'auto-éval). Deux sources d'entrée — le mode est déduit de l'argument :

`$ARGUMENTS` =
- **une idée libre** → *mode idée* (flux rapide) : `/implement "ajouter un filtre par provider sur le catalogue"`.
  Raffinage live + dev immédiat dans cette session, **sans passer par GitHub**.
- **un numéro / URL d'issue** → *mode issue* : `/implement 88`. Lire son contenu avec
  `gh issue view <N>` pour cadrer le Contrat d'implémentation.

## 0. Cadrage du contexte projet (déterministe, ~0 token)
Avant de planifier, s'ancrer dans le projet **sans charger de code en contexte principal** :
`node scripts/okf.mjs query <termes de la feature>` (retrieval déterministe). N'escalader au
sous-agent `okf-librarian` (lit dans son propre contexte → renvoie une synthèse courte) que si la
query ne suffit pas. Objectif : le Planner connaît contraintes + patterns existants (Motion,
registre, CLI, conventions, **cohérence 4 surfaces**) **avant** d'écrire le Contrat — pas de lecture
exploratoire du code en contexte principal. C'est le levier principal d'économie de tokens :
chaque lecture lourde se fait dans le contexte d'un sous-agent, jamais dans le tien.

## 0.5 Design Brief (conception multi-perspectives) — features user-facing uniquement
**Sauter** pour un fix purement technique (pas d'écran/UX impacté) — dis-le en une ligne.
Sinon, fan-out **parallèle** sur des lentilles indépendantes, chacune lit son OKF dans **son propre contexte** :
- `frontend-engineer` → où l'utilisateur le voit, hiérarchie visuelle, Motion (`m.*`, tokens `motion.ts`), accessibilité.
- lentille **produit/cohérence** (`general-purpose` ou `okf-librarian`) → sert la promesse produit ? Impact sur les **4 surfaces** (site / CLI / `doc/product/` / `README.md`) ?

Chaque lentille renvoie **2-3 lignes max** (proposition + 1 risque). Tu synthétises un **Design Brief**
de 5-8 lignes (où ça vit · feedback clé · 1 garde-fou UX ou de cohérence). Il devient un **input du
Contrat d'implémentation** ci-dessous. Garde-fou anti-scope-creep : le brief sert l'intention de départ
(l'idée, ou le périmètre de l'issue), il ne la gonfle pas.

## 1. Planner (Opus — toi)
Produire un **Contrat d'implémentation** vérifiable, court :
```
Objectif      : <résultat attendu, 1 phrase>
Périmètre     : <ce qui est inclus>
Hors-périmètre: <ce qu'on ne fait PAS — garde-fou anti-scope-creep>
Critères d'acceptation:
  - <critère 1, vérifiable : test / métrique / artefact observable>
  - <critère 2 ...>
Artefact      : <fichier(s)/livrable(s) concret(s) à produire>
Surfaces      : <quelles des 4 surfaces (site/CLI/docs/README) sont impactées — à tenir cohérentes>
```
*Mode issue uniquement* : commenter l'issue (`gh issue comment <N>`) pour signaler le début de l'implémentation.

## 2. Generator (Sonnet — sous-agent du domaine)
Router vers le sous-agent du domaine (**1 livrable = 1 agent, contexte isolé** → diff parallèle si
plusieurs livrables indépendants) :
- composant React / page Next.js / animation Motion / accessibilité / catalogue → `frontend-engineer`
- hook du catalogue `.claude/hooks/*.mjs` (création/modif, sync, registre) → `hook-author`
- CLI `packages/cli/` (scopes, flags, messages, PREREQ_HINTS) → `cli-engineer`
- contexte projet / vision / contraintes durable → `okf-librarian` (consultation)

Consigne à l'agent : respecter le Contrat à la lettre, KISS/DRY, commits de checkpoint réguliers,
ne rien faire hors-périmètre, **n'écrire que son livrable** (ne pas relire tout le repo). Maintenir
la mémoire active (OKF).

## 3. Evaluator (Sonnet — `qa-engineer`, agent SÉPARÉ du Generator)
Lancer `qa-engineer` qui **vérifie contre les critères d'acceptation** via outils réels : `pnpm test`,
`pnpm typecheck`, `pnpm lint`, `pnpm validate:registry`, `node .claude/sync-hooks.mjs --check`,
`node .claude/hooks-timeline.mjs --check`, couverture ≥80 % des fichiers modifiés. Verdict structuré :
```
PASS  → tous les critères tenus, preuves jointes
FAIL  → critère(s) non tenu(s) → renvoyer au Generator avec le diagnostic
RETRY → ambigu → re-planifier (retour étape 1)
```
Boucler Generator↔Evaluator jusqu'à PASS (max 3 tours, sinon escalader à l'humain).

## 4. Clôture
- *Mode issue* : fermer l'issue (`gh issue close <N> --reason completed --comment "<preuve/commit/date>"`).
  *Mode idée* : pas d'issue à fermer — résumer le livrable + proposer le message de commit.
- `okf/implementation/<feature>.md` créé (le hook `stop-force-implementation-doc` l'impose de toute
  façon si du code a changé).
- **Cohérence 4 surfaces** : vérifier que site / CLI / `doc/product/` / `README.md` restent alignés
  (toute évolution de flow, slug d'exemple ou wording CLI doit être répercutée partout).
- Si un fait durable a été appris : passe d'auto-bonification OKF (`node scripts/okf.mjs stale`).
- `node scripts/okf.mjs index` pour rafraîchir la nav.
