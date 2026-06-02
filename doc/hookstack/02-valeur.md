# Valeur proposée

## Problème adressé

Les hooks agentiques (Claude Code, GitHub Copilot, Cursor, etc.) permettent d'enrichir considérablement le workflow de développement : interception d'outils, validation de commandes, injection de contexte, automatisation de tâches post-génération. Pourtant :

- **La découverte est difficile.** Les hooks sont documentés en silos par chaque provider, sans vue unifiée par cas d'usage.
- **L'implémentation est manuelle et répétitive.** Chaque développeur repart de zéro pour configurer des patterns similaires.
- **Le partage est inexistant.** Il n'existe pas de lieu centralisé où la communauté DevSecOps partage ses hooks réels, avec le code associé.
- **Le registre officiel est statique.** `awesome-copilot` (GitHub) est une collection manuelle non guidée, sans génération de configuration ni catégorisation par besoin.

***

## Proposition de valeur

| Ce que le développeur gagne | Mécanisme |
|---|---|
| Découverte rapide des hooks pertinents | Catalogue filtrable par provider, cas d'usage, type de projet |
| Implémentation immédiate | Génération automatique de la config (`settings.json`, skill, prompt) prête à coller |
| Apprentissage par l'exemple | Cas d'usage réels extraits de projets GitHub de la communauté |
| Registre toujours à jour | Boucle d'enrichissement automatique par analyse de repos via Claude Code |