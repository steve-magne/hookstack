'use client'

import { useMemo, useState } from 'react'
import { FilterBar } from './FilterBar'
import { HookCard } from './HookCard'
import { HookConfigurator } from './HookConfigurator'
import { allHooks, emptyFilters, filterHooks } from '@/lib/hooks'
import type { Category } from '@/types/hook'

interface Props {
  initialCategory?: Category | null
  showConfigurator?: boolean
}

export function CatalogueExplorer({ initialCategory, showConfigurator = true }: Props) {
  const [filters, setFilters] = useState({
    ...emptyFilters,
    categories: initialCategory ? [initialCategory] : [],
  })

  const results = useMemo(() => filterHooks(allHooks, filters), [filters])

  return (
    <div>
      <div className="mb-8">
        <FilterBar filters={filters} onChange={setFilters} resultCount={results.length} />
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((h) => (
            <HookCard key={h.slug} hook={h} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center text-zinc-500">
          Aucun hook ne correspond à ces filtres.
        </div>
      )}

      {showConfigurator && (
        <section id="config" className="mt-12 scroll-mt-20">
          <HookConfigurator />
        </section>
      )}
    </div>
  )
}
