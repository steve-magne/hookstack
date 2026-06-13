# Hero Pills — Social proof adjustments

## Changements (`src/app/page.tsx`)

### 1. Pillule stars conditionnelle (seuil 100)

**Avant** : `stars !== null && stars > 0`  
**Après** : `stars !== null && stars >= 100`

La pillule "★ N on GitHub" est masquée tant que le dépôt n'a pas atteint 100 étoiles. En dessous de ce seuil, afficher un petit nombre (ex. 3) nuit à la crédibilité plutôt qu'elle ne l'appuie — c'est l'effet inverse du signal voulu. Le seuil 100 est arbitraire mais raisonnable pour un projet early-stage : il marque le passage d'un signal social neutre à un signal positif.

### 2. Libellé raccourci

`Every hook unit-tested` → `Hooks unit-tested`

Le mot "Every" était redondant dans un contexte de pillule courte. "Hooks unit-tested" est plus dense, lisible, et cohérent avec le style des autres pillules (noun phrase sans article ni quantificateur).

### 3. Nouvelle pillule "Security scanned"

Ajoutée en dernière position dans la liste `SocialProof`. Elle signale que les hooks passent un scan de sécurité — signal de confiance direct pour des développeurs qui installent des scripts qui s'exécutent sur leur machine. Pas d'icône ni de couleur spéciale : même traitement visuel que les autres pillules (monochrome, `ring-1 border`).

## Aucune dépendance ajoutée

Modification purement textuelle/conditionnelle dans le JSX. Aucun composant, aucun state, aucune route touchés.
