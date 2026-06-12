# 07 — Stratégie marketing & distribution

## Public cible principal

Développeurs qui utilisent Claude Code au quotidien — early adopters de l'IA agentique, actifs sur X/Twitter, GitHub, et les communautés comme:
- [r/ClaudeAI](https://reddit.com/r/ClaudeAI)
- Discord Anthropic
- Les issues/discussions des repos Claude Code populaires

## Canaux de distribution

### Canal 1 — Boucle virale organique (prioritaire)

Chaque commande `npx hookstack-cli@latest install` contient l'URL du produit. Quand un développeur partage son `.claude/settings.json` ou son onboarding README → il mentionne Hookstack passivement.

Amplifier : ajouter un message post-install du CLI :
```
✅ 3 hooks installed. Share your stack: https://www.hookstack.app
```

### Canal 2 — GitHub visibility

- Ouvrir des issues/PRs sur les repos avec des `.claude/` existants : "J'ai analysé votre repo, voici les hooks détectés, ils sont dans le catalogue Hookstack"
- Apparaître dans les résultats GitHub quand quelqu'un cherche `claude hooks settings.json`
- Star history visible dans le header → social proof

### Canal 3 — Contenu technique (X/Twitter + blog)

Angle : "Voici les 5 hooks que j'utilise sur chaque projet Claude Code" → démo live → lien vers Hookstack.

Formats qui convertissent dans cette communauté :
- Thread X avec GIF de démo (sélection → commande → install en 30s)
- Article "How I automated my Claude Code setup"
- Vidéo courte (< 3 min) de la démo complète Workflow A

### Canal 4 — Contribution engine

Chaque repo analysé = un potentiel ambassadeur. Le workflow B crée automatiquement une notification au propriétaire du repo → il revient voir son pattern dans le catalogue → il en parle.

## Métriques clés à tracker

| Métrique | Objectif | Source |
|---|---|---|
| Installations CLI (npm downloads) | Croissance hebdomadaire | npm stats |
| Repos soumis via /contribute | 1/jour à terme | GitHub Issues |
| Hooks dans le catalogue | 100+ fin 2026 | registry.json |
| Étoiles GitHub | Social proof | GitHub |

## Messaging

**Ce qu'on ne dit pas** : "une bibliothèque de hooks", "un template", "un générateur de settings.json"

**Ce qu'on dit** :
- "Get your HookStack in 1 minute"
- "The community catalogue for Claude Code hooks"
- "Browse → Select → `npx`" — c'est le pitch en 3 mots

**Angle différenciant** : c'est la communauté qui fait le produit. Plus il y a de repos soumis, meilleur est le catalogue. Chaque utilisateur est aussi un contributeur potentiel.

## Structure de page — principe "action d'abord"

**Décision (2026-06-03)** : la homepage honore la promesse "in 1 minute" en mettant l'action immédiate au premier plan, avant la customisation.

### Ordre des sections

```
1. Titre          — Ship fast. / Break nothing.
2. Sous-titre     — Install a production-ready Claude Code hook workflow in one command
3. Promesse       — "UP AND RUNNING IN 60 SECONDS" (badge uppercase)
4. Install direct — terminal `npx hookstack-cli@latest install` (commande par défaut = hooks recommandés)
5. Caption        — "Will writes the hooks into .claude/hooks and patches settings.json — nothing else."

── or fine-tune it hook by hook ──  (séparateur horizontal)

6. Process        — 01 Browse / 02 Select / 03 Install
7. Filtres + liste catalogue
```

### Pourquoi cet ordre

L'utilisateur dev voit d'abord **l'action** (la commande à copier), pas le catalogue. Le cycle cognitif est :
1. Je comprends la valeur (titre + sous-titre)
2. Je vois que c'est rapide (60 secondes)
3. Je copie la commande → je suis dans le produit en 10 secondes

Ensuite, pour les puristes qui veulent choisir leurs hooks : le séparateur "or fine-tune it hook by hook" est un pivot clair vers le parcours customisation → catalogue.

**Règle à ne pas casser** : l'`InstallCommand` du hero est statique (`npx hookstack-cli@latest install` sans `--hooks=`). C'est volontaire — cette commande installe les hooks recommandés (`default_on`), cohérent avec l'init automatique de `CatalogueExplorer`. La bannière sticky du catalogue, elle, reflète la sélection live.

## Positionnement dans l'écosystème Claude Code

Hookstack n'est pas concurrent d'Anthropic — c'est une couche de valeur au-dessus. Il fait avec Claude Code hooks ce que npm a fait avec Node : un lieu de découverte et de partage. L'angle "communautaire" est la défense concurrentielle principale si Anthropic décidait de construire quelque chose de similaire.
