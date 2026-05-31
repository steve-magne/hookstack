'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, m, useAnimationControls } from 'motion/react'
import { Search, X } from 'lucide-react'
import { HookRow } from './HookRow'
import { HookDetailPanel } from './HookDetailPanel'
import { HookConfigurator } from './HookConfigurator'
import { CopySwap } from './CopySwap'
import { sectionReveal, spring, staggerContainer } from '@/lib/motion'
import { allHooks, filterHooks, localizeHook } from '@/lib/hooks'
import { useLocale, useT } from '@/lib/locale-context'
import { useSelection } from '@/store/selection'
import {
  HOOK_TYPE_INFO,
  HOOK_TYPES,
  type Category,
  type Hook,
  type HookType,
} from '@/types/hook'
import { CategoryBadge, HookTypeBadge } from './Badge'

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    setIsTouch(window.matchMedia('(hover: none) and (pointer: coarse)').matches)
  }, [])
  return isTouch
}

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
  const isTouch = useIsTouch()
  const initMust = useSelection((s) => s.initMust)
  const [groupBy, setGroupBy] = useState<GroupBy>('event')
  const [query, setQuery] = useState('')

  // Panneau de détail
  const [panelHook, setPanelHook] = useState<Hook | null>(null)
  const [isPanelModal, setIsPanelModal] = useState(false)
  const panelHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tooltip survol des en-têtes d'événements (petit card flottant, inchangé)
  type EventPreview = { eventType: HookType; count: number; y: number }
  const [eventPreview, setEventPreview] = useState<EventPreview | null>(null)
  const eventHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [cmdCopied, setCmdCopied] = useState(false)
  const selectedSlugs = useSelection((s) => s.selected)
  const selectedCount = selectedSlugs.length

  const mustHooks = useMemo(
    () => allHooks.filter((h) => h.is_must).map((h) => localizeHook(h, locale)),
    [locale]
  )

  // La bannière sticky reflète la sélection en direct : cocher un hook modifie ce lien.
  const installCmd = useMemo(
    () =>
      `claude --plugin-url https://claudehooks.vercel.app/api/plugin?hooks=${allHooks
        .filter((h) => selectedSlugs.includes(h.slug))
        .map((h) => h.slug)
        .join(',')}`,
    [selectedSlugs]
  )

  useEffect(() => {
    initMust(mustHooks.map((h) => h.slug))
  }, [initMust, mustHooks])

  // Pulse de la bannière quand la sélection change → « le lien a été modifié ».
  // Garde-fou 800 ms : ne pas pulser sur l'init (initMust ajoute les must hooks au mount).
  const ringControls = useAnimationControls()
  const countControls = useAnimationControls()
  const prevCount = useRef(selectedCount)
  const pulseReady = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => {
      pulseReady.current = true
    }, 800)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!pulseReady.current) {
      prevCount.current = selectedCount
      return
    }
    if (selectedCount !== prevCount.current) {
      ringControls.start({ opacity: [0, 1, 0], transition: { duration: 0.7, ease: 'easeOut' } })
      countControls.start({ scale: [1, 1.35, 1], transition: { duration: 0.35, ease: 'easeOut' } })
      prevCount.current = selectedCount
    }
  }, [selectedCount, ringControls, countControls])

  // Handlers panneau de détail — mode survol (desktop)
  const handleHover = useCallback((hook: Hook) => {
    if (panelHideTimer.current) clearTimeout(panelHideTimer.current)
    setPanelHook(hook)
    setIsPanelModal(false)
  }, [])

  const handleLeave = useCallback(() => {
    panelHideTimer.current = setTimeout(() => setPanelHook(null), 200)
  }, [])

  const handlePanelEnter = useCallback(() => {
    if (panelHideTimer.current) clearTimeout(panelHideTimer.current)
  }, [])

  const handlePanelLeave = useCallback(() => {
    panelHideTimer.current = setTimeout(() => setPanelHook(null), 200)
  }, [])

  // Handler touch — ouvre le panneau en mode modal
  const handleTap = useCallback((hook: Hook) => {
    if (panelHideTimer.current) clearTimeout(panelHideTimer.current)
    setPanelHook(hook)
    setIsPanelModal(true)
  }, [])

  const handlePanelClose = useCallback(() => {
    if (panelHideTimer.current) clearTimeout(panelHideTimer.current)
    setPanelHook(null)
    setIsPanelModal(false)
  }, [])

  // Handlers tooltip en-têtes d'événements
  const handleEventHover = useCallback((eventType: HookType, count: number, y: number) => {
    if (eventHideTimer.current) clearTimeout(eventHideTimer.current)
    setEventPreview({ eventType, count, y })
  }, [])

  const handleEventLeave = useCallback(() => {
    eventHideTimer.current = setTimeout(() => setEventPreview(null), 90)
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
      {/* Bannière d'installation — sticky, reflète la sélection en direct + pulse au changement */}
      <div className="sticky top-14 z-30 mb-8 rounded-xl border border-zinc-700 bg-[#0d0d14] px-4 py-3 shadow-lg shadow-black/30">
        <m.span
          aria-hidden
          initial={{ opacity: 0 }}
          animate={ringControls}
          className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-indigo-400/70"
        />
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <p className="text-xs text-zinc-500">{T.pluginInstallHint}</p>
          <m.span
            animate={countControls}
            className="inline-flex origin-center items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium tabular-nums text-indigo-300 ring-1 ring-inset ring-indigo-500/25"
          >
            {selectedCount} / {allHooks.length} hook{allHooks.length > 1 ? 's' : ''}
          </m.span>
        </div>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 overflow-hidden">
            <code className="block truncate font-mono text-xs text-zinc-100 sm:text-sm">{installCmd}</code>
          </div>
          <button
            aria-label={cmdCopied ? T.copied : T.copy}
            onClick={async () => {
              await navigator.clipboard.writeText(installCmd)
              setCmdCopied(true)
              setTimeout(() => setCmdCopied(false), 1500)
            }}
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors sm:py-1.5"
          >
            <CopySwap copied={cmdCopied} />
            <span className="hidden sm:inline">{cmdCopied ? T.copied : T.copy}</span>
          </button>
        </div>
      </div>

      {/* Contrôles */}
      <div className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={T.searchPlaceholder}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] py-2.5 pl-10 pr-9 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:border-white/40 focus:ring-1 focus:ring-white/10 focus:outline-none transition-colors"
            />
            {hasActive && (
              <button
                onClick={reset}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Bascule de regroupement */}
          <div className="inline-flex self-end shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 sm:self-auto">
            {(['event', 'category'] as GroupBy[]).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                aria-pressed={groupBy === g}
                className={`relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  groupBy === g ? 'text-zinc-900' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {groupBy === g && (
                  <m.span
                    layoutId="groupToggle"
                    transition={spring.smooth}
                    className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  />
                )}
                <span className="relative z-10">
                  {g === 'event' ? T.groupByEvent : T.groupByCategory}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Liste groupée — cascade à l'entrée, FLIP au filtrage */}
      {results.length > 0 ? (
        <m.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
          <AnimatePresence mode="popLayout">
            {groups.map((grp) => (
              <m.section
                key={grp.key}
                layout
                variants={sectionReveal}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={spring.smooth}
              >
                <div className="mb-1 flex items-center gap-3 px-3">
                  <h3
                    onMouseEnter={grp.isEvent ? (e) => handleEventHover(grp.key as HookType, grp.count, e.currentTarget.getBoundingClientRect().top) : undefined}
                    onMouseLeave={grp.isEvent ? handleEventLeave : undefined}
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
                  <AnimatePresence mode="popLayout">
                    {grp.hooks.map((h) => (
                      <HookRow
                        key={h.slug}
                        hook={h}
                        groupBy={groupBy}
                        onHover={handleHover}
                        onLeave={handleLeave}
                        onTap={isTouch ? handleTap : undefined}
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

      {/* Tooltip survol des en-têtes d'événements — petit card flottant */}
      {eventPreview && (() => {
        const info = HOOK_TYPE_INFO[eventPreview.eventType]
        if (!info) return null
        return (
          <div
            style={{
              position: 'fixed',
              left: 24,
              top: Math.max(80, Math.min(eventPreview.y - 12, (typeof window !== 'undefined' ? window.innerHeight : 700) - 140)),
            }}
            className="pointer-events-none z-50 hidden w-64 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-md lg:block"
          >
            <p className="mb-1 font-mono text-sm font-semibold text-white">{eventPreview.eventType}</p>
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
                {eventPreview.count} hook{eventPreview.count > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )
      })()}

      {/* Panneau de détail — backdrop modal (touch) */}
      <AnimatePresence>
        {panelHook && isPanelModal && (
          <m.div
            key="detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={handlePanelClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
          />
        )}
        {panelHook && (
          <HookDetailPanel
            key="detail-panel"
            hook={panelHook}
            onClose={handlePanelClose}
            modal={isPanelModal}
            onPanelEnter={handlePanelEnter}
            onPanelLeave={handlePanelLeave}
          />
        )}
      </AnimatePresence>

      {showConfigurator && (
        <section id="config" className="mt-12 scroll-mt-20">
          <HookConfigurator />
        </section>
      )}
    </div>
  )
}
