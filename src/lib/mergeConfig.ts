import type { Hook } from '@/types/hook'

type HookEntry = { matcher?: string; hooks: unknown[] }
type HooksMap = Record<string, HookEntry[]>

export function mergeSettings(hooks: Hook[]): { hooks: HooksMap } {
  const merged: HooksMap = {}

  for (const hook of hooks) {
    const fragment = (hook.implementation.config as { hooks?: HooksMap }).hooks
    if (!fragment) continue

    for (const [event, entries] of Object.entries(fragment)) {
      merged[event] ??= []
      for (const entry of entries) {
        const existing = merged[event].find((e) => (e.matcher ?? '') === (entry.matcher ?? ''))
        if (existing) {
          existing.hooks.push(...entry.hooks)
        } else {
          merged[event].push({ ...entry, hooks: [...entry.hooks] })
        }
      }
    }
  }

  return { hooks: merged }
}

export function toSettingsJson(hooks: Hook[]): string {
  return JSON.stringify(mergeSettings(hooks), null, 2)
}

export function collectScripts(hooks: Hook[]): { path: string; content: string }[] {
  return hooks
    .filter((h) => h.implementation.script_path && h.implementation.code_snippet)
    .map((h) => ({
      path: h.implementation.script_path as string,
      content: h.implementation.code_snippet as string,
    }))
}
