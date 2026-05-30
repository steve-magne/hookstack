'use client'

import Link from 'next/link'
import { Check, Plus } from 'lucide-react'
import type { Hook } from '@/types/hook'
import { useSelection } from '@/store/selection'
import { CategoryBadge, HookTypeBadge } from './Badge'

export function HookCard({ hook }: { hook: Hook }) {
  const selected = useSelection((s) => s.selected.includes(hook.slug))
  const toggle = useSelection((s) => s.toggle)

  return (
    <div className="group flex flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-brand)]/50">
      <div className="mb-2 flex items-start justify-between gap-2">
        <CategoryBadge category={hook.category} />
        <button
          onClick={() => toggle(hook.slug)}
          aria-label={selected ? 'Retirer de la sélection' : 'Ajouter à la sélection'}
          className={`flex size-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
            selected
              ? 'bg-[var(--color-brand)] text-white'
              : 'border border-[var(--color-border)] text-zinc-400 hover:text-white'
          }`}
        >
          {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
        </button>
      </div>

      <Link href={`/hook/${hook.slug}`} className="flex-1">
        <h3 className="mb-1 font-semibold leading-snug text-zinc-100 group-hover:text-white">
          {hook.name}
        </h3>
        <p className="mb-3 line-clamp-3 text-sm text-zinc-400">{hook.description}</p>
      </Link>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
      </div>
    </div>
  )
}
