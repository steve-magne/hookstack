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
✅ 3 hooks installed. Share your stack: https://hookstack.vercel.app
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

## Positionnement dans l'écosystème Claude Code

Hookstack n'est pas concurrent d'Anthropic — c'est une couche de valeur au-dessus. Il fait avec Claude Code hooks ce que npm a fait avec Node : un lieu de découverte et de partage. L'angle "communautaire" est la défense concurrentielle principale si Anthropic décidait de construire quelque chose de similaire.
