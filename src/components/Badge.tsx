'use client'

import { CATEGORY_COLORS, HOOK_TYPE_INFO, type Category, type HookType } from '@/types/hook'
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
  const info = HOOK_TYPE_INFO[type as HookType]

  return (
    <span className="group relative inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-xs text-zinc-200 ring-1 ring-inset ring-zinc-600/60">
      {type}
      {trigger && trigger !== '*' && <span className="text-zinc-400">· {trigger}</span>}

      {info && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-left font-sans text-[12px] leading-snug text-zinc-300 shadow-2xl opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
          <span className="block font-medium text-white">{type}</span>
          <span className="mt-0.5 block text-zinc-400">{info.label}</span>
          {info.blocking !== null && (
            <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
              info.blocking
                ? 'bg-amber-500/10 text-amber-300 ring-amber-500/20'
                : 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20'
            }`}>
              {info.blocking ? '⚡ bloquant' : '· non bloquant'}
            </span>
          )}
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-zinc-900" />
        </span>
      )}
    </span>
  )
}
