# Vision produit — Hookstack

## Ce qu'on construit

Un catalogue communautaire de hooks agentiques, couplé à un CLI qui installe les hooks sélectionnés en une commande. L'objectif : qu'un développeur parte de zéro et ait ses hooks actifs dans Claude Code en moins d'une minute.

**Tagline** : *"Get your HookStack in 1 minute"*

## La promesse en 3 écrans

**Écran 1 — Fast path : stack prédéfinie**
Le développeur arrive sur le site et voit immédiatement une stack de hooks recommandés pour son type de projet. Il n'a pas besoin de parcourir le catalogue — la commande est déjà prête. *Path avancé* : s'il veut affiner, il ouvre le catalogue filtrable (par event type, catégorie, keyword, stack) et coche les hooks supplémentaires qui lui correspondent.

> **État actuel** : le catalogue filtrable et la sélection persistée (`localStorage`) sont implémentés. `CatalogueExplorer` gère filtres, regroupement, et le sélecteur de stack (chips TypeScript/Python/Node.js) filtre les hooks tech-spécifiques.

**Écran 2 — Configure**
`HookConfigurator` affiche en temps réel la commande `npx hookstack-cli@latest install --hooks=...` générée depuis la sélection. Un clic copie.

> **État actuel** : implémenté. Bannière sticky avec effet pulse à chaque sélection/désélection.

**Écran 3 — Install**
L'utilisateur colle la commande dans son terminal. Le CLI installe les `.mjs` et patche `settings.json`. Terminé.

> **État actuel** : implémenté. CLI publié sous `hookstack-cli` sur npm, code dans `packages/cli/`.

## Roadmap — ce qu'on n'a pas encore

### Priorité 1 — Enrichissement du profil projet

Le sélecteur de stack actuel est minimal (TypeScript/Python/Node.js). La prochaine étape est un "profil projet" plus riche :
- Type de projet : SaaS web / CLI / lib / mobile
- Préoccupations principales : sécurité / qualité / vitesse / no-breakage CI
- Taille d'équipe : solo / petite équipe / enterprise

Ce profil permettrait des **recommandations personnalisées** (écran 2 du produit cible) : "Pour un SaaS Next.js avec focus sécurité, on te recommande ces 5 hooks."

### Priorité 2 — Hooks "must-have" marqués

Introduire un flag `is_must` dans le registre pour les hooks considérés comme fondamentaux quelle que soit la stack. Le site les met en avant visuellement (accent indigo). Aide les nouveaux utilisateurs à démarrer sans se perdre dans 68 hooks.

### Priorité 3 — Page détail enrichie (`/hook/[slug]`)

Actuellement : cas d'usage, config, script. Ajouter :
- Exemples de repos réels qui utilisent ce hook (extrait de `community_examples`)
- Statistiques : combien d'installations via le CLI
- Liens vers les PRs qui ont ajouté ce hook au registre

### Priorité 4 — Monétisation future

Le modèle gratuit fonctionne pour l'audience communautaire. Tier Pro envisagé :
- Hooks custom privés (équipe)
- Mises à jour automatiques des hooks installés
- Analytics sur les hooks de son équipe
- Support prioritaire

## Ce que le catalogue devient

Le catalogue ne disparaît pas — il reste le moteur. Mais la *vitrine* évolue progressivement vers un **wizard de configuration** guidé par le profil du projet. Le catalogue brut reste accessible pour les utilisateurs avancés qui savent ce qu'ils cherchent.

## Pourquoi le projet existe (vision founder)

- **Usage perso** : utilisé sur chaque nouveau projet — le fondateur est son propre premier beta-testeur (dogfood complet avec 62 hooks actifs)
- **Partage rapide** : envoyer un lien à un collègue → il repart avec sa config en 2 min
- **Visibilité communautaire** : "J'ai fait le site qui configure les hooks Claude Code" — très visible dans la communauté dev IA
- **Effet réseau** : chaque repo contribué enrichit le catalogue → le site s'améliore automatiquement

## Concurrence / alternatives

- `awesome-copilot` (GitHub) : collection manuelle, pas de génération de config, pas de CLI
- Docs officielles Claude Code : référence, pas un catalogue ni un outil d'installation
- Le blog post perso : ponctuel, pas maintenable

Hookstack occupe un angle unique : **catalogue + CLI + enrichissement communautaire automatisé**.
