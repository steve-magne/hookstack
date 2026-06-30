---
type: Reference
title: Portage du bundle vers un autre projet
description: Réutiliser cette structure OKF en copy-paste pour un nouveau projet.
tags: [meta, template, reuse]
timestamp: 2026-06-27T00:00:00Z
---

Ce bundle est conçu pour être **copié-collé** dans n'importe quel projet. La structure et
les fichiers `meta/` sont génériques ; seul le *contenu* des concepts est spécifique à
Hookstack.

# Quoi copier (3 éléments génériques, réutilisables tels quels)

| Élément | Rôle | À adapter ? |
|---|---|---|
| `okf/` (le bundle) | La connaissance | Réécrire le contenu, garder `meta/*` |
| `scripts/okf.mjs` | Moteur : query, map, index, stale, validate (Node, zéro dépendance) | **Non** — générique |
| `.claude/agents/okf-librarian.md` + `.claude/commands/okf.md` | Sous-agent + skill `/okf` | **Non** — génériques |

`scripts/okf.mjs` suppose seulement que `scripts/` et `okf/` sont frères sous la racine du repo.

# Procédure (5 min)

1. **Copier** `okf/`, `scripts/okf.mjs`, `.claude/agents/okf-librarian.md`, `.claude/commands/okf.md`.
2. **Vider le contenu spécifique** du bundle, garder le squelette :
   - Garder tel quel : `meta/agent-protocol.md`, `meta/self-improvement.md`, ce fichier.
   - Réécrire : `vision/*`, `architecture/*`, `marketing/*`, `roadmap/*` avec le nouveau projet.
3. **Réinitialiser** `okf/log.md` avec une seule entrée `**Initialization**` à la date du jour.
4. **Régénérer** les index : `node scripts/okf.mjs index`, puis `node scripts/okf.mjs validate`.
5. **Câbler la lecture** : ajouter dans le `CLAUDE.md`/`AGENTS.md` du projet :

   ```markdown
   ## Source de connaissance — OKF
   Avant toute tâche, consulter le bundle OKF via le sous-agent `okf-librarian`
   (ou `node scripts/okf.mjs query <termes>`). Source de vérité pour l'architecture,
   la vision, le marketing et la roadmap. Maintenir via `okf/meta/self-improvement.md`.
   ```

# Squelette minimal d'un concept (template)

```markdown
---
type: <Type>            # REQUIS — ex: Reference, Playbook, Architecture, Persona
title: <Titre lisible>
description: <Une phrase résumant le concept.>
tags: [<tag>, <tag>]
timestamp: <ISO 8601>
---

# <Section structurée>

Contenu en markdown structuré (listes, tableaux, blocs de code).
Lier les concepts voisins via [texte](/chemin.md).
```

# Conformité OKF (à respecter en portant)

- Chaque `.md` non réservé a un frontmatter YAML parseable avec un champ `type` non vide.
- `index.md` n'a **pas** de frontmatter (sauf `okf_version` à la racine).
- `log.md` : entrées groupées par date `YYYY-MM-DD`, plus récente en haut.
- Liens internes en forme bundle-relative `/dossier/concept.md` (stable au déplacement).

# Citations

[1] [OKF SPEC v0.1 §9 Conformance](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
