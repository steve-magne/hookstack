export type Provider = 'claude-code' | 'copilot-vscode'

export type Stack = 'typescript' | 'python' | 'node'

export const STACK_LABELS: Record<Stack, string> = {
  typescript: 'TypeScript',
  python:     'Python',
  node:       'Node.js',
}

export const STACK_COLORS: Record<Stack, { chip: string; active: string }> = {
  typescript: {
    chip:   'border-blue-500/40 bg-blue-500/10 text-blue-300',
    active: 'border-blue-500/60 bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/30',
  },
  python: {
    chip:   'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
    active: 'border-yellow-500/60 bg-yellow-500/20 text-yellow-200 ring-1 ring-yellow-500/30',
  },
  node: {
    chip:   'border-green-500/40 bg-green-500/10 text-green-300',
    active: 'border-green-500/60 bg-green-500/20 text-green-200 ring-1 ring-green-500/30',
  },
}

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
  | 'PostToolUseFailure'
  | 'UserPromptSubmit'
  | 'Notification'
  | 'Stop'
  | 'SubagentStop'
  | 'SubagentStart'
  | 'PreCompact'
  | 'SessionStart'
  | 'SessionEnd'
  | 'WorktreeCreate'
  | 'PermissionRequest'
  | 'CwdChanged'
  | 'ConfigChange'

export interface CommunityExample {
  repo: string
  issue_url?: string
  file_path?: string
  added_by: string
}

/** Severity counts from a Snyk Code (SAST) scan of the hook's source. */
export interface SnykScan {
  high: number
  medium: number
  low: number
  /** ISO timestamp of the scan that produced these counts. */
  scannedAt: string
}

export interface HookSecurity {
  snyk?: SnykScan
}

export interface HookImplementation {
  type: 'settings_json'
  config: Record<string, unknown>
  code_snippet?: string
  test_snippet?: string
  script_path?: string
  /** Third-party security verdicts, populated by CI (see .claude/scan-snyk.mjs). */
  security?: HookSecurity
}

export interface Hook {
  id: string
  slug: string
  name: string
  /** One-line, outcome-framed payoff shown in the catalogue — the "why install this". */
  benefit?: string
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
  stack?: Stack[]
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
  PreToolUse:          { label: 'Before tool execution · can block',          blocking: true  },
  PostToolUse:         { label: 'After tool execution · non-blocking',         blocking: false },
  PostToolUseFailure:  { label: 'After tool failure · non-blocking',           blocking: false },
  UserPromptSubmit:    { label: 'On prompt submit · can enrich input',         blocking: true  },
  Notification:        { label: 'When Claude wants to notify the user',        blocking: false },
  Stop:                { label: 'When the agent finishes its task',            blocking: false },
  SubagentStop:        { label: 'When a subagent finishes',                    blocking: false },
  SubagentStart:       { label: 'When a subagent starts',                      blocking: false },
  PreCompact:          { label: 'Before context compaction · can inject',      blocking: true  },
  SessionStart:        { label: 'On Claude Code session start',                blocking: false },
  SessionEnd:          { label: 'On Claude Code session end',                  blocking: false },
  WorktreeCreate:      { label: 'On worktree creation',                        blocking: false },
  PermissionRequest:   { label: 'On permission request · can block',           blocking: true  },
  CwdChanged:          { label: 'When working directory changes',              blocking: false },
  ConfigChange:        { label: 'When configuration changes',                  blocking: false },
}

export const HOOK_TYPES: HookType[] = [
  'PreToolUse',
  'PostToolUse',
  'PostToolUseFailure',
  'UserPromptSubmit',
  'PermissionRequest',
  'Notification',
  'Stop',
  'SubagentStop',
  'SubagentStart',
  'PreCompact',
  'SessionStart',
  'SessionEnd',
  'WorktreeCreate',
  'CwdChanged',
  'ConfigChange',
]

export const CATEGORY_LABELS: Record<Category, string> = {
  security:      'Security',
  context:       'Context',
  validation:    'Validation',
  notification:  'Notification',
  workflow:      'Workflow',
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
