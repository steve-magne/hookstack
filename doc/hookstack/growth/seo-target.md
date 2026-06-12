# SEO/GEO target — own "Claude Code hooks"

**Objectif (fixé 2026-06-12)** : être premier sur la requête **"Claude Code hooks"** sur Google ET être la ressource citée par défaut par les moteurs IA (ChatGPT, Perplexity, Claude, Gemini).

## Réalité concurrentielle (recon 2026-06-12)

La doc officielle Anthropic (`code.claude.com/docs/en/hooks`) est imbattable en n°1 absolu. L'objectif opérationnel est donc : **meilleur résultat non-officiel (top 3 Google) + citation LLM par défaut** quand on demande des hooks concrets.

Concurrents constatés en SERP :

| Qui | Quoi | Force |
|---|---|---|
| `disler/claude-code-hooks-mastery` | repo GitHub, 3 800★ | exact-match, hands-on |
| `hesreallyhim/awesome-claude-code` | awesome-list, 46 300★ | méta-ressource citée partout — **sa section Hooks était vide en juin 2026 (fenêtre)** |
| `morphllm.com/claude-code-hooks` | référence JSON exhaustive | SEO agressif, fraîcheur |
| `smartscope.blog`, `blakecrosley.com`, dev.to, eesel.ai | articles longs | profondeur + fraîcheur |
| `aitmpl.com/hooks/` | catalogue + npx CLI | concurrent direct du positionnement |

État HookStack au 2026-06-12 (avant interventions) : **absent de toutes les SERP, d'aucune awesome-list, zéro mention externe.**

## Ce qui est posé (on-site, fait le 2026-06-12)

- 5 guides ≥1 000 mots avec code réel dogfoodé (dont 2 sous-requêtes sans concurrence : `claude-code-hooks-not-working`, `write-your-first-claude-code-hook`)
- Title home exact-match, maillage guides↔hooks↔FAQ, sitemap dédupliqué, llms.txt, JSON-LD complet

## Le levier restant : signaux externes (ordre d'impact)

1. **Awesome-lists** — `hesreallyhim/awesome-claude-code` (issue form) + `rohitg00/awesome-claude-code-toolkit` (PR) → draft : [drafts/awesome-claude-code-pr.md](drafts/awesome-claude-code-pr.md)
2. **Show HN** — catalogue + install 60 s + dogfooding → draft : [drafts/show-hn.md](drafts/show-hn.md)
3. **Article dev.to** — walkthrough secret-detection → draft : [drafts/devto-secret-detection-walkthrough.md](drafts/devto-secret-detection-walkthrough.md)

## Différenciateurs à marteler dans tout contenu

- Code **dogfoodé et testé en prod** (pas des snippets de blog) — chaque hook du catalogue tourne sur le repo lui-même
- Install **npx en 1 commande**
- Catalogue **filtrable par stack** (unique sur le marché)
