'use client'

import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ShieldCheck, Zap } from 'lucide-react'
import type { Hook } from '@/types/hook'
import { useSelection } from '@/store/selection'
import { useT } from '@/lib/locale-context'
import { CategoryBadge, HookTypeBadge } from './Badge'
import { AnimatedCheck } from './AnimatedCheck'
import { SplitFlap } from './SplitFlap'
import { EASE_OUT, fadeUp, spring } from '@/lib/motion'

interface Props {
  hook: Hook
  groupBy: 'event' | 'category'
  /** Joue la révélation split-flap du nom (intro de chargement uniquement). */
  intro?: boolean
  /** Retard de départ du split-flap, en ms — cascade entre lignes. */
  introDelay?: number
}

export function HookRow({ hook, groupBy, intro = false, introDelay = 0 }: Props) {
  const T = useT()
  const selected = useSelection((s) => s.selected.includes(hook.slug))
  const toggle = useSelection((s) => s.toggle)
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <m.div
      data-component="HookRow"
      layout
      variants={fadeUp}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={spring.smooth}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Row header — clic = expand/collapse */}
      <div
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] focus:outline-none focus-visible:border-white/40"
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
          className="-m-1 shrink-0 cursor-pointer p-1"
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

        {/* Name */}
        <div data-component="HookRow-name" className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate font-medium text-zinc-200 group-hover:text-white">
              <SplitFlap text={hook.name} play={intro} delay={introDelay} />
            </h4>
            {hook.default_on && (
              <ShieldCheck className="size-3 shrink-0 text-zinc-300" aria-label={T.mustPreselected} />
            )}
          </div>
          <div className="mt-1 sm:hidden">
            {groupBy === 'event' ? (
              <CategoryBadge category={hook.category} />
            ) : (
              <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
            )}
          </div>
        </div>

        {/* Slot droit (desktop) — benefit au survol, badge sinon */}
        <div data-component="HookRow-badge" className="hidden shrink-0 sm:block">
          {hovered && hook.benefit ? (
            <m.span
              key={`benefit-${hook.slug}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="block max-w-[200px] truncate text-right text-[11px] italic text-zinc-400"
            >
              <SplitFlap
                text={hook.benefit}
                play
                eager
                cell={26}
                perChar={14}
                spin={220}
              />
            </m.span>
          ) : (
            <div key={`badge-${hook.slug}`}>
              {groupBy === 'event' ? (
                <CategoryBadge category={hook.category} />
              ) : (
                <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
              )}
            </div>
          )}
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
              {/* Benefit */}
              {hook.benefit && (
                <div className="mb-3 flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-zinc-200 ring-1 ring-inset ring-white/15">
                    <Zap className="size-3.5" fill="currentColor" strokeWidth={0} />
                  </span>
                  <p className="text-[14px] font-semibold leading-snug text-white">{hook.benefit}</p>
                </div>
              )}

              {/* Description */}
              <p className="text-[13px] leading-relaxed text-zinc-400">{hook.description}</p>

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
                    Use cases
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
