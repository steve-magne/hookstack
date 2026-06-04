# Projet Hookstack

## Vue d'ensemble

**Hookstack** est une plateforme web permettant aux développeurs de **découvrir, sélectionner et installer des hooks agentiques** dans leurs projets — pour Claude Code. Le registre est vivant : il s'enrichit automatiquement en analysant des dépôts GitHub réels soumis.

**Tagline officielle** : *"Get your HookStack in 1 minute"*

**Production** : https://hookstack.vercel.app

**Catalogue (juin 2026)** : hooks répartis en 6 catégories (security, context, validation, notification, workflow, documentation).

## Thème visuel

- Inspiration : [flowos-skill-store.vercel.app](https://flowos-skill-store.vercel.app/skills/humanizer), Claude Code CLI
- Dark monochrome, terminal, typographie mono pour les éléments techniques
- Direction artistique complète → voir `DESIGN.md` à la racine du projet

## Workflow utilisateur

### Workflow A — Développeur cherche des hooks

1. Arriver sur `/` : voir le catalogue filtrable par event type ou catégorie
2. Sélectionner des hooks via les cases à cocher (persistées en `localStorage`)
3. `HookConfigurator` génère en temps réel la commande :
   ```bash
   npx hookstack-cli@latest install --hooks=<slug1>,<slug2>,...
   ```
4. Copier la commande → la coller dans un terminal à la racine du projet
5. Le CLI installe les `.mjs` dans `.claude/hooks/` et patche `.claude/settings.json`

> **Le deliverable est la commande `npx hookstack-cli@latest`**, jamais un copier-coller de JSON.

### Workflow B — Développeur contribue au registre

1. Cliquer "Contribute" → route `/contribute`
2. Saisir l'URL de son repo GitHub public
3. La plateforme crée une GitHub Issue sur le repo du registre avec l'URL à analyser
4. Une GitHub Action déclenche Claude Code Agent :
   - Clone le repo soumis
   - Analyse les fichiers de config (`.claude/`, `.github/`, `settings.json`, etc.)
   - Identifie les hooks en place, compare avec le registre existant
   - Ouvre une PR `auto-generated` avec les nouveaux hooks détectés
5. Un mainteneur approuve la PR → les hooks entrent dans le catalogue
