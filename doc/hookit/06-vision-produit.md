# Vision produit — Hook Doctor

## Ce qu'on construit

Un outil qui permet à un développeur de décrire son projet et de repartir avec un `settings.json` complet, prêt à coller dans son projet Claude Code.

## Le produit en 3 écrans

**Écran 1 — Profil projet**
Stack (Next.js, Python, Go…), type (SaaS, CLI, lib), préoccupations (sécu, qualité, no-breakage CI)

> **État actuel** : le sélecteur de stack (chips `TypeScript | Python | Node.js` dans `CatalogueExplorer`) est une première implémentation de cet écran. Il filtre le catalogue en opt-out : les hooks universels restent visibles, les hooks tech-spécifiques (`stack: ["python"]`, etc.) n'apparaissent que si la stack est sélectionnée. C'est le squelette UX de l'Écran 1 — à enrichir avec le type de projet et les préoccupations.

**Écran 2 — Hooks recommandés**
Liste avec explication de *pourquoi* chaque hook est utile pour *ce* cas précis

**Écran 3 — Export**
`settings.json` complet + scripts `.mjs` à copier dans `.claude/hooks/`

## Pourquoi ce modèle

| Objectif | Comment ce produit y répond |
|---|---|
| Usage perso | Utilisé à chaque nouveau projet — premier beta-testeur |
| Collègues | Envoie un lien, ils repartent avec leur config en 2 min |
| Pub perso | "J'ai fait le site qui configure les hooks Claude Code" — très visible dans la communauté dev |
| Monétisation future | Tier gratuit = config basique / Tier pro = hooks custom, équipe, mises à jour |

## Ce que le catalogue actuel devient

Le catalogue reste le moteur en coulisses — pas la vitrine. Il alimente le moteur de recommandation.

## Prochaines étapes

1. Construire la collection de hooks de référence (voir `07-collection-hooks.md`)
2. ~~Construire l'écran 1~~ **Partiel** : le sélecteur de stack est en place — étendre avec le type de projet et les préoccupations
3. Utiliser le catalogue sur le projet Hookit lui-même pour valider
