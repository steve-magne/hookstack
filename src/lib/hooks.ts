import registry from '../../registry/registry.json'
import type { Category, Hook, HookType, Provider, Stack } from '@/types/hook'

export const allHooks = registry as Hook[]

export function getHookBySlug(slug: string): Hook | undefined {
  return allHooks.find((h) => h.slug === slug)
}

export interface HookFilters {
  query: string
  categories: Category[]
  providers: Provider[]
  events: HookType[]
  stacks: Stack[]
}

export const emptyFilters: HookFilters = {
  query: '',
  categories: [],
  providers: [],
  events: [],
  stacks: [],
}

export function filterHooks(hooks: Hook[], filters: HookFilters): Hook[] {
  const q = filters.query.trim().toLowerCase()
  return hooks.filter((h) => {
    if (filters.categories.length && !filters.categories.includes(h.category)) return false
    if (filters.providers.length && !filters.providers.some((p) => h.provider.includes(p))) return false
    if (filters.events.length && !filters.events.includes(h.hook_type)) return false
    // Stack filter: universal hooks (no stack) always pass; tech-specific hooks
    // are only shown when their stack overlaps with the selection.
    if (filters.stacks.length && h.stack?.length) {
      if (!h.stack.some((s) => filters.stacks.includes(s))) return false
    }
    if (q) {
      const haystack = [h.name, h.benefit ?? '', h.description, h.hook_type, h.trigger, ...h.tags, ...h.use_cases]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
