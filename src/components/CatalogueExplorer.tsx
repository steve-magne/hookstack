'use client'

import { track } from '@/lib/analytics'
import { allHooks, filterHooks } from '@/lib/hooks'
import { useT } from '@/lib/locale-context'
import { sectionReveal, splitFlap, spring, staggerContainer } from '@/lib/motion'
import { useSelection } from '@/store/selection'
import {
  HOOK_TYPES,
  STACK_COLORS,
  STACK_LABELS,
  type Category,
  type Hook,
  type HookType,
  type Stack,
} from '@/types/hook'
import { Check, ChevronDown, EyeOff, Filter } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CategoryBadge, HookTypeBadge } from './Badge'
import { HookConfigurator } from './HookConfigurator'
import { HookModal } from './HookModal'
import { HookRow } from './HookRow'
import { SplitFlap } from './SplitFlap'

const CATEGORY_ORDER: Category[] = [
  'security',
  'context',
  'validation',
  'notification',
  'workflow',
  'documentation',
]

const STACK_MONOGRAM: Record<Stack, string> = {
  typescript: 'TS',
  python: 'Py',
}
const STACK_MONO_COLOR: Record<Stack, string> = {
  typescript: 'bg-blue-500/25 text-blue-100',
  python: 'bg-yellow-500/25 text-yellow-100',
}

interface FilterOption {
  value: string
  label: string
  count: number
}

function FilterDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string
  options: FilterOption[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const hasSelection = selected.length > 0

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          hasSelection
            ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300 hover:border-indigo-400/60'
            : 'border-zinc-700/70 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
        }`}
      >
        <span>{label}</span>
        {hasSelection && (
          <span className="grid size-[18px] place-items-center rounded-full bg-indigo-500/30 font-mono text-[9px] font-bold text-indigo-200 ring-1 ring-inset ring-indigo-400/20">
            {selected.length}
          </span>
        )}
        <ChevronDown
          className={`size-3 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96, transition: { duration: 0.1 } }}
            transition={spring.smooth}
            className="absolute top-full left-0 z-50 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900/95 shadow-2xl shadow-black/60 backdrop-blur-md"
            style={{ transformOrigin: 'top left' }}
          >
            <div className="max-h-60 overflow-y-auto py-1 [scrollbar-width:thin] [scrollbar-color:rgb(63,63,70)_transparent]">
              {options.map((opt) => {
                const isSelected = selected.includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => onToggle(opt.value)}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                  >
                    <div
                      className={`grid size-3.5 shrink-0 place-items-center rounded-[3px] border transition-colors ${
                        isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-600'
                      }`}
                    >
                      {isSelected && <Check className="size-2.5 text-white" strokeWidth={3} />}
                    </div>
                    <span className={`text-xs transition-colors ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                      {opt.label}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-zinc-600">{opt.count}</span>
                  </button>
                )
              })}
            </div>
            {hasSelection && (
              <div className="border-t border-zinc-700/50 px-3 py-1.5">
                <button
                  onClick={() => {
                    onClear()
                    setOpen(false)
                  }}
                  className="text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-200"
                >
                  Clear
                </button>
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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

function buildGroups(hooks: Hook[], categoryLabels: Record<string, string>): Group[] {
  const map = new Map<string, Hook[]>()
  for (const h of hooks) {
    const bucket = map.get(h.hook_type)
    if (bucket) bucket.push(h)
    else map.set(h.hook_type, [h])
  }

  const order = HOOK_TYPES as string[]
  const rank = (k: string) => {
    const i = order.indexOf(k)
    return i === -1 ? order.length : i
  }

  return [...map.keys()]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
    .map((key) => ({
      key,
      label: key,
      count: map.get(key)!.length,
      isEvent: true,
      hooks: map.get(key)!,
    }))
}

export function CatalogueExplorer({ initialCategory, showConfigurator = true }: Props) {
  const T = useT()
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [selectedStacks, setSelectedStacks] = useState<Stack[]>([])
  const [hideSelected, setHideSelected] = useState(false)
  const [active, setActive] = useState<Hook | null>(null)

  const selectedSlugs = useSelection((s) => s.selected)

  // Counts from the full registry for dropdown display
  const categoryCounts = useMemo(() => {
    const map: Partial<Record<Category, number>> = {}
    for (const h of allHooks) map[h.category] = (map[h.category] ?? 0) + 1
    return map
  }, [])

  const eventTypeCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const h of allHooks) map[h.hook_type] = (map[h.hook_type] ?? 0) + 1
    return map
  }, [])

  const categoryOptions: FilterOption[] = useMemo(
    () =>
      CATEGORY_ORDER.filter((cat) => (categoryCounts[cat] ?? 0) > 0).map((cat) => ({
        value: cat,
        label: T.categoryLabels[cat as keyof typeof T.categoryLabels] ?? cat,
        count: categoryCounts[cat] ?? 0,
      })),
    [T, categoryCounts]
  )

  const eventTypeOptions: FilterOption[] = useMemo(() => {
    const knownOrder = HOOK_TYPES as string[]
    return Object.entries(eventTypeCounts)
      .sort(([a], [b]) => {
        const ia = knownOrder.indexOf(a)
        const ib = knownOrder.indexOf(b)
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return a.localeCompare(b)
      })
      .map(([key, count]) => ({ value: key, label: key, count }))
  }, [eventTypeCounts])

  const toggleStack = useCallback(
    (s: Stack) => {
      track('filter_stack', { stack: s, active: !selectedStacks.includes(s) })
      setSelectedStacks((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
    },
    [selectedStacks]
  )

  const toggleCategory = useCallback((cat: string) => {
    track('filter_category', { category: cat })
    setSelectedCategories((prev) =>
      prev.includes(cat as Category) ? prev.filter((x) => x !== cat) : [...prev, cat as Category]
    )
  }, [])

  const toggleEventType = useCallback((evt: string) => {
    track('filter_event', { event_type: evt })
    setSelectedEventTypes((prev) => (prev.includes(evt) ? prev.filter((x) => x !== evt) : [...prev, evt]))
  }, [])

  const results = useMemo(() => {
    const filtered = filterHooks(allHooks, {
      query: '',
      categories: initialCategory ? [initialCategory] : selectedCategories,
      events: selectedEventTypes as HookType[],
      stacks: selectedStacks,
    })
    if (hideSelected && selectedSlugs.length > 0) {
      return filtered.filter((h) => !selectedSlugs.includes(h.slug))
    }
    return filtered
  }, [initialCategory, selectedCategories, selectedEventTypes, selectedStacks, hideSelected, selectedSlugs])

  const groups = useMemo(() => buildGroups(results, T.categoryLabels), [results, T])

  const [intro, setIntro] = useState(true)
  useEffect(() => {
    setIntro(true)
    const t = setTimeout(() => setIntro(false), 2600)
    return () => clearTimeout(t)
  }, [])

  const introDelays = useMemo(() => {
    const map = new Map<string, number>()
    let row = 0
    for (const g of groups) {
      map.set(`grp:${g.key}`, Math.round(row * splitFlap.rowStep))
      row += 0.5
      for (const h of g.hooks) {
        map.set(h.slug, Math.round(row * splitFlap.rowStep))
        row += 1
      }
    }
    return map
  }, [groups])

  const hasActiveFilters =
    selectedStacks.length > 0 || selectedCategories.length > 0 || selectedEventTypes.length > 0

  return (
    <div data-component="CatalogueExplorer">
      {/* Controls — all filters on one line */}
      <div
        data-component="CatalogueExplorer-controls"
        className="mb-8 flex flex-wrap items-center gap-2 sm:gap-2.5"
      >
        <Filter className="size-3.5 shrink-0 text-zinc-500" aria-hidden />

        {/* Stack filters */}
        {(Object.keys(STACK_LABELS) as Stack[]).map((s) => {
          const isActive = selectedStacks.includes(s)
          return (
            <button
              key={s}
              onClick={() => toggleStack(s)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? STACK_COLORS[s].active
                  : 'border-zinc-700/70 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              <span
                className={`grid size-4 place-items-center rounded-[4px] font-mono text-[9px] font-bold leading-none ${STACK_MONO_COLOR[s]}`}
              >
                {STACK_MONOGRAM[s]}
              </span>
              <span className="hidden sm:inline">{STACK_LABELS[s]}</span>
              {isActive && <Check className="size-3" />}
            </button>
          )
        })}

        <div className="hidden h-4 w-px bg-zinc-700/50 sm:block" aria-hidden />

        {/* Category dropdown */}
        {!initialCategory && (
          <FilterDropdown
            label="Category"
            options={categoryOptions}
            selected={selectedCategories}
            onToggle={toggleCategory}
            onClear={() => setSelectedCategories([])}
          />
        )}

        {/* Event type dropdown */}
        <FilterDropdown
          label="Event type"
          options={eventTypeOptions}
          selected={selectedEventTypes}
          onToggle={toggleEventType}
          onClear={() => setSelectedEventTypes([])}
        />

        {/* Hide selected */}
        {selectedSlugs.length > 0 && (
          <>
            <div className="hidden h-4 w-px bg-zinc-700/50 sm:block" aria-hidden />
            <button
              onClick={() => setHideSelected((v) => !v)}
              aria-pressed={hideSelected}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                hideSelected
                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-300'
                  : 'border-zinc-700/70 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
              }`}
            >
              <EyeOff className="size-3" />
              <span className="hidden sm:inline">{T.filterHideSelected}</span>
              {hideSelected && <Check className="size-3" />}
            </button>
          </>
        )}

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              track('reset_all_filters', { stacks: selectedStacks.length, categories: selectedCategories.length, events: selectedEventTypes.length })
              setSelectedStacks([])
              setSelectedCategories([])
              setSelectedEventTypes([])
            }}
            className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
          >
            {T.stackFilterReset}
          </button>
        )}
      </div>

      {/* Grouped list */}
      {results.length > 0 ? (
        <m.div
          data-component="CatalogueExplorer-grouped-list"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          <AnimatePresence mode="popLayout">
            {groups.map((grp) => (
              <m.section
                key={grp.key}
                layout
                variants={sectionReveal}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={spring.smooth}
              >
                <div className="sticky top-[138px] z-20 mb-1 flex items-center gap-3 bg-[#0a0a0a] px-3 pt-2 pb-1 [box-shadow:0_-8px_0_0_#0a0a0a]">
                  <h3 className="cursor-default font-mono text-sm font-semibold text-zinc-300 transition-colors hover:text-white">
                    <SplitFlap
                      text={grp.label}
                      play={intro}
                      delay={introDelays.get(`grp:${grp.key}`) ?? 0}
                    />
                  </h3>
                  <span className="text-xs text-zinc-500">{grp.count}</span>
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                </div>
                <div className="divide-y divide-[var(--color-border)]/50">
                  <AnimatePresence mode="popLayout">
                    {grp.hooks.map((h) => (
                      <HookRow
                        key={h.slug}
                        hook={h}
                        groupBy="event"
                        intro={intro}
                        introDelay={introDelays.get(h.slug) ?? 0}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </m.section>
            ))}
          </AnimatePresence>
        </m.div>
      ) : (
        <m.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center text-zinc-500"
        >
          {T.noResults}
        </m.div>
      )}

      <AnimatePresence>
        {active && <HookModal key="hook-modal" hook={active} onClose={() => setActive(null)} />}
      </AnimatePresence>

      {/* Configurator */}
      {showConfigurator && (
        <section
          data-component="CatalogueExplorer-configurator"
          id="config"
          className="mt-12 scroll-mt-20"
        >
          <HookConfigurator />
        </section>
      )}
    </div>
  )
}
