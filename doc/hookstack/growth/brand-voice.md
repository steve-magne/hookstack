# Brand voice & banque de messages

La voix de Hookstack en growth = **exactement** celle du produit : dev-to-dev, concrète, orientée résultat. On vole la philosophie du champ `benefit` du registre (« pourquoi je l'installe », pas « ce que ça fait »).

## La voix en 5 règles

1. **Show, don't tell.** Un GIF de 8s > 3 paragraphes. Du code réel > des adjectifs.
2. **Lead with the result.** « Bloque `rm -rf` avant exécution » > « hook de sécurité PreToolUse configurable ».
3. **Concret et chiffré.** « 12 lignes », « 62 hooks », « en 60 secondes ». Les nombres crédibilisent.
4. **Pas de hype.** Bannis : *revolutionary, game-changer, supercharge, unleash, 10x your, the ultimate, seamless, effortless*. Ça sent l'IA marketeuse et la communauté dev le rejette.
5. **Humble + utile.** Tu offres un truc, tu ne vends pas. « voici ce que j'utilise », pas « vous devez utiliser ».

## Do / Don't

| ✅ Do | ❌ Don't |
|---|---|
| « Here's a hook that blocks dangerous shell commands. Copy-paste. » | « Revolutionize your Claude Code workflow! » |
| Montrer le code / le GIF directement | Renvoyer vers une landing avant d'avoir donné de la valeur |
| Dire « je » (build-in-public, founder) | Parler comme une corp (« We are excited to announce ») |
| Un seul CTA clair par post | 3 liens + 8 hashtags |
| Répondre à chaque commentaire les 2 premières heures | Poster et disparaître |
| Mentionner que c'est open-source & gratuit | Cacher que tu es l'auteur (Reddit/HN = ban) |

## Messaging — ce qu'on dit / ce qu'on ne dit pas

(Repris et étendu de [`../07-strategie-marketing.md`](../07-strategie-marketing.md).)

**On dit**
- *« Get your HookStack in 1 minute »* (tagline officiel)
- *« The community catalogue for Claude Code hooks »*
- *« Browse → Select → `npx` »* (le pitch en 3 mots)
- *« The hooks I run on every project »* (angle founder/dogfood)

**On ne dit pas** : « une bibliothèque de hooks », « un template », « un générateur de settings.json ». Le deliverable est **toujours** `npx hookstack-cli@latest`, jamais « coller un JSON ».

## Banque d'angles (hooks d'accroche réutilisables)

Première ligne = 80 % du job. Rotation d'angles qui marchent sur cette audience :

- **Le danger évité** : « Claude almost ran `rm -rf` on my repo. This 12-line hook stopped it. »
- **Le chiffre** : « I have 62 hooks running on every Claude Code project. Here are the 5 you'd want first. »
- **Le contrarian** : « Most people configure Claude Code wrong. Hooks fix that. »
- **Le before/after** : « Before: copy-pasting settings.json across repos. After: one `npx` command. »
- **Le tip pur (top-of-funnel)** : « TIL Claude Code can run a script before every Bash command. Here's how I use it. »
- **Le build-in-public** : « Day 30 of building Hookstack. Here's what I learned about Claude Code hooks. »
- **La question** : « What's the first hook you'd add to Claude Code? Mine blocks force-pushes to main. »

## Le CTA (appel à l'action)

Un par post, jamais deux. Par ordre de « demande » croissante :
1. Le plus doux : *« Code's open if you want it: github.com/steve-magne/hookstack »*
2. Moyen : *« Browse the catalogue → hookstack.vercel.app »*
3. Direct (réserve aux audiences chaudes) : *« ⭐ if it's useful — it genuinely helps. »*

## Templates rapides

> Ces gabarits sont le point de départ de `/growth-post`, qui les adapte au canal et au sujet.

**X — Hook of the week**
```
[Angle d'accroche — le danger ou le résultat, 1 ligne]

[2–3 lignes : le quoi, en concret]

[la mécanique en 1 bloc de code ou un GIF]

[CTA doux + lien]
```

**LinkedIn — credibility / build-in-public**
```
[Hook personnel : une galère vécue de dev]

[Le problème, en termes que persona Architecte Platform comprend]

[La solution / ce que j'ai construit, orienté équipe]

[Leçon ou question]

[Lien en 1er commentaire, jamais dans le corps — LinkedIn pénalise les liens sortants]
```

**Reddit / Show HN** — voir [channels.md](channels.md) (règles strictes, ton différent).
