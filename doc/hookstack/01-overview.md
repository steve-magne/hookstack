# Projet Hookstack

## Vue d'ensemble

**Hookstack** est une plateforme web communautaire permettant aux développeurs de **découvrir, sélectionner et implémenter des hooks agentiques** dans leurs projets — principalement pour Claude Code (GitHub Copilot à venir). Le registre est vivant : il s'enrichit automatiquement en analysant des dépôts GitHub réels soumis par la communauté, et scanne les projets open source populaires pour identifier les patterns émergents.

## Theme visuel

- <https://flowos-skill-store.vercel.app/skills/humanizer>
- Claude Code CLI
- terminal, monochrome
  
## Workflow utilisateur

### Workflow A — Développeur cherche des hooks

1. Arriver sur la plateforme et voir tout de suite les uses cases qu il peut implanter dans ses hooks de projet, il peut les cocher
2. Groupé par 'Event Type' , et peut les grouper par catégorie (sécurité, contexte, etc.)
3. Propose une liste de hooks de hook avec leurs titre, il y a une zone a cocher sur la gauche permettant de sélectionner ceux qu'il veut mettre en place dans son projet (Claude Code CLI Style)
4. Le prompt est copié dans son clipboard manager, on le composeille de le coller dans claude code

### Workflow B — Développeur contribue au registre

1. Cliquer "Contribuer mon projet"
2. Saisir l'URL de son repo GitHub public
3. La plateforme crée une GitHub Issue sur le repo du registre
   avec l'URL du repo à analyser
4. Une GitHub Action déclenche Claude Code Agent :
   a. Clone le repo soumis
   b. Analyse les fichiers de config (.claude/, .github/, settings.json, etc.)
   c. Identifie les hooks en place
   d. Compare avec le registre existant
   e. Pour chaque pattern non recensé et apportant une plue value potentielle l'ajoute à la base de connaissance, et l'ajoute dans le hook du projet lui meme si cela apporte une plue value pour le projet.
   f. Ouvre un PR sur le registre avec les nouveaux hooks
5. Un mainteneur (ou bot) approuve le PR
6. Le contributeur voit son repo listé comme "repo hooké" dans la section "Contributions de la communauté"
