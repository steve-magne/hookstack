# Projet Hookstack

## Vue d'ensemble

**Hookstack** est une plateforme web permettant aux développeurs de **découvrir, sélectionner et installer des hooks agentiques** dans leurs projets — **agnostique de l'agent** : Claude Code, OpenAI Codex et GitHub Copilot. Le code d'un hook (`.mjs`) est identique pour les trois agents ; seul le format du fichier de config diffère (`.claude/settings.json` vs `.codex/hooks.json`). Le registre est vivant : il s'enrichit automatiquement en analysant des dépôts GitHub réels soumis.

**Tagline officielle** : *"Get your HookStack in 1 minute"*

**Production** : https://www.hookstack.app

**Catalogue (juin 2026)** : hooks répartis en 6 catégories (security, context, validation, notification, workflow, documentation).

## Thème visuel

- Inspiration : [flowos-skill-store.vercel.app](https://flowos-skill-store.vercel.app/skills/humanizer), Claude Code CLI
- Dark monochrome, terminal, typographie mono pour les éléments techniques
- Direction artistique complète → voir `DESIGN.md` à la racine du projet

## Workflow utilisateur

### Workflow A — Développeur cherche des hooks

**Fast path (< 1 min)** : le développeur arrive sur le site, voit une stack de hooks prédéfinis adaptés à son type de projet et lance directement la commande proposée :

```bash
npx hookstack-cli@latest install --hooks=<slug1>,<slug2>,...
```

**Path avancé (optionnel)** : s'il veut affiner, il explore le catalogue (filtres par event type, catégorie, keyword), sélectionne des hooks supplémentaires via les cases à cocher (persistées en `localStorage`). `HookConfigurator` met à jour la commande en temps réel. Il copie la commande et la colle dans un terminal à la racine de son projet.

Dans tous les cas, le CLI installe les `.mjs` et patche le fichier de config de l'agent ciblé. Le menu interactif demande l'agent cible (ordre : This project → All my projects → Codex profile → Codex project → GitHub Copilot), ou on le choisit via un flag :

- `--project` (défaut) / `--global` → Claude Code (`.claude/settings.json` ou `~/.claude/settings.json`)
- `--codex-project` → OpenAI Codex committé avec le repo (`./.codex/hooks.json`)
- `--codex-profile` → OpenAI Codex pour tous les projets (`~/.codex/hooks.json`)
- `--copilot` → GitHub Copilot (chemins `.claude/` adaptés)

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
