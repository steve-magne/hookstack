# Personas cibles

> **Portée multi-agent** : depuis le passage du CLI au multi-agent, les personas ne sont plus limités à Claude Code. Un utilisateur d'**OpenAI Codex** ou de **GitHub Copilot** entre dans la cible au même titre — le hook qu'il installe est le même `.mjs`, seul le fichier de config change. Le marché adressable couvre les trois écosystèmes.

## Persona 1 — Le Développeur DevSecOps Enterprise

- **Profil :** Développeur senior en grande entreprise, utilisateur quotidien de GitHub Copilot, OpenAI Codex ou Claude Code
- **Douleur principale :** Passe du temps à configurer des hooks de sécurité, de validation ou de contexte de façon ad hoc, sans référentiel partagé
- **Besoin :** Trouver rapidement les hooks adaptés à son projet et les activer en 2 minutes
- **Usage typique :** Sélectionne 3-4 hooks (PreToolUse sécurité, injection de contexte repo, validation de commandes shell), génère sa config, la colle dans `~/.claude/settings.json`

## Persona 2 — L'Explorateur IA / Early Adopter

- **Profil :** Développeur curieux, actif sur GitHub, contribue à des projets open source
- **Douleur principale :** A déjà mis en place des hooks intéressants mais ne sait pas où les partager
- **Besoin :** Partager son approche, voir comment d'autres ont résolu les mêmes problèmes
- **Usage typique :** Soumet son repo GitHub → reçoit l'URL de l'issue créée → voit son pattern ajouté au registre

## Persona 3 — L'Architecte Platform / AI Champion

- **Profil :** Responsable de l'adoption de GitHub Copilot, OpenAI Codex ou Claude Code dans une organisation
- **Douleur principale :** Doit proposer des standards, des patterns validés et des bonnes pratiques à son équipe — souvent à travers plusieurs agents coexistant dans l'org
- **Besoin :** Un catalogue de référence agnostique de l'agent qu'il peut recommander quel que soit l'outil adopté, et dans lequel il peut contribuer
- **Usage typique :** Browse les hooks par catégorie, exporte une liste de hooks recommandés pour son équipe