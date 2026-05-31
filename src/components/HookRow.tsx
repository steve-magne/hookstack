'use client'

import { ArrowUpRight, Check, ShieldCheck } from 'lucide-react'
import type { Hook } from '@/types/hook'
import { useSelection } from '@/store/selection'
import { useT } from '@/lib/locale-context'
import { CategoryBadge, HookTypeBadge } from './Badge'

interface Props {
  hook: Hook
  groupBy: 'event' | 'category'
  onOpen: () => void
  onHover: (hook: Hook, y: number) => void
  onLeave: () => void
}

export function HookRow({ hook, groupBy, onOpen, onHover, onLeave }: Props) {
  const T = useT()
  const selected = useSelection((s) => s.selected.includes(hook.slug))
  const toggle = useSelection((s) => s.toggle)

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onMouseEnter={(e) => onHover(hook, e.currentTarget.getBoundingClientRect().top)}
      onMouseLeave={onLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] focus:outline-none focus-visible:border-white/40"
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggle(hook.slug)
        }}
        aria-label={selected ? T.removeFromSelection : T.addToSelection}
        className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
          selected
            ? 'border-white bg-white text-zinc-900'
            : 'border-zinc-600 text-transparent hover:border-white/70 hover:text-zinc-400'
        }`}
      >
        <Check className="size-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h4 className="truncate font-medium text-zinc-200 group-hover:text-white">{hook.name}</h4>
          {hook.is_must && (
            <ShieldCheck className="size-3 shrink-0 text-indigo-400" aria-label={T.mustPreselected} />
          )}
          <ArrowUpRight className="size-3.5 shrink-0 text-zinc-500 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>

      <div className="shrink-0">
        {groupBy === 'event' ? (
          <CategoryBadge category={hook.category} />
        ) : (
          <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
        )}
      </div>
    </div>
  )
}
