# Metrics — tracking & cibles

> « On ne pilote pas les stars, on pilote les inputs. » Cf. [north-star.md](north-star.md).

## Ce qu'on tracke

| Métrique | Type | Source | Auto ? |
|---|---|---|---|
| ⭐ GitHub stars | Résultat | `gh api` | ✅ `metrics.mjs` |
| Downloads `hookstack-cli` (7j) | Résultat | registry npm (downloads API) | ✅ `metrics.mjs` |
| Visites site | Résultat | GA4 (`hookstack.app`) | ❌ relevé manuel hebdo |
| Repos soumis via `/contribute` | Résultat | GitHub Issues (`repo-submission`) | ✅ `metrics.mjs` |
| Posts publiés / sem | Pilotable | relevé manuel | ❌ |
| Touches d'outreach / sem | Pilotable | Issues (label `outreach`) | ✅ via `gh` |
| Spikes tentés / mois | Pilotable | Issues (label `spike`) | ✅ via `gh` |

## Cibles (leading indicators)

- **3–4** posts de qualité / semaine
- **5–10** touches d'outreach personnalisées / semaine
- **2–3** repos analysés/contribués / semaine
- **1–2** spikes / mois
- Audit conversion README : **1×/mois**

Jalons de résultat (pour calibrer, pas pour stresser) :

| Échéance | Stars (palier réaliste) |
|---|---|
| Fin phase 1 (seed) | ~100 |
| +1 mois drumbeat | 150–300 |
| Après 1er spike réussi | 400–1 500 |
| Après 2–3 spikes + flywheel | 2 000–5 000 |

## Le log

Le script `metrics.mjs` (dans `.claude/skills/growth-coach/scripts/`) écrit une ligne NDJSON par snapshot dans :

```
doc/hookstack/growth/metrics.log.ndjson
```

Format d'une ligne :
```json
{"date":"2026-06-03","stars":0,"npmWeekly":0,"submissions":2,"openGrowthIssues":8}
```

**Lancer un snapshot manuel** :
```bash
node .claude/skills/growth-coach/scripts/metrics.mjs
```

**Automatique** : la GitHub Action `.github/workflows/growth-metrics.yml` lance le snapshot **chaque lundi** et commit le log. Zéro coût (GITHUB_TOKEN + API publique npm), zéro IA.

## Comment lire les chiffres

- **Stars en plateau** malgré du contenu → soit le contenu ne sort pas (reach), soit le README ne convertit pas. Audit foundation.
- **Pic de stars** → identifier la source (quel post/spike), **doubler** ce format.
- **Downloads CLI montent mais pas les stars** → ajouter/renforcer le CTA star (message post-install, site).
- `/growth-coach` lit ce log à chaque run pour diagnostiquer la phase et recommander.
