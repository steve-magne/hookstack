import { CATEGORY_COLORS, CATEGORY_LABELS, type Category } from '@/types/hook'

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_COLORS[category]}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  )
}

export function HookTypeBadge({ type, trigger }: { type: string; trigger: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 font-mono text-xs text-zinc-300 ring-1 ring-inset ring-[var(--color-border)]">
      {type}
      {trigger && trigger !== '*' && <span className="text-zinc-500">· {trigger}</span>}
    </span>
  )
}
