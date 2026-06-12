---
name: tour-de-controle
description: Orchestre une tâche complexe en trois temps avec Claude Code — PLANIFIER avec le modèle le plus puissant (Fable 5 / Opus), DÉLÉGUER l'exécution à des sous-agents calibrés lot par lot (Haiku / Sonnet / Opus selon la complexité) lancés en parallèle, puis VÉRIFIER chaque livrable de façon adversariale avec le modèle puissant avant de conclure. Déclenché par "tour de contrôle", "orchestre cette tâche", "planifie-délègue-vérifie", "fais-le faire par des sous-agents", ou toute grosse tâche multi-lots où l'utilisateur veut la qualité du grand modèle sans payer le grand modèle sur chaque ligne.
---

# tour-de-controle — planifier, déléguer, vérifier

Le principe : **le grand modèle est trop précieux pour exécuter, et trop bon pour ne pas
vérifier.** Sur une grosse tâche, on ne lui demande pas de tout faire — on lui demande
les deux choses où il écrase tout : **le plan** et **le contrôle qualité**. L'exécution,
elle, part vers des sous-agents plus petits, plus rapides, moins chers, qui travaillent
en parallèle.

```
        PLANIFIER                 DÉLÉGUER                  VÉRIFIER
   (grand modèle, 1 fois)   (petits agents, en //)    (grand modèle, 1 fois)
   ┌──────────────────┐     ┌──────┐ ┌──────┐         ┌──────────────────┐
   │ spec complète    │ →   │lot 1 │ │lot 2 │ ...  →  │ contrôle contre  │
   │ + critères de    │     └──────┘ └──────┘         │ les critères du  │
   │ "fini" par lot   │     chaque lot = un agent     │ plan, lot par lot│
   └──────────────────┘     autonome                  └──────────────────┘
                                                        ↳ ce qui échoue
                                                          repart en lot ciblé
```

Pourquoi ça marche (et pourquoi maintenant) :
→ Les modèles frontière type **Claude Fable 5** sont devenus excellents en planification
  long-horizon et en vérification — mais chaque tour coûte cher et peut durer plusieurs
  minutes. Les utiliser pour exécuter chaque sous-tâche, c'est payer un prix de
  tour de contrôle pour faire rouler des chariots à bagages.
→ Un petit modèle avec une **spec précise** livre un travail quasi équivalent sur un lot
  bien découpé. Toute la qualité se joue dans la découpe et dans le contrôle — pas dans
  le muscle de l'exécutant.
→ La vérification par un **agent à contexte frais** bat l'auto-critique : l'exécutant ne
  voit pas ses propres angles morts.

## Quand l'utiliser

- Tâche en **plusieurs lots indépendants** : audit d'un dossier, migration de fichiers,
  production d'une série de documents, analyse multi-sources, refonte par sections.
- L'utilisateur veut **borner le coût** tout en gardant la qualité du grand modèle là où
  elle compte.
- La tâche a des **critères de réussite vérifiables** (ou peut en recevoir).

## Quand NE PAS l'utiliser

- Tâche courte ou séquentielle qu'un seul passage règle — l'orchestration coûterait plus
  cher que le travail. Fais-la directement.
- Tâche créative d'un seul tenant (un texte, un design) — la découpe casse la cohérence.
- Micro-tâches en rafale : un sous-agent repart de zéro (contexte frais à reconstruire),
  la délégation se rentabilise sur des lots de volume, pas sur des retouches d'une minute.

## Workflow (3 phases)

### Phase 1 — PLANIFIER (toi, le grand modèle, effort maximal)

1. **Spec complète d'abord.** Si la demande est floue, pose TOUTES tes questions en un
   seul tour (objectif, périmètre, contraintes, format de sortie, exemples de "bien").
   Un plan sur une demande floue produit des lots flous — et des sous-agents perdus.
2. **Découpe en lots indépendants.** Chaque lot doit être exécutable seul, sans voir les
   autres. Si deux lots dépendent l'un de l'autre, fusionne-les ou séquence-les.
3. **Pour chaque lot, écris 4 choses** dans un plan affiché à l'utilisateur :
   - **Mission** : une phrase, verbe d'action.
   - **Matière** : les fichiers / données / liens exacts dont le lot a besoin.
   - **Critères de fini** : 2 à 4 critères **vérifiables** (pas "de qualité", mais
     "contient les chiffres exacts du tableau source", "moins de 300 mots", "0 lien mort").
   - **Modèle** : le tier d'exécution choisi via la grille de routing (voir Réglages),
     avec sa justification en 3-5 mots ("mécanique pur", "rédaction nuancée"…). Le routing
     se décide AU PLAN, jamais à l'improvisation au moment du lancement.
4. Valide le plan avec l'utilisateur si la tâche est lourde ou ambiguë. Sinon, enchaîne.

### Phase 2 — DÉLÉGUER (sous-agents calibrés, en parallèle)

5. Lance **un sous-agent par lot** via l'outil Agent/Task, avec le **modèle assigné
   dans le plan** (`model: "haiku"` / `"sonnet"` / `"opus"` — grille de routing dans
   les Réglages). Lance tous les lots indépendants **dans le même tour** — ils tournent
   en parallèle.
6. **Le prompt de chaque sous-agent est autonome** : il ne voit RIEN de la conversation.
   Recopie dedans la mission, la matière (chemins complets), les critères de fini, et le
   format de sortie attendu. Termine par : « Ta dernière réponse EST le livrable —
   renvoie le contenu brut, pas un résumé de ce que tu as fait. »
7. Pendant que les agents tournent, ne refais pas leur travail toi-même. Attends.

### Phase 3 — VÉRIFIER (toi, le grand modèle, casquette d'inspecteur)

8. **Contrôle chaque livrable contre ses critères de fini — en cherchant à le refuser.**
   Pose-toi pour chaque critère : « qu'est-ce qui prouverait que c'est raté ? » et va
   vérifier dans les sources (relis le fichier produit, recoupe les chiffres, teste les
   liens). Un livrable qui "a l'air bien" sans preuve = non vérifié.
9. **Ce qui échoue repart en lot ciblé** : poursuis l'agent exécutant si l'environnement le
   permet (son contexte est intact), sinon un nouveau sous-agent — dans les deux cas avec le
   livrable fautif, le critère raté et la correction attendue. Maximum **2 boucles** de
   reprise — au-delà, reprends le lot toi-même ou remonte le blocage à l'utilisateur.
   **Escalade de tier** : si la 1re reprise échoue sur le même modèle, la 2e se lance
   un tier au-dessus (haiku → sonnet → opus). Un échec répété est rarement un problème
   de consigne — c'est un lot sous-calibré, et un tier de plus coûte moins cher qu'une
   3e boucle.
   **Exception micro-correction** : une déviation triviale et mécanique (≤ 1 ligne à
   supprimer ou remplacer) se corrige directement au contrôle et se note au rapport — une
   boucle complète pour ça serait du gaspillage.
10. **Rapport final** à l'utilisateur : ce qui a été produit (avec chemins), ce qui a été
    vérifié et comment, ce qui a été repris, ce qui reste ouvert. Jamais de "tout est bon"
    sans pointer les preuves.

## Réglages par défaut — grille de routing

| Rôle | Modèle | Quand |
|---|---|---|
| Planification + vérification | le modèle de la session (idéalement Fable 5 / Opus) | Toujours — c'est là que l'intelligence paie |
| Exécution mécanique | `haiku` | Zéro jugement requis : extraire, lister, compter, reformater, inventorier |
| Exécution standard (**défaut**) | `sonnet` | Analyse, synthèse, rédaction structurée, code balisé — 90 % de la qualité, fraction du coût |
| Exécution complexe | `opus` | Jugement nuancé, rédaction niveau publication, raisonnement multi-étapes DANS le lot, matière ambiguë ou contradictoire |

Règles de routing :
→ **En cas d'hésitation entre deux tiers** : prends le tier supérieur si le lot est coûteux
  à reprendre ou sur le chemin critique ; l'inférieur sinon. Une reprise coûte plus cher
  que l'écart de prix entre deux tiers.
→ **`opus` reste l'exception, pas la règle.** Si la majorité des lots réclame `opus`, c'est
  que la découpe est mauvaise (lots trop gros, trop ambigus) — redécoupe, ou admets que la
  tâche n'est pas faite pour la délégation.
→ **Le doute se lève par le critère de fini** : un lot dont les critères sont purement
  mécaniques ("compte exact", "liste exhaustive") n'a jamais besoin de plus que `haiku`,
  quelle que soit la taille de la matière.

Règles d'or :
→ **Jamais plus de lots que nécessaire.** 3 gros lots bien spécifiés battent 10 miettes.
→ **Les critères de fini s'écrivent AVANT de lancer les agents**, jamais après — sinon on
  vérifie ce qui a été produit au lieu de ce qui était demandé.
→ **La vérification n'est pas optionnelle.** Sauter la phase 3, c'est tout le pattern qui
  s'effondre : on a juste payé moins cher pour un résultat non contrôlé.
