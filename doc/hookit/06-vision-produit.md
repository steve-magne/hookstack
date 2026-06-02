# Vision produit — Hookstack

## Ce qu'on construit

Le registre de référence pour les hooks Claude Code. Un développeur décrit son projet et repart avec une commande `npx hookstack@latest install` prête à coller — en moins d'une minute.

## Stratégie numérique

**Positionnement SEO** : Claude Code a créé le marché des hooks agentiques. Hookstack se positionne sur l'intent de recherche directe ("claude code hooks", "claude hooks", "agent hooks") avec un contenu communautaire vivant — avantage structurel sur tout concurrent qui partirait de zéro.

**Nom de marque** : "Hookstack" est conçu pour devenir une référence conversationnelle — *"t'as vu hookstack ?"*, *"what's your hook stack?"*. Mémorable, extensible, sans dépendance à un outil tiers.

**Viralité intégrée** : chaque commande `npx hookstack@latest install` publiée dans un README ou un tweet est de la distribution gratuite.

## Le produit en 3 écrans

**Écran 1 — Profil projet**
Stack (Next.js, Python, Go…), type (SaaS, CLI, lib), préoccupations (sécu, qualité, no-breakage CI)

> **État actuel** : le sélecteur de stack (chips `TypeScript | Python | Node.js` dans `CatalogueExplorer`) est une première implémentation. Il filtre le catalogue en opt-out : hooks universels toujours visibles, hooks tech-spécifiques conditionnels. Squelette UX à enrichir avec type de projet et préoccupations.

**Écran 2 — Hooks recommandés**
Liste avec explication de *pourquoi* chaque hook est utile pour *ce* cas précis

**Écran 3 — Export**
Commande `npx hookstack@latest install --hooks=<slugs>` prête à copier

## Pourquoi ce modèle

| Objectif | Comment ce produit y répond |
|---|---|
| Usage perso | Utilisé à chaque nouveau projet — premier beta-testeur |
| Collègues | Envoie un lien, ils repartent avec leur config en 1 min |
| Pub perso | J'ai fait THE registre de hooks Claude Code — très visible dans la communauté dev |
| Monétisation future | Tier gratuit = hooks communautaires / Tier pro = hooks custom, équipe, sync auto |

## Ce que le catalogue actuel devient

Le catalogue reste le moteur en coulisses — pas la vitrine. Il alimente le moteur de recommandation et est la source de vérité du registre.

## Prochaines étapes

1. Construire la collection de hooks de référence (voir `07-collection-hooks.md`)
2. ~~Construire l'écran 1~~ **Partiel** : sélecteur de stack en place — étendre avec type de projet et préoccupations
3. Utiliser le catalogue sur le projet Hookstack lui-même pour valider
4. Publier le CLI sur hookstack et mettre à jour le README
