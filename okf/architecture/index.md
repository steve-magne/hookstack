# Architecture

* [Outillage Claude Code — hooks, quality gates, guardrails](claude-code-tooling.md) - Pourquoi le repo s'appuie sur des hooks Claude Code pour imposer zéro dette et bloquer les actions dangereuses.
* [Scopes d'installation CLI — 5 scopes, 3 agents](cli-scopes.md) - Les 5 cibles d'installation du CLI hookstack-cli, le format de config et la réécriture des chemins par scope.
* [Portabilité multi-agent — un hook, trois agents](multi-agent-portability.md) - Pourquoi le code .mjs est identique entre Claude Code, Codex et Copilot, seul le format de config diffère.
* [Vue d'ensemble — mono-repo, stack, conventions](overview.md) - Structure du repo Hookstack, stack technique et conventions de code.
* [Sync catalogue → projet (le .mjs est la vérité)](registry-sync.md) - Les .claude/hooks/*.mjs sont la source de vérité du code ; registry.json en dérive code_snippet ; settings.json est reconstruit.
