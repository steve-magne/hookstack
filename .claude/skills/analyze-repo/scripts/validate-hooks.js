#!/usr/bin/env node
// validate-hooks.js <hooks.json>
// Filtre les hooks selon les bonnes pratiques agentiques avant insertion dans le registre.
//
// Sorties :
//   /tmp/hookstack-hooks-validated.json   — hooks passant la validation (prêts pour le merge)
//   /tmp/hookstack-hooks-rejected.json    — hooks rejetés avec raisons
//   /tmp/hookstack-hooks-recommended.json — sous-ensemble valide, bénéfique pour le projet courant
//   /tmp/hookstack-validation-count.txt   — nombre de hooks valides
import { readFileSync, writeFileSync } from 'node:fs'

const VALID_CATEGORIES = ['security', 'context', 'validation', 'notification', 'workflow', 'documentation']
const VALID_HOOK_TYPES = [
  'PreToolUse', 'PostToolUse', 'UserPromptSubmit', 'Notification',
  'Stop', 'SubagentStop', 'SubagentStart', 'PreCompact', 'SessionStart', 'SessionEnd',
  'WorktreeCreate', 'PermissionRequest', 'PostToolUseFailure',
  'ConfigChange', 'CwdChanged', 'FileChanged', 'TeammateIdle',
  'TaskCreated', 'TaskCompleted', 'StopFailure', 'MessageDisplay',
  'PostToolBatch', 'UserPromptExpansion', 'Setup', 'PermissionDenied',
]

// Commandes pouvant bloquer l'agent si utilisées en pre-hook sur trigger large
const SLOW_PATTERNS = [/\bcurl\b/, /\bwget\b/, /\bnpm (install|ci)\b/, /\bpip install\b/, /\bsleep\s+\d+/]
// Commandes destructives sans garde-fou explicite
const DESTRUCTIVE_PATTERNS = [/rm\s+-[a-z]*r[a-z]*f?\s+\/[^/]/, /\bDROP\s+TABLE\b/i, /\btruncate\s+\/\b/]

const [, , hooksFile] = process.argv
if (!hooksFile) {
  console.error('usage: validate-hooks.js <hooks.json>')
  process.exit(1)
}

const hooks = JSON.parse(readFileSync(hooksFile, 'utf8'))
const validated = []
const rejected = []
const recommended = []
const i18nNotices = [] // overlay EN manquant/incomplet — non bloquant (fallback FR)

for (const hook of hooks) {
  const errors = []
  const warnings = []

  // — Vérifications structurelles —
  if (!hook.id || !hook.slug) errors.push('id ou slug manquant')
  if (!hook.name || hook.name.length < 3) errors.push('name absent ou trop court')
  if (!hook.benefit || hook.benefit.length < 8) errors.push('benefit absent ou trop court')
  if (!VALID_CATEGORIES.includes(hook.category)) errors.push(`category invalide: "${hook.category}"`)
  if (!hook.provider?.length) errors.push('provider absent')
  if (!VALID_HOOK_TYPES.includes(hook.hook_type)) errors.push(`hook_type invalide: "${hook.hook_type}"`)
  if (!hook.description || hook.description.length < 10) errors.push('description absente ou trop courte')
  if (!Array.isArray(hook.use_cases) || hook.use_cases.length === 0) errors.push('use_cases absent ou vide')
  if (!hook.implementation?.config?.hooks) errors.push('implementation.config.hooks absent')

  // Vérifie que la structure de config est exécutable par Claude Code
  const configHooks = hook.implementation?.config?.hooks ?? {}
  const allCommands = Object.values(configHooks)
    .flat()
    .flatMap(entry => entry.hooks ?? [])

  if (allCommands.length > 0 && allCommands.some(h => h.type !== 'command')) {
    errors.push('une entrée de hook n\'a pas type:"command"')
  }
  if (allCommands.length > 0 && allCommands.some(h => !h.command)) {
    errors.push('une entrée de hook n\'a pas de champ command')
  }

  // — Anti-patterns de performance —
  // PreToolUse sur trigger large avec commande lente = latence sur chaque outil
  if (hook.hook_type === 'PreToolUse') {
    const isWideTrigger = !hook.trigger || hook.trigger === '*'
    const cmdText = allCommands.map(h => h.command ?? '').join(' ')
    if (isWideTrigger && SLOW_PATTERNS.some(p => p.test(cmdText))) {
      warnings.push(
        `PreToolUse sur trigger "${hook.trigger ?? '*'}" avec commande potentiellement lente` +
        ` — risque de latence sur chaque appel d'outil`
      )
    }
  }

  // — Anti-patterns de sécurité —
  const fullCommandText = allCommands.map(h => h.command ?? '').join('\n')
  if (DESTRUCTIVE_PATTERNS.some(p => p.test(fullCommandText))) {
    errors.push('commande destructive large détectée (rm -rf / ou équivalent)')
  }

  if (errors.length > 0) {
    rejected.push({ slug: hook.slug ?? '(sans slug)', errors, warnings })
    continue
  }

  validated.push(hook)

  // — Overlay de traduction (catalogue multilingue, fallback FR si absent) —
  const en = hook.i18n?.en
  if (!en || !en.name || !en.description || !Array.isArray(en.use_cases) || en.use_cases.length === 0) {
    i18nNotices.push(`${hook.slug}: overlay i18n.en absent ou incomplet`)
  } else if (en.use_cases.length !== hook.use_cases.length) {
    i18nNotices.push(`${hook.slug}: i18n.en.use_cases (${en.use_cases.length}) ≠ use_cases (${hook.use_cases.length})`)
  }

  // — Critères d'application automatique au projet courant —
  // Bénéfiques universellement : sécurité et validation, implémentation concrète, sans effets réseau en pre-hook
  const isSafeForProject =
    ['security', 'validation'].includes(hook.category) &&
    allCommands.length > 0 &&
    warnings.length === 0

  if (isSafeForProject) recommended.push(hook)
}

writeFileSync('/tmp/hookstack-hooks-validated.json', JSON.stringify(validated, null, 2) + '\n')
writeFileSync('/tmp/hookstack-hooks-rejected.json', JSON.stringify(rejected, null, 2) + '\n')
writeFileSync('/tmp/hookstack-hooks-recommended.json', JSON.stringify(recommended, null, 2) + '\n')
writeFileSync('/tmp/hookstack-validation-count.txt', String(validated.length))

const total = hooks.length
console.log(`Validation : ${validated.length}/${total} valide(s), ${rejected.length} rejeté(s), ${recommended.length} recommandé(s) pour le projet`)

if (rejected.length > 0) {
  console.log('Rejetés :')
  for (const r of rejected) console.log(`  ✗ ${r.slug}: ${r.errors.join('; ')}`)
}
if (i18nNotices.length > 0) {
  console.log('Traductions EN à compléter (non bloquant) :')
  for (const n of i18nNotices) console.log(`  · ${n}`)
}
if (validated.some(h => {
  const cmds = Object.values(h.implementation?.config?.hooks ?? {}).flat().flatMap(e => e.hooks ?? [])
  return SLOW_PATTERNS.some(p => cmds.some(c => p.test(c.command ?? '')))
})) {
  console.log('Avertissements de performance :')
  for (const h of validated) {
    const cmds = Object.values(h.implementation?.config?.hooks ?? {}).flat().flatMap(e => e.hooks ?? [])
    const w = SLOW_PATTERNS.filter(p => cmds.some(c => p.test(c.command ?? '')))
    if (w.length > 0) console.log(`  ⚠ ${h.slug}: commande potentiellement lente en pre-hook`)
  }
}
