'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, m, useAnimationControls } from 'motion/react'
import { ArrowDownLeft, Check, Layers, ShieldCheck, Zap } from 'lucide-react'
import { HookRow } from './HookRow'
import { HookModal } from './HookModal'
import { HookConfigurator } from './HookConfigurator'
import { InstallCommand } from './InstallCommand'
import { SplitFlap } from './SplitFlap'
import { duration, sectionReveal, spring, splitFlap, staggerContainer } from '@/lib/motion'
import { allHooks, filterHooks } from '@/lib/hooks'
import { useT } from '@/lib/locale-context'
import { useSelection } from '@/store/selection'
import {
  HOOK_TYPE_INFO,
  HOOK_TYPES,
  STACK_COLORS,
  STACK_LABELS,
  type Category,
  type Hook,
  type HookType,
  type Stack,
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

// Monogrammes de stack pour les puces du filtre — repère visuel instantané.
const STACK_MONOGRAM: Record<Stack, string> = {
  typescript: 'TS',
  python: 'Py',
  node: 'JS',
}
const STACK_MONO_COLOR: Record<Stack, string> = {
  typescript: 'bg-blue-500/25 text-blue-100',
  python: 'bg-yellow-500/25 text-yellow-100',
  node: 'bg-green-500/25 text-green-100',
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
  const initMust = useSelection((s) => s.initMust)
  const [groupBy, setGroupBy] = useState<GroupBy>('event')
  const [selectedStacks, setSelectedStacks] = useState<Stack[]>([])
  const [active, setActive] = useState<Hook | null>(null)
  type Preview =
    | { kind: 'hook'; hook: Hook; y: number }
    | { kind: 'event'; eventType: HookType; count: number; y: number }
  const [preview, setPreview] = useState<Preview | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedSlugs = useSelection((s) => s.selected)
  const selectedCount = selectedSlugs.length

  const mustSlugs = useMemo(
    () => allHooks.filter((h) => h.is_must).map((h) => h.slug),
    []
  )

  const isDefault = useMemo(() => {
    if (selectedSlugs.length !== mustSlugs.length) return false
    return selectedSlugs.every((s) => mustSlugs.includes(s))
  }, [selectedSlugs, mustSlugs])

  // Sticky banner reflects live selection: checking a hook updates this command.
  const installCmd = useMemo(() => {
    if (isDefault) return 'npx hookstack-cli@latest install'
    return `npx hookstack-cli@latest install --hooks=${allHooks
      .filter((h) => selectedSlugs.includes(h.slug))
      .map((h) => h.slug)
      .join(',')}`
  }, [selectedSlugs, isDefault])

  useEffect(() => {
    initMust(mustSlugs)
  }, [initMust, mustSlugs])

  // Pulse the banner when selection changes — guard 800ms to skip init.
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

  const toggleStack = useCallback((s: Stack) => {
    setSelectedStacks((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }, [])

  const results = useMemo(
    () =>
      filterHooks(allHooks, {
        query: '',
        categories: initialCategory ? [initialCategory] : [],
        providers: [],
        events: [],
        stacks: selectedStacks,
      }),
    [initialCategory, selectedStacks]
  )

  const groups = useMemo(() => buildGroups(results, groupBy, T.categoryLabels), [results, groupBy, T])

  // Split-flap intro : le tableau « se compose » au chargement *et se recompose*
  // à chaque bascule de regroupement (By event type ↔ By category) — le « reinit ».
  // Passé la fenêtre, les autres re-filtrages affichent le texte directement (FLIP seul).
  const [intro, setIntro] = useState(true)
  useEffect(() => {
    setIntro(true)
    const t = setTimeout(() => setIntro(false), 2600)
    return () => clearTimeout(t)
  }, [groupBy])

  // Retards en cascade (haut → bas) : en-têtes et lignes partagent une horloge
  // commune pour que tout le tableau se résolve d'un même geste.
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

  // Vertical anchor for the floating card — clamped to stay on screen.
  // Used for both `initial` (appear in place) and `animate` (glide between rows).
  const previewY = preview
    ? Math.max(
        80,
        Math.min(preview.y - 12, (typeof window !== 'undefined' ? window.innerHeight : 800) - 400)
      )
    : 0

  return (
    <div data-component="CatalogueExplorer">
      {/* CatalogueExplorer-install-banner — commande sticky sur toute la hauteur du catalogue */}
      <div data-component="CatalogueExplorer-install-banner" className="sticky top-3 z-30 mb-2 bg-[#0a0a0a] [box-shadow:0_-12px_0_0_#0a0a0a]">
        <div className="relative">
          <m.span
            aria-hidden
            initial={{ opacity: 0 }}
            animate={ringControls}
            className="pointer-events-none absolute inset-0 z-10 rounded-xl ring-2 ring-indigo-400/70"
          />
          <InstallCommand
            command={installCmd}
            meta={
              <m.span
                animate={countControls}
                className="inline-flex origin-center items-center rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium tabular-nums text-indigo-300 ring-1 ring-inset ring-indigo-500/25"
              >
                {selectedCount} / {allHooks.length} selected
              </m.span>
            }
          />
        </div>
      </div>
      <p className="mb-8 mt-2 px-1 text-[11px] text-zinc-400">{T.installCaption}</p>

      {/* CatalogueExplorer-controls — stack chooser + grouping toggle */}
      <div data-component="CatalogueExplorer-controls" className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* CatalogueExplorer-stack-filter */}
        <div data-component="CatalogueExplorer-stack-filter" className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300">
            <Layers className="size-3.5 text-zinc-500" />
            {T.stackFilterTitle}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(STACK_LABELS) as Stack[]).map((s) => {
              const active = selectedStacks.includes(s)
              return (
                <button
                  key={s}
                  onClick={() => toggleStack(s)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? STACK_COLORS[s].active
                      : 'border-zinc-700/70 bg-zinc-800/40 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  <span
                    className={`grid size-4 place-items-center rounded-[4px] font-mono text-[9px] font-bold leading-none ${STACK_MONO_COLOR[s]}`}
                  >
                    {STACK_MONOGRAM[s]}
                  </span>
                  {STACK_LABELS[s]}
                  {active && <Check className="size-3" />}
                </button>
              )
            })}
          </div>
          {selectedStacks.length > 0 ? (
            <button
              onClick={() => setSelectedStacks([])}
              className="text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
            >
              {T.stackFilterReset}
            </button>
          ) : (
            <span className="text-[11px] text-zinc-400">{T.stackFilterHint}</span>
          )}
        </div>

        {/* CatalogueExplorer-grouping-toggle */}
        <div data-component="CatalogueExplorer-grouping-toggle" className="inline-flex self-end shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1 sm:self-auto">
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

      {/* CatalogueExplorer-grouped-list — cascade on enter, FLIP on filter */}
      {results.length > 0 ? (
        <m.div data-component="CatalogueExplorer-grouped-list" variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
          <AnimatePresence mode="popLayout">
            {groups.map((grp) => (
              <m.section
                key={grp.key}
                layout
                variants={sectionReveal}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={spring.smooth}
              >
                <div className="sticky top-[116px] z-20 mb-1 flex items-center gap-3 bg-[#0a0a0a] px-3 pt-2 pb-1 [box-shadow:0_-8px_0_0_#0a0a0a]">
                  <h3
                    onMouseEnter={grp.isEvent ? (e) => handleEventHover(grp.key as HookType, grp.count, e.currentTarget.getBoundingClientRect().top) : undefined}
                    onMouseLeave={grp.isEvent ? handleLeave : undefined}
                    className={`cursor-default text-sm font-semibold text-zinc-300 transition-colors ${
                      grp.isEvent ? 'font-mono hover:text-white' : 'uppercase tracking-wide'
                    }`}
                  >
                    <SplitFlap text={grp.label} play={intro} delay={introDelays.get(`grp:${grp.key}`) ?? 0} />
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

      {/* CatalogueExplorer-preview-card — flottante fixe, glisse entre lignes */}
      <AnimatePresence>
        {preview && (
          <m.div
            data-component="CatalogueExplorer-preview-card"
            key="preview-card"
            initial={{ opacity: 0, x: -10, y: previewY }}
            animate={{ opacity: 1, x: 0, y: previewY }}
            exit={{ opacity: 0, x: -10, transition: { duration: duration.micro } }}
            transition={{
              y: spring.gentle,
              x: spring.gentle,
              opacity: { duration: duration.base },
            }}
            style={{ position: 'fixed', left: 24, top: 0 }}
            className="pointer-events-none z-50 hidden w-80 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/50 backdrop-blur-md xl:block"
          >
            {preview.kind === 'hook' ? (
              <>
                {/* Hero: the payoff. Why this hook earns its place. */}
                <div className="flex items-start gap-2.5 border-b border-white/8 bg-indigo-500/[0.07] p-4">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-inset ring-indigo-500/25">
                    <Zap className="size-3.5" fill="currentColor" strokeWidth={0} />
                  </span>
                  <p className="text-[15px] font-semibold leading-snug text-white">
                    <SplitFlap text={preview.hook.benefit ?? preview.hook.name} block />
                  </p>
                </div>

                <div className="p-4">
                  <p className="text-[13px] leading-relaxed text-zinc-400">{preview.hook.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={preview.hook.category} />
                    <HookTypeBadge type={preview.hook.hook_type} trigger={preview.hook.trigger} />
                  </div>
                  {preview.hook.trigger && preview.hook.trigger !== '*' && (
                    <div className="mt-2.5 font-mono text-[11px] text-zinc-500">
                      matcher: <span className="text-zinc-400">{preview.hook.trigger}</span>
                    </div>
                  )}
                  {preview.hook.use_cases && preview.hook.use_cases.length > 0 && (
                    <div className="mt-3.5 border-t border-white/8 pt-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                        Use cases
                      </p>
                      <ul className="space-y-1">
                        {preview.hook.use_cases.slice(0, 3).map((uc, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[12px] leading-snug text-zinc-400">
                            <span className="mt-[3px] shrink-0 text-zinc-600">–</span>
                            {uc}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Nudge toward the action — the card sells, the row commits. */}
                <div className="flex items-center gap-1.5 border-t border-white/8 px-4 py-2.5 text-[11px] font-medium text-indigo-300/90">
                  {preview.hook.is_must ? (
                    <ShieldCheck className="size-3.5" />
                  ) : (
                    <ArrowDownLeft className="size-3.5" />
                  )}
                  {preview.hook.is_must ? T.previewMustHint : T.previewClickToAdd}
                </div>
              </>
            ) : (() => {
              const info = HOOK_TYPE_INFO[preview.eventType]
              if (!info) return null
              return (
                <div className="p-4">
                  <p className="mb-1 font-mono text-sm font-semibold text-white">
                    <SplitFlap text={preview.eventType} />
                  </p>
                  <p className="mb-3 text-[13px] leading-relaxed text-zinc-400">{info.label}</p>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                      info.blocking
                        ? 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
                        : 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20'
                    }`}>
                      {info.blocking ? '⚡ blocking' : '· non-blocking'}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      {preview.count} hook{preview.count > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )
            })()}
          </m.div>
        )}
      </AnimatePresence>

      {/* CatalogueExplorer-configurator */}
      {showConfigurator && (
        <section data-component="CatalogueExplorer-configurator" id="config" className="mt-12 scroll-mt-20">
          <HookConfigurator />
        </section>
      )}
    </div>
  )
}
