---
type: Playbook
title: Lien "Catalogue" dans la navbar — Implémentation
description: Ajout d'un lien de navigation qui scrolle vers la section catalogue de la home.
tags: [implementation, frontend, navigation]
timestamp: 2026-07-01T00:00:00Z
---

# What

Ajout d'un lien "Catalogue" dans `HeaderNav` ([`src/components/Header.tsx`](../../src/components/Header.tsx)), positionné en premier (avant Guides/Evolution/About).

# Why

La home ([`src/app/page.tsx`](../../src/app/page.tsx)) a déjà une section `id="catalogue"`, mais aucun point d'entrée direct depuis la nav pour y sauter — l'utilisateur devait scroller manuellement.

# How

`<Link href="/#catalogue">` réutilisant la clé i18n `T.navCatalogue` (déjà présente dans `src/lib/i18n.ts`, non utilisée jusqu'ici). Le scroll vers l'ancre est géré nativement par le navigateur (comportement standard des hash links) — aucun JS de scroll custom. Fonctionne depuis n'importe quelle page (navigation vers `/` puis scroll) et sur la home elle-même (scroll direct).
