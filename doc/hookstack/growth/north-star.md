# North Star — l'objectif et sa mécanique

## L'objectif

- **Primaire** : `steve-magne/hookstack` atteint **5 000 ⭐** et devient un repo *trending*.
- **Secondaire (et corrélé)** : trafic récurrent sur `hookstack.vercel.app` + installs `hookstack-cli`.

## Les maths honnêtes (à relire quand le doute s'installe)

5 000 stars, c'est le **top ~1 %** des repos. Quasiment aucun repo n'y arrive par du posting linéaire quotidien. La vérité contre-intuitive :

> **Les stars n'arrivent pas en ligne droite. Elles arrivent par paliers (« spikes »).**

Le chemin réaliste = **2 à 4 événements de pic** (Show HN en front page, hit Reddit, thread X viral, feature newsletter) valant chacun **200 à 1 500 stars**, posés sur une **base composée** (drumbeat de contenu + boucle virale produit) qui ajoute 20–60 stars/semaine.

Décomposition plausible sur ~6 mois :

| Source | Stars (fourchette) |
|---|---|
| Réseau perso + soft-launch communautés (phase seed) | 50–150 |
| 2–3 spikes réussis (Show HN / Reddit / newsletter) | 600–4 000 |
| Drumbeat de contenu (X/LinkedIn, 6 mois) | 500–1 500 |
| Boucle virale produit (CLI → site → repo) + contrib engine | 300–1 000 |

**Conclusion** : c'est **ambitieux mais atteignable** *si et seulement si* un ou deux spikes touchent. Le système ne *garantit* pas 5 000 — il **maximise la probabilité** qu'un spike touche, et capture la valeur quand il touche (un README qui convertit, un site avec CTA star). Un Show HN raté sur un README faible = une cartouche gâchée. D'où l'ordre des phases du [playbook](playbook.md) : **on rend l'asset convertissant AVANT de tirer les spikes.**

## Le funnel

```
Impression (post, lien, mention)
   → Visite repo / profil / site
      → Lecture README (les 5 premières secondes décident)
         → ⭐ STAR  +  visite site
            → Install CLI (`npx hookstack-cli@latest install`)
               → Partage (message post-install, settings.json partagé) → boucle
```

Chaque étape a un point de fuite. Le repo à 0⭐ avec **description vide** (état au 2026-06-03) fuit dès l'étape « lecture README ». La phase 0 du playbook colmate ces fuites.

## Indicateurs : pilotables vs résultats

On ne pilote pas les stars directement. On pilote les **inputs** qui les produisent.

**Pilotables (ce qu'on contrôle, à reporter chaque semaine)**
- Nb de posts de qualité publiés / semaine (cible : 3–4)
- Nb de touches d'outreach personnalisées / semaine (cible : 5–10)
- Nb de repos analysés/contribués / semaine (cible : 2–3)
- Spikes tentés / mois (cible : 1–2)
- Qualité de conversion du README (audit mensuel)

**Résultats (lagging, on observe, on ne force pas)**
- ⭐ stars (total + delta hebdo)
- Downloads `hookstack-cli` (hebdo)
- Visites site (GA4)
- Repos soumis via `/contribute`

→ Détail du tracking dans [metrics.md](metrics.md). Le script `metrics.mjs` capture automatiquement stars + downloads.

## Le principe directeur

> **Donne 10× plus de valeur que tu n'en demandes.** Chaque hook partagé, chaque tip Claude Code, chaque analyse de repo offerte construit la crédibilité qui fait qu'un jour quelqu'un star, partage, et te met en front page. Le « regardez mon projet » à froid ne marche jamais dans cette communauté. Le « voici un truc utile, gratuit, concret » marche toujours.
