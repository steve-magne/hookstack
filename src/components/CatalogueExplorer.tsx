'use client'

import { track } from '@/lib/analytics'
import { allHooks, filterHooks } from '@/lib/hooks'
import { useT } from '@/lib/locale-context'
import { splitFlap, spring } from '@/lib/motion'
import { timeline } from '@/lib/timeline'
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
import { Check, ChevronDown, EyeOff, Search, X } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HookConfigurator } from './HookConfigurator'
import { HookModal } from './HookModal'
import { HookRow, type GroupBy } from './HookRow'
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

const DAY = 86_400_000

/** Fenêtre de récence d'un hook (groupage « Recently added »). */
type RecencyWindow = 'week' | 'month' | 'earlier'
function recencyWindow(date: string | undefined, nowMs: number): RecencyWindow {
  if (!date) return 'earlier'
  const t = new Date(`${date}T00:00:00Z`).getTime()
  const days = (nowMs - t) / DAY
  if (days <= 7) return 'week'
  if (days <= 31) return 'month'
  return 'earlier'
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
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
          hasSelection
            ? 'border-white/30 bg-white/10 text-white hover:border-white/50'
            : 'border-zinc-700/70 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
        }`}
      >
        <span>{label}</span>
        {hasSelection && (
          <span className="grid size-[18px] place-items-center rounded-full bg-white/20 font-mono text-[9px] font-bold text-white ring-1 ring-inset ring-white/15">
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
                    type="button"
                    key={opt.value}
                    onClick={() => onToggle(opt.value)}
                    className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                  >
                    <div
                      className={`grid size-3.5 shrink-0 place-items-center rounded-[3px] border transition-colors ${
                        isSelected ? 'border-white bg-white' : 'border-zinc-600'
                      }`}
                    >
                      {isSelected && <Check className="size-2.5 text-zinc-900" strokeWidth={3} />}
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
                  type="button"
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

/** Segmented control de groupage — indicateur glissant partagé (layoutId). */
function GroupBySegmented({
  value,
  onChange,
}: {
  value: GroupBy
  onChange: (g: GroupBy) => void
}) {
  const T = useT()
  const options: [GroupBy, string][] = [
    ['category', T.groupCategory],
    ['event', T.groupEvent],
    ['date', T.groupRecent],
  ]
  return (
    <div className="inline-flex items-center gap-2">
      <span className="hidden text-xs text-zinc-500 sm:inline">{T.groupByLabel}</span>
      <div className="inline-flex rounded-lg border border-zinc-700/70 bg-zinc-900/40 p-0.5">
        {options.map(([val, label]) => {
          const active = value === val
          return (
            <button
              type="button"
              key={val}
              onClick={() => onChange(val)}
              aria-pressed={active}
              className={`relative rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {active && (
                <m.span
                  layoutId="groupby-pill"
                  className="absolute inset-0 rounded-md bg-white/10 ring-1 ring-inset ring-white/15"
                  transition={spring.smooth}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          )
        })}
      </div>
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
  kind: GroupBy
  hooks: Hook[]
}

function buildGroups(
  hooks: Hook[],
  groupBy: GroupBy,
  categoryLabels: Record<string, string>,
  dateBySlug: Map<string, string>,
  nowMs: number,
  windowLabels: Record<RecencyWindow, string>
): Group[] {
  if (groupBy === 'category') {
    const map = new Map<string, Hook[]>()
    for (const h of hooks) {
      const bucket = map.get(h.category)
      if (bucket) bucket.push(h)
      else map.set(h.category, [h])
    }
    const rank = (k: string) => {
      const i = CATEGORY_ORDER.indexOf(k as Category)
      return i === -1 ? CATEGORY_ORDER.length : i
    }
    return [...map.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([key, hooks]) => ({
        key,
        label: categoryLabels[key] ?? key,
        count: hooks.length,
        kind: 'category' as const,
        hooks,
      }))
  }

  if (groupBy === 'date') {
    const order: RecencyWindow[] = ['week', 'month', 'earlier']
    const map = new Map<RecencyWindow, Hook[]>()
    for (const h of hooks) {
      const w = recencyWindow(dateBySlug.get(h.slug), nowMs)
      const bucket = map.get(w)
      if (bucket) bucket.push(h)
      else map.set(w, [h])
    }
    return order
      .filter((w) => map.has(w))
      .map((w) => {
        const hooks = (map.get(w) ?? []).sort((a, b) => {
          const da = dateBySlug.get(a.slug) ?? ''
          const db = dateBySlug.get(b.slug) ?? ''
          return db.localeCompare(da) || a.name.localeCompare(b.name)
        })
        return {
          key: w,
          label: windowLabels[w],
          count: hooks.length,
          kind: 'date' as const,
          hooks,
        }
      })
  }

  // groupBy === 'event'
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
  return [...map.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([key, hooks]) => ({
      key,
      label: key,
      count: hooks.length,
      kind: 'event' as const,
      hooks,
    }))
}

export function CatalogueExplorer({ initialCategory, showConfigurator = true }: Props) {
  const T = useT()
  const [query, setQuery] = useState('')
  // Sur une page catégorie, le groupage par catégorie n'a pas de sens (un seul
  // groupe) — on force l'événement et on masque la bascule. Sinon, défaut =
  // catégorie : le browse s'oriente par « problème résolu ».
  const [groupBy, setGroupBy] = useState<GroupBy>(initialCategory ? 'event' : 'category')
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([])
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([])
  const [selectedStacks, setSelectedStacks] = useState<Stack[]>([])
  const [hideSelected, setHideSelected] = useState(false)
  const [active, setActive] = useState<Hook | null>(null)

  const selectedSlugs = useSelection((s) => s.selected)

  // Date de premier ajout (git) par slug — alimente le groupage « Recently added ».
  const dateBySlug = useMemo(() => {
    const map = new Map<string, string>()
    for (const h of timeline.hooks) map.set(h.slug, h.date)
    return map
  }, [])
  // « Maintenant » figé au montage : les fenêtres sont au jour près, pas de
  // dérive d'hydratation entre serveur et client.
  const nowMs = useMemo(() => Date.now(), [])

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

  const changeGroupBy = useCallback((g: GroupBy) => {
    track('toggle_grouping', { mode: g })
    setGroupBy(g)
  }, [])

  const results = useMemo(() => {
    const filtered = filterHooks(allHooks, {
      query,
      categories: initialCategory ? [initialCategory] : selectedCategories,
      events: selectedEventTypes as HookType[],
      stacks: selectedStacks,
    })
    if (hideSelected && selectedSlugs.length > 0) {
      return filtered.filter((h) => !selectedSlugs.includes(h.slug))
    }
    return filtered
  }, [
    query,
    initialCategory,
    selectedCategories,
    selectedEventTypes,
    selectedStacks,
    hideSelected,
    selectedSlugs,
  ])

  const windowLabels = useMemo<Record<RecencyWindow, string>>(
    () => ({ week: T.recentThisWeek, month: T.recentThisMonth, earlier: T.recentEarlier }),
    [T]
  )

  const groups = useMemo(
    () => buildGroups(results, groupBy, T.categoryLabels, dateBySlug, nowMs, windowLabels),
    [results, groupBy, T, dateBySlug, nowMs, windowLabels]
  )

  // L'intro split-flap rejoue au montage ET à chaque changement d'axe de
  // groupage (DESIGN ⑨c) — pas sur la frappe de recherche.
  const [intro, setIntro] = useState(true)
  // biome-ignore lint/correctness/useExhaustiveDependencies: groupBy n'est pas lu ici, il sert volontairement de trigger (voir commentaire ci-dessus)
  useEffect(() => {
    setIntro(true)
    const t = setTimeout(() => setIntro(false), 2600)
    return () => clearTimeout(t)
  }, [groupBy])

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
      <div data-component="CatalogueExplorer-controls" className="mb-7 space-y-3">
        {/* Ligne 1 — recherche + compteur de sélection */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={T.searchPlaceholder}
              aria-label={T.searchPlaceholder}
              className="w-full rounded-lg border border-zinc-700/70 bg-zinc-900/50 py-2 pl-9 pr-9 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 hover:border-zinc-600 focus:border-white/40"
            />
            <AnimatePresence>
              {query && (
                <m.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={spring.snappy}
                  onClick={() => setQuery('')}
                  aria-label={T.searchClear}
                  className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
                >
                  <X className="size-3.5" />
                </m.button>
              )}
            </AnimatePresence>
          </div>
          {selectedSlugs.length > 0 && (
            <span className="hidden shrink-0 rounded-full border border-zinc-700/70 bg-zinc-900/50 px-3 py-1 font-mono text-xs text-zinc-400 sm:inline-block">
              <span className="text-zinc-100">{selectedSlugs.length}</span> / {allHooks.length}
            </span>
          )}
        </div>

        {/* Ligne 2 — groupage (gauche) + filtres (droite) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {!initialCategory && <GroupBySegmented value={groupBy} onChange={changeGroupBy} />}

          <div className="hidden h-4 w-px bg-zinc-700/50 sm:block" aria-hidden />

          {/* Stack filters */}
          {(Object.keys(STACK_LABELS) as Stack[]).map((s) => {
            const isActive = selectedStacks.includes(s)
            return (
              <button
                type="button"
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

          {/* Category dropdown */}
          {!initialCategory && (
            <FilterDropdown
              label={T.groupCategory}
              options={categoryOptions}
              selected={selectedCategories}
              onToggle={toggleCategory}
              onClear={() => setSelectedCategories([])}
            />
          )}

          {/* Event type dropdown */}
          <FilterDropdown
            label={T.filterEvent}
            options={eventTypeOptions}
            selected={selectedEventTypes}
            onToggle={toggleEventType}
            onClear={() => setSelectedEventTypes([])}
          />

          {/* Hide selected */}
          {selectedSlugs.length > 0 && (
            <button
              type="button"
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
          )}

          {/* Clear all */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                track('reset_all_filters', {
                  stacks: selectedStacks.length,
                  categories: selectedCategories.length,
                  events: selectedEventTypes.length,
                })
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
      </div>

      {/* Grouped list */}
      {results.length > 0 ? (
        <div data-component="CatalogueExplorer-grouped-list" className="space-y-8">
          {groups.map((grp) => (
            <section key={`${grp.kind}:${grp.key}`}>
              <div className="sticky top-[138px] z-20 mb-1 flex items-center gap-3 bg-[#0a0a0a] px-3 pt-2 pb-1 [box-shadow:0_-8px_0_0_#0a0a0a]">
                <h3
                  className={`cursor-default text-sm font-semibold text-zinc-300 transition-colors hover:text-white ${
                    grp.kind === 'event' ? 'font-mono' : 'font-sans'
                  }`}
                >
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
                {grp.hooks.map((h) => (
                  <HookRow
                    key={h.slug}
                    hook={h}
                    groupBy={grp.kind}
                    intro={intro}
                    introDelay={introDelays.get(h.slug) ?? 0}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
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
