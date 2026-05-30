'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { HookRow } from './HookRow'
import { HookModal } from './HookModal'
import { HookConfigurator } from './HookConfigurator'
import { allHooks, filterHooks, localizeHook } from '@/lib/hooks'
import { useLocale, useT } from '@/lib/locale-context'
import {
  HOOK_TYPE_INFO,
  HOOK_TYPES,
  type Category,
  type Hook,
  type HookType,
} from '@/types/hook'
import { CategoryBadge, HookTypeBadge } from './Badge'

type GroupBy = 'event' | 'category'

const CATEGORY_ORDER: Category[] = [
  'security',
  'context',
  'validation',
  'notification',
  'workflow',
  'documentation',
]
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
  const locale = useLocale()
  const [groupBy, setGroupBy] = useState<GroupBy>('event')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<Hook | null>(null)
  type Preview =
    | { kind: 'hook'; hook: Hook; y: number }
    | { kind: 'event'; eventType: HookType; count: number; y: number }
  const [preview, setPreview] = useState<Preview | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleHover = useCallback((hook: Hook, y: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setPreview({ kind: 'hook', hook, y })
  }, [])

  const handleEventHover = useCallback((eventType: HookType, count: number, y: number) => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    setPreview({ kind: 'event', eventType, count, y })
  }, [])

  const handleLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setPreview(null), 90)
  }, [])

  const localizedHooks = useMemo(
    () => allHooks.map((h) => localizeHook(h, locale)),
    [locale]
  )

  const results = useMemo(
    () =>
      filterHooks(localizedHooks, {
        query,
        categories: initialCategory ? [initialCategory] : [],
        providers: [],
        events: [],
      }),
    [localizedHooks, query, initialCategory]
  )

  const groups = useMemo(() => buildGroups(results, groupBy, T.categoryLabels), [results, groupBy, T])

  const hasActive = !!query
  const reset = () => setQuery('')

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
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-white/40 focus:ring-1 focus:ring-white/10 focus:outline-none transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bascule de regroupement */}
          <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
            {(['event', 'category'] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                aria-pressed={groupBy === g}
                className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  groupBy === g
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {g === 'event' ? T.groupByEvent : T.groupByCategory}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
          <span>
            {results.length} hook{results.length > 1 ? 's' : ''}
          </span>
          {hasActive && (
            <button onClick={reset} className="flex items-center gap-1 text-zinc-300 hover:text-white">
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
                  onMouseEnter={grp.isEvent ? (e) => handleEventHover(grp.key as HookType, grp.count, e.currentTarget.getBoundingClientRect().top) : undefined}
                  onMouseLeave={grp.isEvent ? handleLeave : undefined}
                  className={`cursor-default text-sm font-semibold text-zinc-300 transition-colors ${
                    grp.isEvent ? 'font-mono hover:text-white' : 'uppercase tracking-wide'
                  }`}
                >
                  {grp.label}
                </h3>
                <span className="text-xs text-zinc-500">{grp.count}</span>
                <div className="h-px flex-1 bg-[var(--color-border)]" />
              </div>
              <div className="divide-y divide-[var(--color-border)]/50">
                {grp.hooks.map((h) => (
                  <HookRow
                    key={h.slug}
                    hook={h}
                    groupBy={groupBy}
                    onOpen={() => setActive(h)}
                    onHover={handleHover}
                    onLeave={handleLeave}
                  />
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

      {/* Carte de prévisualisation flottante — position: fixed, aucun impact sur le flux */}
      {preview && (
        <div
          style={{
            position: 'fixed',
            right: 24,
            top: Math.max(80, Math.min(preview.y - 12, (typeof window !== 'undefined' ? window.innerHeight : 700) - 220)),
          }}
          className="pointer-events-none z-50 hidden w-72 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md xl:block"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {preview.kind === 'hook' ? (
            <>
              <p className="mb-3 text-[13px] leading-relaxed text-zinc-300">{preview.hook.description}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <CategoryBadge category={preview.hook.category} />
                <HookTypeBadge type={preview.hook.hook_type} trigger={preview.hook.trigger} />
              </div>
              {preview.hook.trigger && preview.hook.trigger !== '*' && (
                <div className="mt-2.5 font-mono text-[11px] text-zinc-500">
                  matcher: <span className="text-zinc-400">{preview.hook.trigger}</span>
                </div>
              )}
            </>
          ) : (() => {
            const info = HOOK_TYPE_INFO[preview.eventType]
            return (
              <>
                <p className="mb-1 font-mono text-sm font-semibold text-white">{preview.eventType}</p>
                <p className="mb-3 text-[13px] leading-relaxed text-zinc-400">{info.label}</p>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                    info.blocking
                      ? 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
                      : 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20'
                  }`}>
                    {info.blocking ? '⚡ bloquant' : '· non bloquant'}
                  </span>
                  <span className="font-mono text-[11px] text-zinc-500">
                    {preview.count} hook{preview.count > 1 ? 's' : ''}
                  </span>
                </div>
              </>
            )
          })()}
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
