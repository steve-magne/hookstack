export type Provider = 'claude-code' | 'copilot-vscode'

export type Category =
  | 'security'
  | 'context'
  | 'validation'
  | 'notification'
  | 'workflow'
  | 'documentation'

export type HookType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'PreCompact'
  | 'SessionStart'
  | 'SessionEnd'

export interface CommunityExample {
  repo: string
  issue_url?: string
  file_path?: string
  added_by: string
}

export interface HookImplementation {
  type: 'settings_json'
  config: Record<string, unknown>
  code_snippet?: string
  script_path?: string
}

/**
 * Overlay de traduction d'un hook. Seuls les champs en langage naturel sont
 * traduits ; le français reste la langue canonique (champs racine du Hook).
 * Clé = code de locale (ex. "en"). Voir localizeHook dans lib/hooks.ts.
 */
export interface HookI18n {
  name?: string
  description?: string
  use_cases?: string[]
}

export interface Hook {
  id: string
  slug: string
  name: string
  category: Category
  provider: Provider[]
  hook_type: HookType
  trigger: string
  description: string
  use_cases: string[]
  implementation: HookImplementation
  community_examples: CommunityExample[]
  tags: string[]
  votes: number
  is_must?: boolean
  i18n?: Record<string, HookI18n>
}

export interface ScannedRepo {
  url: string
  name: string
  scanned_at: string
  hooks_found: number
  hooks_added: number
  status: 'success' | 'error' | 'no-hooks'
}

export interface HookTypeInfo {
  label: string
  blocking: boolean | null
}

export const HOOK_TYPE_INFO: Record<HookType, HookTypeInfo> = {
  PreToolUse:       { label: "Avant l'exécution d'un outil · peut bloquer",        blocking: true  },
  PostToolUse:      { label: "Après l'exécution d'un outil · non bloquant",         blocking: false },
  UserPromptSubmit: { label: "À la soumission du prompt · peut enrichir l'input",  blocking: true  },
  Notification:     { label: "Quand Claude veut notifier l'utilisateur",            blocking: false },
  Stop:             { label: "Quand l'agent termine sa tâche",                      blocking: false },
  SubagentStop:     { label: "Quand un sous-agent termine",                         blocking: false },
  PreCompact:       { label: "Avant la compaction du contexte · peut injecter",     blocking: true  },
  SessionStart:     { label: "Au démarrage d'une session Claude Code",              blocking: false },
  SessionEnd:       { label: "À la fermeture d'une session Claude Code",            blocking: false },
}

export const HOOK_TYPES: HookType[] = [
  'PreToolUse',
  'PostToolUse',
  'UserPromptSubmit',
  'Notification',
  'Stop',
  'SubagentStop',
  'PreCompact',
  'SessionStart',
  'SessionEnd',
]

export const CATEGORY_LABELS: Record<Category, string> = {
  security: 'Sécurité',
  context: 'Contexte',
  validation: 'Validation',
  notification: 'Notification',
  workflow: 'Workflow',
  documentation: 'Documentation',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  security:      'bg-white/8 text-zinc-200 ring-white/15',
  context:       'bg-white/6 text-zinc-300 ring-white/12',
  validation:    'bg-white/8 text-zinc-200 ring-white/15',
  notification:  'bg-white/6 text-zinc-300 ring-white/12',
  workflow:      'bg-white/8 text-zinc-200 ring-white/15',
  documentation: 'bg-white/6 text-zinc-300 ring-white/12',
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  'claude-code': 'Claude Code',
  'copilot-vscode': 'GitHub Copilot',
}
