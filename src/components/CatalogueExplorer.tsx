'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { HookRow } from './HookRow'
import { HookModal } from './HookModal'
import { HookConfigurator } from './HookConfigurator'
import { allHooks, filterHooks } from '@/lib/hooks'
import { useT } from '@/lib/locale-context'
import {
  HOOK_TYPES,
  PROVIDER_LABELS,
  type Category,
  type Hook,
  type Provider,
} from '@/types/hook'

type GroupBy = 'event' | 'category'

const CATEGORY_ORDER: Category[] = [
  'security',
  'context',
  'validation',
  'notification',
  'workflow',
  'documentation',
]
const providers = Object.keys(PROVIDER_LABELS) as Provider[]

interface Props {
  initialCategory?: Category | null
  showConfigurator?: boolean
}

interface Group {
  key: string
  label: string
  count: number
  isEvent: boolean
  hooks: Hook[]
}

function buildGroups(hooks: Hook[], groupBy: GroupBy, categoryLabels: Record<string, string>): Group[] {
  const map = new Map<string, Hook[]>()
  for (const h of hooks) {
    const key = groupBy === 'event' ? h.hook_type : h.category
    const bucket = map.get(key)
    if (bucket) bucket.push(h)
    else map.set(key, [h])
  }

  const order = (groupBy === 'event' ? HOOK_TYPES : CATEGORY_ORDER) as string[]
  const rank = (k: string) => {
    const i = order.indexOf(k)
    return i === -1 ? order.length : i
  }

  return [...map.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((key) => ({
      key,
      label: groupBy === 'event' ? key : categoryLabels[key] ?? key,
      count: map.get(key)!.length,
      isEvent: groupBy === 'event',
      hooks: map.get(key)!,
    }))
}

export function CatalogueExplorer({ initialCategory, showConfigurator = true }: Props) {
  const T = useT()
  const [groupBy, setGroupBy] = useState<GroupBy>('event')
  const [query, setQuery] = useState('')
  const [activeProviders, setActiveProviders] = useState<Provider[]>([])
  const [active, setActive] = useState<Hook | null>(null)

  const results = useMemo(
    () =>
      filterHooks(allHooks, {
        query,
        categories: initialCategory ? [initialCategory] : [],
        providers: activeProviders,
        events: [],
      }),
    [query, activeProviders, initialCategory]
  )

  const groups = useMemo(() => buildGroups(results, groupBy, T.categoryLabels), [results, groupBy, T])

  const toggleProvider = (p: Provider) =>
    setActiveProviders((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))

  const hasActive = query || activeProviders.length > 0
  const reset = () => {
    setQuery('')
    setActiveProviders([])
  }

  return (
    <div>
      {/* Contrôles */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T.searchPlaceholder}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--color-brand)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Bascule de regroupement */}
          <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            {(['event', 'category'] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                aria-pressed={groupBy === g}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  groupBy === g
                    ? 'bg-[var(--color-brand)] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {g === 'event' ? T.groupByEvent : T.groupByCategory}
              </button>
            ))}
          </div>

          {/* Filtre provider */}
          <div className="flex flex-wrap items-center gap-2">
            {providers.map((p) => {
              const on = activeProviders.includes(p)
              return (
                <button
                  key={p}
                  onClick={() => toggleProvider(p)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                    on
                      ? 'bg-[var(--color-brand)] text-white'
                      : 'bg-[var(--color-surface)] text-zinc-400 ring-1 ring-inset ring-[var(--color-border)] hover:text-white'
                  }`}
                >
                  {PROVIDER_LABELS[p]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>
            {results.length} hook{results.length > 1 ? 's' : ''}
          </span>
          {hasActive && (
            <button onClick={reset} className="flex items-center gap-1 text-zinc-400 hover:text-white">
              <X className="size-3.5" /> {T.reset}
            </button>
          )}
        </div>
      </div>

      {/* Liste groupée */}
      {results.length > 0 ? (
        <div className="space-y-8">
          {groups.map((grp) => (
            <section key={grp.key}>
              <div className="mb-1 flex items-center gap-3 px-3">
                <h3
                  className={`text-sm font-semibold text-zinc-300 ${
                    grp.isEvent ? 'font-mono' : 'uppercase tracking-wide'
                  }`}
                >
                  {grp.label}
                </h3>
                <span className="text-xs text-zinc-600">{grp.count}</span>
                <div className="h-px flex-1 bg-[var(--color-border)]/60" />
              </div>
              <div className="divide-y divide-[var(--color-border)]/30">
                {grp.hooks.map((h) => (
                  <HookRow key={h.slug} hook={h} groupBy={groupBy} onOpen={() => setActive(h)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center text-zinc-500">
          {T.noResults}
        </div>
      )}

      {active && <HookModal hook={active} onClose={() => setActive(null)} />}

      {showConfigurator && (
        <section id="config" className="mt-12 scroll-mt-20">
          <HookConfigurator />
        </section>
      )}
    </div>
  )
}
