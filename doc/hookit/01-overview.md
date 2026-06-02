# Projet Hookstack

## Vue d'ensemble

**Hookstack** est le registre communautaire de référence pour les hooks agentiques Claude Code. Les développeurs y découvrent, sélectionnent et installent des hooks en moins d'une minute — sans lire de documentation.

**Tagline** : *Get your claude hooks in 1 minute*

## Positionnement marché

Claude Code a inventé les hooks agentiques et est aujourd'hui la référence du marché. Hookstack est **THE hook registry for Claude Code** — le premier catalogue communautaire structuré autour de cet écosystème. Cette association directe avec Claude Code est un avantage SEO structurel : les développeurs qui cherchent "claude code hooks" ont déjà l'intention d'acheter.

**Nom** : Hookstack a été choisi pour :
- Mémorabilité immédiate (1 mot, ancrage mental "techstack")
- Indépendance de marque — survit si l'écosystème s'étend (Copilot, Cursor…)
- SEO long-traîne : "hook stack", "claude hook stack", "agent hook stack"
- Phrase naturelle entre devs : *"What's your hook stack?"*

**URL de production** : `https://hookstack.vercel.app`
**Package npm** : `npx hookstack@latest`

## Thème visuel

- https://flowos-skill-store.vercel.app/skills/humanizer
- Claude Code CLI
- terminal, monochrome

## Workflow utilisateur

### Workflow A — Développeur cherche des hooks

1. Arriver sur la plateforme et voir tout de suite les use cases qu'il peut implanter dans son projet, il peut les cocher
2. Groupé par 'Event Type', et peut les grouper par catégorie (sécurité, contexte, etc.)
3. Propose une liste de hooks avec leur titre, zone à cocher sur la gauche (Claude Code CLI style)
4. Génère la commande `npx hookstack@latest install --hooks=<slugs>` à coller dans son terminal

### Workflow B — Développeur contribue au registre

1. Cliquer "Contribute a repository"
2. Saisir l'URL de son repo GitHub public
3. La plateforme crée une GitHub Issue sur le repo du registre avec l'URL à analyser
4. Une GitHub Action déclenche Claude Code Agent :
   a. Clone le repo soumis
   b. Analyse les fichiers de config (.claude/, .github/, settings.json…)
   c. Identifie les hooks en place
   d. Compare avec le registre existant
   e. Pour chaque pattern non recensé apportant une valeur ajoutée, l'ajoute au registre
   f. Ouvre une PR sur le registre avec les nouveaux hooks
5. Un mainteneur (ou bot) approuve la PR
6. Le contributeur voit son repo listé comme "hooked repo" dans la section communauté
