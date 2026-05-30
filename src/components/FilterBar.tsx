'use client'

import { Search, X } from 'lucide-react'
import {
  CATEGORY_LABELS,
  HOOK_TYPES,
  PROVIDER_LABELS,
  type Category,
  type HookType,
  type Provider,
} from '@/types/hook'
import { allHooks, type HookFilters } from '@/lib/hooks'

interface Props {
  filters: HookFilters
  onChange: (next: HookFilters) => void
  resultCount: number
}

const categories = Object.keys(CATEGORY_LABELS) as Category[]
const providers = Object.keys(PROVIDER_LABELS) as Provider[]
const presentEvents = new Set(allHooks.map((h) => h.hook_type))
const events = HOOK_TYPES.filter((e) => presentEvents.has(e))

export function FilterBar({ filters, onChange, resultCount }: Props) {
  const toggleCategory = (c: Category) =>
    onChange({
      ...filters,
      categories: filters.categories.includes(c)
        ? filters.categories.filter((x) => x !== c)
        : [...filters.categories, c],
    })

  const toggleProvider = (p: Provider) =>
    onChange({
      ...filters,
      providers: filters.providers.includes(p)
        ? filters.providers.filter((x) => x !== p)
        : [...filters.providers, p],
    })

  const toggleEvent = (e: HookType) =>
    onChange({
      ...filters,
      events: filters.events.includes(e)
        ? filters.events.filter((x) => x !== e)
        : [...filters.events, e],
    })

  const hasActive =
    filters.query || filters.categories.length || filters.providers.length || filters.events.length

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm font-medium transition-colors ${
      active
        ? 'bg-[var(--color-brand)] text-white'
        : 'bg-[var(--color-surface)] text-zinc-400 ring-1 ring-inset ring-[var(--color-border)] hover:text-white'
    }`

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={filters.query}
          onChange={(e) => onChange({ ...filters, query: e.target.value })}
          placeholder="Rechercher un hook, un cas d'usage, un tag…"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--color-brand)] focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-zinc-500">Catégorie</span>
        {categories.map((c) => (
          <button key={c} onClick={() => toggleCategory(c)} className={chip(filters.categories.includes(c))}>
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-zinc-500">Provider</span>
        {providers.map((p) => (
          <button key={p} onClick={() => toggleProvider(p)} className={chip(filters.providers.includes(p))}>
            {PROVIDER_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-zinc-500">Event</span>
        {events.map((e) => (
          <button
            key={e}
            onClick={() => toggleEvent(e)}
            className={`${chip(filters.events.includes(e))} font-mono`}
          >
            {e}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>
          {resultCount} hook{resultCount > 1 ? 's' : ''}
        </span>
        {hasActive && (
          <button
            onClick={() => onChange({ query: '', categories: [], providers: [], events: [] })}
            className="flex items-center gap-1 text-zinc-400 hover:text-white"
          >
            <X className="size-3.5" /> Réinitialiser
          </button>
        )}
      </div>
    </div>
  )
}
