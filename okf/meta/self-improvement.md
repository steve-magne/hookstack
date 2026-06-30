---
type: Playbook
title: Auto-bonification périodique du bundle
description: Mécanisme self-contained pour garder le bundle frais, sans infra externe.
tags: [meta, maintenance, self-improvement]
timestamp: 2026-06-29T00:00:00Z
---

Le bundle se dégrade s'il n'est pas entretenu. Ce mécanisme est **portable** :
aucune dépendance, aucun cron externe — juste un protocole que les agents suivent.

# Déclencheurs (l'un OU l'autre)

1. **Périodique (staleness)** : `node scripts/okf.mjs stale` compare la date du jour à la
   dernière entrée de [/log.md](/log.md). S'il renvoie `STALE` (écart **> 14 jours**),
   lancer une passe d'enrichissement avant de clore la session.
2. **Événementiel — le test de relecture** : si pendant une tâche tu as dû **lire le code
   source** pour comprendre une fonctionnalité, une contrainte ou une décision que l'OKF
   aurait dû te dire, c'est qu'un concept manque. Capture-le avant de clore (volet technique
   *et* impact UX si pertinent). Idem pour toute décision d'archi, contrainte, pivot
   produit/marketing ou étape de roadmap franchie.

   **Barre anti-over-documentation** — ne capturer QUE si les trois tiennent :
   1. **Durable** — encore vrai dans ~1 mois (pas un détail d'implémentation volatil).
   2. **Réutilisable** — un autre agent perdrait du temps à le redécouvrir.
   3. **Absent** — `node scripts/okf.mjs query <termes>` ne le renvoie pas déjà ; s'il
      renvoie un concept proche, **compléter** ce concept au lieu d'en créer un doublon.

   Si l'un des trois manque : ne rien écrire.

# Passe d'enrichissement (checklist)

Préférer le sous-agent `okf-librarian` (mode ENRICHISSEMENT) — il travaille dans son propre
contexte et garde le contexte principal léger.

1. **Vérité** — pour chaque concept potentiellement touché, confronter au code/réalité.
   Corriger ce qui est faux ; supprimer ce qui est mort.
2. **Combler** — ajouter les concepts manquants (un fait par section, structuré : listes,
   tableaux, blocs de code — pas de prose vague).
3. **Liens** — relier les nouveaux concepts aux voisins via `[texte](/vision/mission.md)`.
4. **Timestamp** — mettre à jour le champ `timestamp` ISO 8601 des concepts modifiés.
5. **Index & graphe** — `node scripts/okf.mjs index` régénère tous les `index.md` (dossiers +
   nav racine) ; `node scripts/okf.mjs graph` régénère `okf/graph.html`. Les deux sont générés
   depuis le frontmatter : **ne jamais les éditer à la main.**
6. **Valider** — `node scripts/okf.mjs validate --strict` doit renvoyer OK (conformité OKF v0.1).
7. **Log** — ajouter une entrée datée `YYYY-MM-DD` en haut de [/log.md](/log.md) avec un
   mot-clé en gras (`**Update**`, `**Creation**`, `**Deprecation**`).

# Garde-fous

- **Ne pas dupliquer le code** : le bundle capture le *pourquoi* et l'*invariant*, pas le
  détail d'implémentation qui vit déjà dans le repo.
- **Concision** : si une explication est plus longue que le fait qu'elle défend, la couper.
- **Un fait = un endroit** : éviter de répéter une info dans plusieurs concepts.

# Rendre le déclencheur réellement automatique (optionnel, par projet)

Le protocole ci-dessus suffit si les agents le lisent à chaque session (câblé via
`CLAUDE.md` → voir [porting](porting.md)). Pour forcer la périodicité sans dépendre de la
mémoire de l'agent, au choix selon l'hôte :

- **Claude Code** : un hook `SessionStart` qui imprime « dernière entrée log.md = <date>,
  enrichir si > 14j ».
- **Tâche planifiée / cron** : une routine hebdomadaire qui ouvre une session avec la
  consigne « exécute la passe d'enrichissement OKF ».

Ces intégrations sont **hors bundle** (spécifiques à l'hôte) pour préserver la portabilité.
