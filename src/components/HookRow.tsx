'use client'

import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ShieldCheck } from 'lucide-react'
import type { Hook, Stack } from '@/types/hook'
import { useSelection } from '@/store/selection'
import { useT } from '@/lib/locale-context'
import { CategoryBadge, HookTypeBadge } from './Badge'
import { AnimatedCheck } from './AnimatedCheck'
import { SplitFlap } from './SplitFlap'
import { EASE_OUT, spring } from '@/lib/motion'

export type GroupBy = 'event' | 'category' | 'date'

interface Props {
  hook: Hook
  /** Axe de groupage courant — détermine la méta complémentaire affichée à droite. */
  groupBy: GroupBy
  /** Joue la révélation split-flap du nom (intro de chargement uniquement). */
  intro?: boolean
  /** Retard de départ du split-flap, en ms — cascade entre lignes. */
  introDelay?: number
}

const STACK_MONOGRAM: Record<Stack, string> = { typescript: 'TS', python: 'Py' }
const STACK_MONO_COLOR: Record<Stack, string> = {
  typescript: 'bg-blue-500/20 text-blue-200',
  python: 'bg-yellow-500/20 text-yellow-100',
}

export function HookRow({ hook, groupBy, intro = false, introDelay = 0 }: Props) {
  const T = useT()
  const selected = useSelection((s) => s.selected.includes(hook.slug))
  const toggle = useSelection((s) => s.toggle)
  const [expanded, setExpanded] = useState(false)

  // Méta complémentaire à l'axe de groupage : quand on regroupe par catégorie,
  // l'info utile restante est l'événement ; sinon c'est la catégorie.
  const meta =
    groupBy === 'category' ? (
      <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
    ) : (
      <CategoryBadge category={hook.category} />
    )

  return (
    <m.div
      data-component="HookRow"
      layout
      initial={false}
      transition={spring.smooth}
    >
      {/* Ligne — clic = expand/collapse */}
      <div
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className="group flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] focus:outline-none focus-visible:border-white/40"
      >
        {/* Checkbox — clic ici seulement = sélection / désélection */}
        <m.span
          data-component="HookRow-checkbox"
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation()
            toggle(hook.slug)
          }}
          aria-label={selected ? T.removeFromSelection : T.addToSelection}
          className="-m-1 mt-0.5 shrink-0 cursor-pointer p-1"
        >
          <span
            className={`flex size-5 items-center justify-center rounded-md border-2 transition-colors ${
              selected
                ? 'border-white bg-white text-zinc-900'
                : 'border-zinc-600 text-zinc-400 hover:border-white/70'
            }`}
          >
            <AnimatedCheck checked={selected} />
          </span>
        </m.span>

        {/* Nom (ligne 1) + benefit toujours visible (ligne 2) */}
        <div data-component="HookRow-name" className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate font-medium text-zinc-100 group-hover:text-white">
              <SplitFlap text={hook.name} play={intro} delay={introDelay} />
            </h4>
            {hook.default_on && (
              <ShieldCheck className="size-3.5 shrink-0 text-zinc-300" aria-label={T.mustPreselected} />
            )}
            {hook.stack?.map((s) => (
              <span
                key={s}
                className={`grid size-4 shrink-0 place-items-center rounded-[4px] font-mono text-[9px] font-bold leading-none ${STACK_MONO_COLOR[s]}`}
                aria-label={s}
                title={s}
              >
                {STACK_MONOGRAM[s]}
              </span>
            ))}
          </div>

          {hook.benefit && (
            <p
              data-component="HookRow-benefit"
              className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-zinc-400 group-hover:text-zinc-300 sm:truncate"
            >
              {hook.benefit}
            </p>
          )}

          {/* Méta (mobile) — sous le benefit */}
          <div className="mt-1.5 sm:hidden">{meta}</div>
        </div>

        {/* Méta (desktop) — alignée au ras du nom */}
        <div data-component="HookRow-meta" className="hidden shrink-0 pt-0.5 sm:block">
          {meta}
        </div>
      </div>

      {/* Panneau expand — details inline */}
      <AnimatePresence initial={false}>
        {expanded && (
          <m.div
            key="expand"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT }}
            style={{ overflow: 'hidden' }}
          >
            <div className="mx-2 mb-3 mt-0.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
              {/* Description — lead du panneau (le benefit est déjà sur la ligne) */}
              <p className="text-[13px] leading-relaxed text-zinc-300">{hook.description}</p>

              {/* Badges */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <CategoryBadge category={hook.category} />
                <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
              </div>

              {/* Matcher */}
              {hook.trigger && hook.trigger !== '*' && (
                <div className="mt-2.5 font-mono text-[11px] text-zinc-500">
                  matcher: <span className="text-zinc-400">{hook.trigger}</span>
                </div>
              )}

              {/* Use cases */}
              {hook.use_cases && hook.use_cases.length > 0 && (
                <div className="mt-3.5 border-t border-white/[0.06] pt-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                    {T.useCases}
                  </p>
                  <ul className="space-y-1">
                    {hook.use_cases.slice(0, 3).map((uc, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-[12px] leading-snug text-zinc-400"
                      >
                        <span className="mt-[3px] shrink-0 text-zinc-600">–</span>
                        {uc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Hint sélection */}
              <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-zinc-500">
                {hook.default_on ? (
                  <>
                    <ShieldCheck className="size-3.5 text-zinc-300" />
                    <span className="text-zinc-300">{T.previewMustHint}</span>
                  </>
                ) : (
                  <span>
                    {selected ? T.removeFromSelection : T.addToSelection} — check the box above
                  </span>
                )}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}
