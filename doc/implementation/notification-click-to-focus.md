# Notification click-to-focus

## Problème

Le hook `notification-sound` envoyait une notification macOS via `osascript display notification`. Cliquer dessus n'avait aucun comportement utile (parfois ouvrait un fichier) car AppleScript ne supporte pas les actions de clic sur les notifications.

## Solution

Deux changements complémentaires :

### 1. `notification-sound.mjs` — détection de contexte + `terminal-notifier`

Quand `terminal-notifier` est installé (`brew install terminal-notifier`), le hook utilise son flag `-activate <bundleId>` qui ramène automatiquement l'application concernée au premier plan lors du clic.

**Détection du contexte** via `process.env.TERM_PROGRAM` :
- Variable présente et connue → on est dans un terminal → utiliser le bundle ID de ce terminal
- Variable absente ou inconnue → on est dans l'app Claude Code desktop → `com.anthropic.claudefordesktop`

```
TERM_PROGRAM=iTerm.app      → com.googlecode.iterm2
TERM_PROGRAM=Apple_Terminal → com.apple.Terminal
TERM_PROGRAM=WezTerm        → com.github.wez.wezterm
TERM_PROGRAM=ghostty        → com.mitchellh.ghostty
TERM_PROGRAM=vscode         → com.microsoft.VSCode
TERM_PROGRAM=cursor         → com.todesktop.230313mzl4w4u92
(absent)                    → com.anthropic.claudefordesktop
```

Le bundle ID de Claude desktop a été résolu via `mdls -name kMDItemCFBundleIdentifier /Applications/Claude.app` → `com.anthropic.claudefordesktop`.

**Fallback gracieux** : si `terminal-notifier` n'est pas installé, le hook revient au comportement précédent (`afplay` + `osascript display notification`) sans erreur.

**Testabilité** : `hasTerminalNotifier` et `termProgram` sont injectés comme dépendances — testables sans appel système réel. `resolveActivateBundle()` est exportée séparément pour être testée en isolation.

### 2. `packages/cli/bin/core.mjs` — entrée `PREREQ_HINTS`

```js
'notification-sound': 'Optional: brew install terminal-notifier  (enables click-to-focus — opens your terminal or Claude app when notification fires)',
```

Affiché en jaune dans le panneau "Resume installation" du CLI après l'install du hook. Wording `Optional:` (pas `Requires:`) car le hook est fonctionnel sans — seule la fonctionnalité de clic est absente.

## Invariants

- Aucun changement de comportement si `terminal-notifier` n'est pas installé
- Non bloquant : toutes les erreurs sont silencieuses (try/catch global)
- Pas de dépendance Node.js externe ajoutée
- `TERM_PROGRAM` n'est jamais un bloquant — toujours un fallback vers Claude app
