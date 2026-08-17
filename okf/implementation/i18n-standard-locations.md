---
type: Playbook
title: i18n — détection et validation de l'ensemble des emplacements standards
description: Le signal i18n du CLI et le hook stop-i18n-validation couvrent désormais tous les emplacements et formats de traduction imposés par les écosystèmes (gettext, Android, Apple, Flutter, Java, Qt) et pas seulement les JSON sous locales/messages/i18n.
tags: [implementation, hooks, cli, i18n, detection]
timestamp: 2026-08-17T00:00:00Z
---

# i18n — détection et validation des emplacements standards

## What

Il n'existe pas un standard i18n unique, mais des standards/de-facto par
écosystème. Le CLI (signal `i18n`) et le hook `stop-i18n-validation`
(validation à chaque Stop) ne couvraient que les conventions web
(`locales/`, `messages/`, `i18n/`) en JSON. Ils couvrent maintenant
l'ensemble des emplacements imposés par les standards :

| Écosystème | Standard | Emplacements / formats |
|---|---|---|
| Web (i18next, next-intl…) | convention | `locales/`, `locale/`, `messages/`, `i18n/`, `translations/`, `lang/`, `l10n/` — JSON |
| GNU gettext | standard | `po/`, `LC_MESSAGES/` — `.po`, `.pot` (msgid, msgid_plural, multiligne, en-tête ignoré, **msgctxt = préfixe de clé** contexte + EOT `\x04`) |
| Android | imposé | `res/values*/strings.xml` (seuls `values` et `values-<locale>` comparés ; `values-night`, `values-land`, `values-sw600dp`… exclus) |
| Apple (iOS/macOS) | imposé | `*.lproj/*.strings` (`Base.lproj`, `<lang>.lproj`) |
| Flutter | de-facto | `l10n/` — `.arb` (méta-clés `@@*` ignorées) |
| Java | de-facto | sous dossier i18n ou `messages*.properties` / `MessagesBundle*` |
| Qt | de-facto | `translations/` — `.ts` (XML, `<source>`) — jamais hors dossier i18n (collision `.ts` TypeScript) |

## Implementation

- **CLI** (`packages/cli/bin/core.mjs`) : `I18N_DIR_RE` étendu
  (translations/lang/l10n/po/LC_MESSAGES/*.lproj) + probe **fichiers**
  (`hasI18nDir` explore désormais aussi les fichiers : `.po`/`.pot`,
  `.ftl`, `.arb`, `.strings`, `strings.xml`, `messages*.properties`).
  Un dossier `values/` nu n'est pas un signal (seul `strings.xml` compte).
- **Hook** (`.claude/hooks/i18n-validation.mjs` + `.py`) : remplacement de
  `findI18nJson` par une chaîne générique et testable :
  - `classifyFile(rel)` → `{ rel, kind, group }` ou null. `kind` pilote
    l'extraction (`extractKeys` par format), `group` décide quels fichiers
    sont comparés entre eux.
  - `groupOf` : clé locale-agnostique. Android `values*` → même groupe via
    basename ; `*.lproj` / `<locale>/LC_MESSAGES` → la locale est dans le
    dossier ; dossiers par-locale (`locales/fr/common.json` vs
    `locales/en/common.json`) → `dirbase` ; sinon groupement par dossier
    (comportement historique). `po` est exclu de la détection de locale
    (`I18N_SEG`) sinon `po/fr.po` + `po/en.po` ne seraient pas comparés.
  - Le chemin `exec` (tests) classifie désormais chaque ligne du `find`.

## Trade-off

- **Android/iOS partiels** : la comparaison est stricte (égalité des jeux de
  clés). Un `values-fr/strings.xml` volontairement partiel (fallback
  autorisé par la plateforme) génère un rapport — c'est le signal « string
  oubliée » recherché. Les qualifiers non-locale (`values-night`…) sont
  exclus pour ne pas noyer sous les faux positifs.
- **`.arb`/`.po`/`.ftl`/`.strings` reconnus où qu'ils soient** : ces
  extensions sont sans ambiguïté. `.json`/`.properties`/`.ts` restent
  conditionnés à un dossier i18n (ou à un nom `messages*`/`strings.xml`).
- **En-tête gettext** : le premier bloc `msgid ""` (métadonnées) est ignoré.
- **msgctxt** : le contexte préfixe la clé (`menu\x04Open`) — deux msgid
  identiques sous des contextes différents restent des clés distinctes, donc
  un contexte oublié dans une locale est signalé (et pas de faux positif
  entre contextes). Le msgid_plural du même bloc conserve le préfixe.
- **Clés du code source** : `run()` scanne aussi les fichiers source
  (TS/JS/Vue/Svelte/Python/PHP, tests exclus) et vérifie que chaque clé
  appelée existe dans l'union des clés de traduction. Appels reconnus :
  `t('…')`, `i18n.t('…')`, `gettext('…')`, `ngettext('a','b',n)` (deux
  clés), `pgettext('ctx','msg')` (clé `ctx\x04msg`, alignée sur msgctxt),
  `_('…')`/`__('…')`/`N_('…')`, `formatMessage({id:'…'})`. Les clés JSON
  sont **aplaties** en chemins pointés (`header.title`) pour matcher les
  références i18next/next-intl ; les méta-clés ARB (`@…`) sont ignorées.

## Where

- `packages/cli/bin/core.mjs` — `I18N_DIR_RE`, `I18N_EXT_RE`, `I18N_FILE_RE`,
  `hasI18nDir` (probe dirs + fichiers).
- `.claude/hooks/i18n-validation.mjs` / `.claude/hooks/i18n-validation.py` —
  `classifyFile`, `groupOf`, `extractKeys` (+ `poKeys`, `ftlKeys`,
  `stringsKeys`, `xmlStringKeys`, `propertiesKeys`, `tsKeys`),
  `findTranslationFiles`, `run`.
- `tests/cli/core.test.mjs` — nouveaux signaux (dossiers standards, fichiers
  de traduction, Android/Java, `values/colors.xml` ignoré).
- `tests/hooks/i18n-validation.test.mjs` / `tests/hooks/test_stop-i18n-validation.py` —
  parité 16/16 (extraction par format, groupement Android/lproj/LC_MESSAGES/
  dossiers par-locale, end-to-end natif).
- `registry/registry.json` — `description` (formats couverts), snippets
  resyncés (code, python, tests).
- `packages/cli/README.md` — ligne du tableau « Smart toolstack detection ».
