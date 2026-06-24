'use client'

import { allHooks } from '@/lib/hooks'
import { useT } from '@/lib/locale-context'
import { spring } from '@/lib/motion'
import { useSelection } from '@/store/selection'
import { AnimatePresence, m } from 'motion/react'
import { useMemo } from 'react'

export function HookConfigurator() {
  const T = useT()
  const selected = useSelection((s) => s.selected)
  const remove = useSelection((s) => s.remove)

  const hooks = useMemo(
    () => allHooks.filter((h) => selected.includes(h.slug)),
    [selected]
  )

  if (hooks.length === 0) {
    return (
      <m.div
        data-component="HookConfigurator-empty"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-zinc-500"
      >
        {T.selectHooksPrompt.split('settings.json').map((part, i, arr) =>
          i < arr.length - 1 ? (
            // biome-ignore lint/suspicious/noArrayIndexKey: static split of fixed text, never reorders
            <span key={i}>
              {part}
              <code className="text-zinc-300">settings.json</code>
            </span>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: static split of fixed text, never reorders
            <span key={i}>{part}</span>
          )
        )}
      </m.div>
    )
  }

  return (
    <div data-component="HookConfigurator" className="space-y-4">
      {/* HookConfigurator-tags — pills des hooks sélectionnés */}
      <div data-component="HookConfigurator-tags" className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {hooks.map((h) => (
            <m.button
              key={h.slug}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={spring.snappy}
              whileTap={{ scale: 0.94 }}
              onClick={() => remove(h.slug)}
              className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-xs text-zinc-300 ring-1 ring-inset ring-[var(--color-border)]"
            >
              {h.name}
              <span className="text-zinc-500 group-hover:text-zinc-200">✕</span>
            </m.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
