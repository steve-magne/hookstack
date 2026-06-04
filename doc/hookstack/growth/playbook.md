# Playbook — le plan séquencé

Cinq phases. **L'ordre est non négociable** : on ne tire pas un spike sur un asset qui ne convertit pas. Chaque play est traduisible en issue GitHub (label `growth`).

---

## Phase 0 — Foundation (semaine 1) · « rendre l'asset convertissant »

Tant que le repo et le site ne convertissent pas un visiteur en star, tout le trafic fuit. **Aucun spike avant que cette phase soit verte.**

**Repo GitHub**
- [ ] Description courte + punchy (la promesse en 1 ligne) — *fait au bootstrap du système*
- [ ] Topics pertinents (`claude-code`, `claude`, `hooks`, `ai-agents`, `devtools`…) — *fait au bootstrap*
- [ ] README hero : titre clair, **GIF de démo** (sélection → commande → install en 30s), proposition de valeur, CTA « ⭐ Star if useful », badges (CodeQL/Snyk déjà là)
- [ ] Social preview image (Settings → Social preview) — c'est l'image qui s'affiche quand le repo est partagé
- [ ] Section « Quickstart » : la commande `npx hookstack-cli@latest install` en évidence
- [ ] Fichier `CONTRIBUTING.md` clair (le contrib engine en dépend)

**Site `hookstack.vercel.app`**
- [ ] CTA GitHub Star visible (header) + lien repo
- [ ] OG image + meta description soignées (partage social)
- [ ] Message post-install du CLI : `✅ hooks installed · star us → github.com/steve-magne/hookstack`
- [ ] GA4 déjà en place (vérifier les events marketing)

**Mesure**
- [ ] `metrics.mjs` opérationnel + premier snapshot loggé (baseline)
- [ ] GitHub Action `growth-metrics` active (snapshot hebdo auto)

---

## Phase 1 — Seed & proof (semaines 2–3) · « 0 → ~100 stars »

Personne ne star un repo à 0⭐ (preuve sociale nulle). On amorce la pompe manuellement.

- [ ] **Réseau perso** : post LinkedIn « j'ai construit X, voici pourquoi » + DM à 10–20 devs qui utilisent Claude Code. Objectif : les 30–50 premières stars.
- [ ] **Cornerstone content** : 1 article de fond — *« The 5 Claude Code hooks I run on every project »* — sur dev.to/blog, avec GIF de démo et lien repo. C'est l'actif qu'on atomisera ensuite (→ threads, posts).
- [ ] **Soft-launch communautés à faible enjeu** : partage *value-first* sur r/ClaudeAI et Discord Anthropic. Pas « regardez mon site » → « j'ai compilé les hooks que j'utilise, c'est gratuit ».
- [ ] **Dogfood visible** : montrer les 62 hooks actifs sur ce repo même = preuve qu'on mange notre nourriture.

> Sortie de phase : ~100 stars, 1 cornerstone publié, README qui convertit. → on peut tirer des spikes.

---

## Phase 2 — Content drumbeat (continu) · « la base composée »

Le rythme qui compose. 3–4 posts/semaine, générés par `/growth-post`, validés par toi.

**Piliers de contenu** (rotation) :
1. **Hook of the week** — un hook concret, copy-paste, orienté résultat. *« Ce hook bloque `rm -rf` avant que Claude l'exécute. 12 lignes. »*
2. **Build-in-public** — chiffres, leçons, coulisses (la communauté dev adore la transparence).
3. **Claude Code education** — tips larges, top-of-funnel (« 7 hooks que personne n'utilise mais devrait »).
4. **Show & tell** — GIF de démo, avant/après.
5. **Community** — mettre en avant un repo contribué / un contributeur.

Règle : **1 idée → N formats**. Un hook = un post X + un post LinkedIn + une ligne de README + un morceau d'article. Cf. [channels.md](channels.md).

**En parallèle — outreach engine** (`/growth-outreach`, 1×/sem) :
- Analyser des repos avec `.claude/` existant → ouvrir une issue/PR *utile* (« j'ai détecté ces hooks, ils sont au catalogue »).
- Chaque repo touché = ambassadeur potentiel.

---

## Phase 3 — Spike events (1–2/mois, timés) · « les paliers »

Les step-changes. À ne tirer **que** quand la foundation est verte. Un spike = une cartouche, on ne la gâche pas.

- [ ] **Show HN** — titre `Show HN: Hookstack – a community catalogue for Claude Code hooks`. Poster mardi–jeudi 8–10h ET. Être présent dans les commentaires les 2 premières heures (déterminant pour le ranking).
- [ ] **Thread X viral** — hook fort en 1ère ligne, GIF de démo, 1 seul CTA. Cf. [channels.md](channels.md).
- [ ] **Reddit** — r/programming, r/SideProject (substance réelle requise), r/ClaudeAI.
- [ ] **Pitch newsletters** — TLDR, Console.dev, Bytes (Cooper Press), Changelog. Email court, 1 lien, 1 GIF. Gratuit, fort levier.
- [ ] **Product Hunt** — option, à garder pour quand la foundation est béton.

> Discipline : **1 spike à la fois**, espacés. On mesure l'effet (snapshot avant/après) pour apprendre ce qui touche.

---

## Phase 4 — Flywheel · « la croissance s'auto-entretient »

Quand ça tourne, chaque brique en alimente une autre :

```
Plus de stars → plus de preuve sociale → plus de conversions
   ↑                                              │
   │                                              ▼
Repos contribués ← outreach ← contenu ← installs CLI → message post-install → partages
```

- Chaque install CLI affiche le lien → partages passifs.
- Chaque repo contribué enrichit le catalogue → meilleur produit → plus de raisons de star.
- Chaque contributeur est un ambassadeur (il parle de « son » hook au catalogue).

À ce stade, `/growth-coach` bascule en mode optimisation : doubler ce qui marche, couper ce qui ne marche pas.

---

## Où vit l'exécution

Chaque `[ ]` ci-dessus devient une **issue GitHub** (label `growth` + sous-label `content`/`outreach`/`spike`/`seo`/`idea`). `/growth-coach` les crée, les priorise et les ferme. Le script `seed-board.mjs` pose les labels + les issues de fondation au premier lancement.
