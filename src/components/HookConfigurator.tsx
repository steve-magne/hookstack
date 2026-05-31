'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { useSelection } from '@/store/selection'
import { allHooks, localizeHook } from '@/lib/hooks'
import { useLocale, useT } from '@/lib/locale-context'
import { CopySwap } from './CopySwap'
import { spring } from '@/lib/motion'

export function HookConfigurator() {
  const T = useT()
  const locale = useLocale()
  const selected = useSelection((s) => s.selected)
  const remove = useSelection((s) => s.remove)
  const [pluginCopiedBottom, setPluginCopiedBottom] = useState(false)

  const hooks = useMemo(
    () => allHooks.filter((h) => selected.includes(h.slug)).map((h) => localizeHook(h, locale)),
    [selected, locale]
  )
  const pluginCmd = `claude --plugin-url https://claudehooks.vercel.app/api/plugin?hooks=${hooks.map(h => h.slug).join(',')}`

  const copyPluginBottom = async () => {
    await navigator.clipboard.writeText(pluginCmd)
    setPluginCopiedBottom(true)
    setTimeout(() => setPluginCopiedBottom(false), 1500)
  }

  if (hooks.length === 0) {
    return (
      <m.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-zinc-500"
      >
        {T.selectHooksPrompt.split('settings.json').map((part, i, arr) =>
          i < arr.length - 1 ? (
            <span key={i}>
              {part}
              <code className="text-zinc-300">settings.json</code>
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </m.div>
    )
  }

  const PluginTile = ({ onCopy, isCopied }: { onCopy: () => void; isCopied: boolean }) => (
    <div className="rounded-xl border border-zinc-700 bg-[#0d0d14] px-4 py-3">
      <p className="mb-2 text-xs text-zinc-500">{T.pluginInstallHint}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate font-mono text-sm text-zinc-100">{pluginCmd}</code>
        <button
          onClick={onCopy}
          className="shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
        >
          <CopySwap copied={isCopied} />
          {isCopied ? T.copied : T.copy}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
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

      <PluginTile onCopy={copyPluginBottom} isCopied={pluginCopiedBottom} />
    </div>
  )
}
