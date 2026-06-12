# tour-de-controle

Un skill Claude Code qui orchestre tes grosses tâches en trois temps :
le grand modèle (Claude Fable 5 / Opus) **planifie** et **vérifie**,
des sous-agents calibrés lot par lot (Haiku / Sonnet / Opus selon la
complexité) **exécutent** en parallèle.

Résultat : la qualité du modèle le plus puissant, sans le payer sur chaque ligne.

## Installation (2 minutes)

1. Dézippe cette archive.
2. Place le dossier `tour-de-controle` :
   → dans `~/.claude/skills/` pour l'avoir dans toutes tes sessions,
   → ou dans `.claude/skills/` à la racine d'un projet pour ce projet seulement.
3. Relance Claude Code. C'est tout — un seul fichier, aucun script, aucune clé à configurer.

Besoin d'aide ? Demande directement à Claude Code : « installe le skill tour-de-controle que je viens de télécharger ».

## Utilisation

Sur une grosse tâche (audit de dossier, série de documents, analyse multi-sources, migration multi-fichiers), dis simplement :

> « tour de contrôle »

ou « orchestre cette tâche », « planifie-délègue-vérifie ».

Le skill déroule alors ses trois phases :
→ **PLANIFIER** : découpe en lots indépendants, avec des critères de fini vérifiables écrits AVANT tout lancement — et un modèle assigné à chaque lot (Haiku pour le mécanique, Sonnet par défaut, Opus pour les lots qui demandent du jugement).
→ **DÉLÉGUER** : un sous-agent par lot, au modèle prévu par le plan, tous lancés en parallèle, chacun avec un brief autonome.
→ **VÉRIFIER** : chaque livrable est contrôlé avec une posture d'inspecteur (preuves à l'appui) ; ce qui échoue repart en reprise ciblée (2 boucles max, la 2e un tier de modèle au-dessus), puis rapport final.

## Quand ne PAS l'utiliser

→ Tâche courte qu'un seul passage règle : l'orchestration coûterait plus cher que le travail.
→ Texte créatif d'un seul tenant : la découpe casse la cohérence.

## Prérequis

→ Claude Code (les sous-agents sont intégrés, rien à installer de plus).
→ Fonctionne avec n'importe quel modèle principal ; le pattern rapporte d'autant plus que ton modèle de session est puissant (et cher).

Version 1.2 — juin 2026 (routing intelligent : le tier d'exécution se choisit lot par lot, et escalade en cas de reprise)
