'use client'

import { ArrowUpRight, Check } from 'lucide-react'
import type { Hook } from '@/types/hook'
import { useSelection } from '@/store/selection'
import { useT } from '@/lib/locale-context'
import { CategoryBadge, HookTypeBadge } from './Badge'

interface Props {
  hook: Hook
  groupBy: 'event' | 'category'
  onOpen: () => void
}

export function HookRow({ hook, groupBy, onOpen }: Props) {
  const T = useT()
  const selected = useSelection((s) => s.selected.includes(hook.slug))
  const toggle = useSelection((s) => s.toggle)

  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="group flex cursor-pointer items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] focus:outline-none focus-visible:border-[var(--color-brand)]/50"
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggle(hook.slug)
        }}
        aria-label={selected ? T.removeFromSelection : T.addToSelection}
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          selected
            ? 'border-[var(--color-brand)] bg-[var(--color-brand)] text-white'
            : 'border-[var(--color-border)] text-transparent hover:border-[var(--color-brand)] hover:text-zinc-600'
        }`}
      >
        <Check className="size-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h4 className="truncate font-medium text-zinc-200 group-hover:text-white">{hook.name}</h4>
          <ArrowUpRight className="size-3.5 shrink-0 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100" />
        </div>

        {/* Détail révélé au survol — animation de hauteur via grid-rows */}
        <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-hover:grid-rows-[1fr]">
          <div className="overflow-hidden">
            <p className="line-clamp-2 pt-1 text-sm text-zinc-400">{hook.description}</p>
            <div className="pt-1.5 font-mono text-[11px] text-zinc-500">
              {hook.hook_type}
              {hook.trigger && hook.trigger !== '*' ? ` · ${hook.trigger}` : ''}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-0.5 shrink-0">
        {groupBy === 'event' ? (
          <CategoryBadge category={hook.category} />
        ) : (
          <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
        )}
      </div>
    </div>
  )
}
