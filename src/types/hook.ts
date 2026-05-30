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
}

export interface ScannedRepo {
  url: string
  name: string
  scanned_at: string
  hooks_found: number
  hooks_added: number
  status: 'success' | 'error' | 'no-hooks'
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
  security: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  context: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  validation: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  notification: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
  workflow: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  documentation: 'bg-teal-500/15 text-teal-300 ring-teal-500/30',
}

export const PROVIDER_LABELS: Record<Provider, string> = {
  'claude-code': 'Claude Code',
  'copilot-vscode': 'GitHub Copilot',
}
