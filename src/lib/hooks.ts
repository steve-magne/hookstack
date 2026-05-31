import registry from '../../registry/registry.json'
import type { Category, Hook, HookType, Provider } from '@/types/hook'

export const allHooks = registry as Hook[]

export function getHookBySlug(slug: string): Hook | undefined {
  return allHooks.find((h) => h.slug === slug)
}

export interface HookFilters {
  query: string
  categories: Category[]
  providers: Provider[]
  events: HookType[]
}

export const emptyFilters: HookFilters = {
  query: '',
  categories: [],
  providers: [],
  events: [],
}

export function filterHooks(hooks: Hook[], filters: HookFilters): Hook[] {
  const q = filters.query.trim().toLowerCase()
  return hooks.filter((h) => {
    if (filters.categories.length && !filters.categories.includes(h.category)) return false
    if (filters.providers.length && !filters.providers.some((p) => h.provider.includes(p))) return false
    if (filters.events.length && !filters.events.includes(h.hook_type)) return false
    if (q) {
      const haystack = [h.name, h.description, h.hook_type, h.trigger, ...h.tags, ...h.use_cases]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(q)) return false
    }
    return true
  })
}
