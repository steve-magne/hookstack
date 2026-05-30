import registry from '../../registry/registry.json'
import type { Category, Hook, HookType, Provider } from '@/types/hook'
import type { Locale } from './i18n'

export const allHooks = registry as Hook[]

export function getHookBySlug(slug: string): Hook | undefined {
  return allHooks.find((h) => h.slug === slug)
}

/**
 * Applique l'overlay de traduction d'un hook pour la locale donnée.
 * Le français est canonique : pour 'fr' (ou en l'absence de traduction) on
 * renvoie le hook tel quel. Champ par champ : fallback sur le FR si absent.
 */
export function localizeHook(hook: Hook, locale: Locale): Hook {
  const t = locale === 'fr' ? undefined : hook.i18n?.[locale]
  if (!t) return hook
  return {
    ...hook,
    name: t.name ?? hook.name,
    description: t.description ?? hook.description,
    use_cases: t.use_cases ?? hook.use_cases,
  }
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
