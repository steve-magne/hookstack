# doc/hookstack — Mémoire produit & référence de travail

Ce dossier est la **mémoire vivante** du projet Hookstack. Il est destiné aux agents IA et aux collaborateurs qui ont besoin de comprendre rapidement la vision, les décisions prises et l'état du produit avant de travailler sur un sujet précis.

## Index

| Fichier | Contenu |
|---|---|
| [01-overview.md](01-overview.md) | Vue d'ensemble, workflows A et B, thème visuel |
| [02-valeur.md](02-valeur.md) | Problème adressé, proposition de valeur |
| [03-personnas.md](03-personnas.md) | Les 3 personas cibles (DevSecOps, Explorateur, Architecte Platform) |
| [04-hook-101.md](04-hook-101.md) | Taxonomie des hooks, format du registre, hooks universels vs. tech-spécifiques |
| [05-ux.md](05-ux.md) | Décision UX d'installation (CLI `npx hookstack-cli@latest`) — options analysées |
| [06-vision-produit.md](06-vision-produit.md) | Vision, état actuel par écran, roadmap, concurrence |
| [07-strategie-marketing.md](07-strategie-marketing.md) | Canaux de distribution, messaging, métriques (le « quoi/pourquoi ») |
| [growth/](growth/README.md) | **Système d'exécution de growth** : le « comment on exécute » — north-star, playbook, brand-voice, channels, metrics. Piloté par les skills `/growth-coach`, `/growth-post`, `/growth-outreach`. |

## Règles pour les agents IA

- **Lire avant d'agir** : si la tâche touche à l'UX, au registre, au CLI ou au messaging → lire les fichiers pertinents d'abord.
- **Alimenter si pertinent** : si tu découvres une décision, une contrainte ou un pattern qui serait utile dans >80% des sessions futures → ajouter l'info dans le fichier approprié de ce dossier. Pas de note d'implémentation éphémère, seulement ce qui reste vrai sur la durée.
- **Ne pas dupliquer CLAUDE.md** : les conventions techniques (hooks, sync, TypeScript) restent dans `CLAUDE.md`. Ce dossier couvre la vision, la stratégie et les décisions produit.
- **Le deliverable est toujours `npx hookstack-cli@latest`** — ne jamais décrire le flow comme "copier un settings.json".
