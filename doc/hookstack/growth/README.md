# Growth — le système d'exécution

Ce dossier est le **cerveau de growth** de Hookstack. La stratégie marketing « quoi/pourquoi » vit dans [`../07-strategie-marketing.md`](../07-strategie-marketing.md). Ici on couvre le **« comment on exécute, semaine après semaine »** : la machine qui transforme la stratégie en stars et en trafic.

**Objectif** : `github.com/steve-magne/hookstack` → **5 000 ⭐** (repo trending) + trafic sur `hookstack.vercel.app`.

## Le système en une image

```
        ┌─────────────────────────────────────────────┐
        │  Bibliothèque (ce dossier) = la stratégie    │
        │  north-star · playbook · brand-voice ·       │
        │  channels · metrics                          │
        └───────────────┬─────────────────────────────┘
                        │ lue par
        ┌───────────────▼─────────────────────────────┐
        │  3 skills = les exécutants                   │
        │  /growth-coach   → quoi faire maintenant     │
        │  /growth-post    → produit un post prêt      │
        │  /growth-outreach→ trouve & rédige l'outreach│
        └───────────────┬─────────────────────────────┘
                        │ pilotent
        ┌───────────────▼─────────────────────────────┐
        │  GitHub Issues (label `growth`) = le backlog │
        │  + scripts (metrics, seed) + GitHub Action   │
        └─────────────────────────────────────────────┘
```

## Index

| Fichier | Contenu |
|---|---|
| [north-star.md](north-star.md) | L'objectif, le funnel, les maths honnêtes, les indicateurs pilotables |
| [playbook.md](playbook.md) | Le plan séquencé en phases (foundation → seed → drumbeat → spikes → flywheel) |
| [brand-voice.md](brand-voice.md) | La voix, la banque de messages/angles, les do/don't |
| [channels.md](channels.md) | Tactiques par canal : X · Reddit/HN · LinkedIn |
| [metrics.md](metrics.md) | Quoi tracker, les cibles, où vit le log |
| `drafts/` | Brouillons de posts générés par `/growth-post` (créé à la demande) |

## La boucle hebdomadaire (le rituel)

C'est tout le système, en 30 min/semaine :

1. **Lundi — `/growth-coach`** : il lit les métriques + le board, te dit la phase actuelle et les 1–3 actions à plus fort levier. Il crée/met à jour les issues.
2. **Dans la semaine — `/growth-post`** : tu génères 2–4 posts prêts-à-coller (X, LinkedIn). Tu valides, tu publies (draft-and-review, jamais d'auto-post).
3. **1×/semaine — `/growth-outreach`** : la machine trouve des cibles (repos avec `.claude/`, threads, newsletters) et rédige l'outreach personnalisé.
4. **Vendredi — `/growth-coach review`** : bilan, on log les chiffres, on ajuste.

> Règle KISS : ce système **ne poste jamais à ta place** et ne demande aucune API payante. Il automatise l'idéation, la rédaction, le ciblage, le suivi et la mesure. Le clic « Publier » reste à toi — c'est volontaire (robuste, zéro coût, zéro risque de ban).

## Règle d'alimentation

Si une session découvre un angle qui convertit, un canal qui marche, un message qui résonne → l'ajouter dans le fichier pertinent ici. Seulement ce qui reste vrai sur la durée.
