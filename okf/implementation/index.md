# Implementation

* [Catalogue — filtre par thématiques](catalogue-theme-filter.md) - Barre de chips thématiques sur la home pour filtrer le catalogue par cas d'usage, projetées depuis le registre vers une allowlist curée orientée besoin.
* [CLI contribute — renvoyer un hook modifié en PR](cli-contribute-command.md) - Commande npx ... contribute qui pousse une modification locale d'un hook vers le registre upstream via fork + PR.
* [i18n-validation — find qui timeout sur les worktrees](fix-i18n-hook-timeout.md) - Le hook Stop i18n-validation explosait en ETIMEDOUT à chaque session car son find parcourait les node_modules des .claude/worktrees. Correction du prune + silence défensif.
* [Lien "Catalogue" dans la navbar — Implémentation](navbar-catalogue-link.md) - Ajout d'un lien de navigation qui scrolle vers la section catalogue de la home.
* [OKF Knowledge Bundle — Implémentation](okf-knowledge-bundle.md) - Mise en place de la base de connaissance agentique OKF v0.1 sur Hookstack (bundle, scripts/okf.mjs, sous-agent librarian, skill /okf, hooks catalogue).
