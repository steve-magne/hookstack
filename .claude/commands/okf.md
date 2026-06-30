# OKF — Connaissance projet (consulter & maintenir)

Bundle de connaissance OKF dans `okf/` : source de vérité (architecture, vision, marketing,
roadmap, conventions). Cette commande aiguille vers le bon usage selon `$ARGUMENTS`.

## Optimisation tokens — principe

Ne **jamais** charger tout le bundle dans le contexte principal. Deux leviers :
1. **Retrieval déterministe** (`node scripts/okf.mjs query ...`) — ~0 token modèle.
2. **Délégation** au sous-agent `okf-librarian` — il lit dans son propre contexte et ne
   renvoie qu'une synthèse. Préférer ça dès que la réponse demande plus d'un concept.

## Routage selon `$ARGUMENTS`

### (vide) ou `consult <sujet>` — consulter
Déléguer au sous-agent **okf-librarian** : « Donne le contexte OKF pour : `<sujet>` ».
Il renvoie réponse + sources + points à vérifier. Pour un besoin trivial mono-concept,
`node scripts/okf.mjs query <sujet>` puis lire le seul fichier en tête suffit.

### `enrich` — passe d'enrichissement
1. `node scripts/okf.mjs stale` — confirmer la péremption.
2. Déléguer à **okf-librarian** en mode ENRICHISSEMENT (cf. `okf/meta/self-improvement.md`).
3. Vérifier `node scripts/okf.mjs validate` → OK, et qu'une entrée a été ajoutée à `okf/log.md`.

### `check` — santé du bundle
```bash
node scripts/okf.mjs validate --strict   # liens cassés + champs recommandés inclus
node scripts/okf.mjs stale
```
`validate` accepte `--json` (CI/automatisation). Erreurs dures = §9.1/§9.2 ;
warnings = liens cassés (tolérés §5.3), champs recommandés manquants, frontmatter des
fichiers réservés. `--strict` rend les warnings fatals.

### `map` — catalogue complet compact
```bash
node scripts/okf.mjs map
```

### `graph` — graphe HTML interactif autonome
```bash
node scripts/okf.mjs graph            # écrit okf/graph.html (versionné dans le repo)
node scripts/okf.mjs graph -o /tmp/okf.html
```
Régénérer après tout ajout/suppression de concept ou de lien, comme `index`.
Concepts = nœuds (couleur par `type`), liens markdown = arêtes ; panneau détail avec
liens sortants / cité par, filtre par type, recherche. Ouvrir le `.html` dans un navigateur.

### `index` — régénérer les index.md (après ajout/suppression de concept)
```bash
node scripts/okf.mjs index
```

## Rappel

Tout nouveau fait durable (décision d'archi, contrainte, pivot produit/marketing, étape de
roadmap franchie) doit finir dans le bundle, pas seulement dans la conversation. Voir
`okf/meta/self-improvement.md`.
