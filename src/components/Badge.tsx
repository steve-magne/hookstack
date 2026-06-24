'use client'

import { CATEGORY_COLORS, type Category } from '@/types/hook'
import { useT } from '@/lib/locale-context'

export function CategoryBadge({ category }: { category: Category }) {
  const T = useT()
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_COLORS[category]}`}
    >
      {T.categoryLabels[category] ?? category}
    </span>
  )
}

export function HookTypeBadge({ type, trigger }: { type: string; trigger: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-xs text-zinc-200 ring-1 ring-inset ring-zinc-600/60">
      {type}
      {trigger && trigger !== '*' && <span className="text-zinc-400">· {trigger}</span>}
    </span>
  )
}
