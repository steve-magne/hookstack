'use client'

import { m } from 'motion/react'
import { Info, ShieldCheck } from 'lucide-react'
import type { Hook } from '@/types/hook'
import { useSelection } from '@/store/selection'
import { useT } from '@/lib/locale-context'
import { CategoryBadge, HookTypeBadge } from './Badge'
import { AnimatedCheck } from './AnimatedCheck'
import { fadeUp, spring } from '@/lib/motion'

interface Props {
  hook: Hook
  groupBy: 'event' | 'category'
  onHover: (hook: Hook) => void
  onLeave: () => void
  /** Touch : ouvre le panneau de détail (ne pas passer en mode souris) */
  onTap?: (hook: Hook) => void
}

export function HookRow({ hook, groupBy, onHover, onLeave, onTap }: Props) {
  const T = useT()
  const selected = useSelection((s) => s.selected.includes(hook.slug))
  const toggle = useSelection((s) => s.toggle)

  return (
    <m.div
      layout
      variants={fadeUp}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={spring.smooth}
      onClick={() => toggle(hook.slug)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onMouseEnter={() => onHover(hook)}
      onMouseLeave={onLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle(hook.slug)
        }
      }}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] focus:outline-none focus-visible:border-white/40"
    >
      <m.span
        whileTap={{ scale: 0.85 }}
        aria-hidden
        className="-m-1 shrink-0 p-1"
      >
        <span className={`flex size-5 items-center justify-center rounded-md border-2 transition-colors ${
          selected
            ? 'border-white bg-white text-zinc-900'
            : 'border-zinc-600 text-zinc-400 group-hover:border-white/70'
        }`}>
          <AnimatedCheck checked={selected} />
        </span>
      </m.span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h4 className="truncate font-medium text-zinc-200 group-hover:text-white">{hook.name}</h4>
          {hook.is_must && (
            <ShieldCheck className="size-3 shrink-0 text-indigo-400" aria-label={T.mustPreselected} />
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

      {/* Côté droit : badge + bouton détail (touch) */}
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="hidden sm:block">
          {groupBy === 'event' ? (
            <CategoryBadge category={hook.category} />
          ) : (
            <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
          )}
        </div>

        {onTap && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTap(hook)
            }}
            aria-label={`Voir les détails de ${hook.name}`}
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <Info className="size-3.5" />
          </button>
        )}
      </div>
    </m.div>
  )
}
