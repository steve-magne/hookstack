'use client'

import { useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ChevronDown, ShieldCheck } from 'lucide-react'
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
  /** Axe de groupage courant — détermine la méta complémentaire affichée dans le rail. */
  groupBy: GroupBy
  /** Joue la révélation split-flap du nom (intro de chargement uniquement). */
  intro?: boolean
  /** Retard de départ du split-flap, en ms — cascade entre cards. */
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
      className={`flex h-full flex-col rounded-xl border transition-colors ${
        selected
          ? 'border-white/30 bg-white/[0.04]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-white/20'
      }`}
    >
      {/* Corps cliquable — expand/collapse */}
      {/* biome-ignore lint/a11y/useSemanticElements: a real <button> can't legally contain the nested interactive checkbox in the footer; div+role+keydown is the valid pattern here */}
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
        className="group flex flex-1 cursor-pointer flex-col p-4 focus:outline-none focus-visible:rounded-xl focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/40"
      >
        {/* En-tête — nom + shield + stack, chevron d'expand à droite */}
        <div data-component="HookRow-name" className="flex items-start gap-1.5">
          <h4 className="min-w-0 flex-1 font-medium leading-snug text-zinc-100 group-hover:text-white">
            <SplitFlap text={hook.name} play={intro} delay={introDelay} block />
          </h4>
          {hook.default_on && (
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-zinc-300" aria-label={T.mustPreselected} />
          )}
          {hook.stack?.map((s) => (
            <span
              key={s}
              role="img"
              className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-[4px] font-mono text-[9px] font-bold leading-none ${STACK_MONO_COLOR[s]}`}
              aria-label={s}
              title={s}
            >
              {STACK_MONOGRAM[s]}
            </span>
          ))}
          <ChevronDown
            className={`mt-0.5 size-3.5 shrink-0 text-zinc-600 transition-[transform,color] duration-200 group-hover:text-zinc-400 ${
              expanded ? 'rotate-180' : ''
            }`}
            aria-hidden
          />
        </div>

        {/* Benefit — héros de la card, toujours visible */}
        {hook.benefit && (
          <p
            data-component="HookRow-benefit"
            className="mt-1.5 flex-1 text-[13px] leading-snug text-zinc-400 group-hover:text-zinc-300"
          >
            {hook.benefit}
          </p>
        )}

        {/* Panneau expand — détails inline */}
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
              <div className="mt-3 border-t border-white/[0.07] pt-3">
                {/* Description */}
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
                      {hook.use_cases.slice(0, 3).map((uc) => (
                        <li
                          key={uc}
                          className="flex items-start gap-1.5 text-[12px] leading-snug text-zinc-400"
                        >
                          <span className="mt-[3px] shrink-0 text-zinc-600">–</span>
                          {uc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Rail de pied — méta (gauche) + checkbox de sélection (droite) */}
      <div
        data-component="HookRow-rail"
        className="flex items-center justify-between gap-2 border-t border-[var(--color-border)]/60 px-4 py-2.5"
      >
        <div className="min-w-0">{meta}</div>
        {/* Checkbox — sélection / désélection (n'expand pas la card) */}
        <m.span
          data-component="HookRow-checkbox"
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.stopPropagation()
            toggle(hook.slug)
          }}
          role="checkbox"
          aria-checked={selected}
          aria-label={selected ? T.removeFromSelection : T.addToSelection}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              toggle(hook.slug)
            }
          }}
          className="-m-1 shrink-0 cursor-pointer p-1 focus:outline-none focus-visible:rounded-md focus-visible:ring-1 focus-visible:ring-white/40"
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
      </div>
    </m.div>
  )
}
