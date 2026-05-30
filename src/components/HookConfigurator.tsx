'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, Download, Trash2 } from 'lucide-react'
import { useSelection } from '@/store/selection'
import { allHooks } from '@/lib/hooks'
import { collectScripts, toSettingsJson } from '@/lib/mergeConfig'

export function HookConfigurator() {
  const selected = useSelection((s) => s.selected)
  const remove = useSelection((s) => s.remove)
  const clear = useSelection((s) => s.clear)
  const [copied, setCopied] = useState(false)

  const hooks = useMemo(() => allHooks.filter((h) => selected.includes(h.slug)), [selected])
  const json = useMemo(() => toSettingsJson(hooks), [hooks])
  const scripts = useMemo(() => collectScripts(hooks), [hooks])

  const copy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const download = () => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'settings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (hooks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-zinc-500">
        Sélectionne des hooks (bouton <span className="text-zinc-300">+</span>)
        pour générer ta configuration <code>settings.json</code>.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">
          Configuration générée
          <span className="ml-2 text-sm font-normal text-zinc-500">
            {hooks.length} hook{hooks.length > 1 ? 's' : ''}
          </span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-brand)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-2)]"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copié' : 'Copier'}
          </button>
          <button
            onClick={download}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-zinc-300 hover:bg-[var(--color-surface-2)]"
          >
            <Download className="size-4" /> settings.json
          </button>
          <button
            onClick={clear}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-zinc-400 hover:text-rose-300"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {hooks.map((h) => (
          <button
            key={h.slug}
            onClick={() => remove(h.slug)}
            className="group flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-xs text-zinc-300 ring-1 ring-inset ring-[var(--color-border)]"
          >
            {h.name}
            <span className="text-zinc-500 group-hover:text-rose-300">✕</span>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
          ~/.claude/settings.json (ou .claude/settings.json du projet)
        </div>
        <pre className="max-h-96 overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs leading-relaxed text-zinc-200">
          <code>{json}</code>
        </pre>
      </div>

      {scripts.length > 0 && (
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
            Scripts à créer ({scripts.length})
          </div>
          <div className="space-y-3">
            {scripts.map((s) => (
              <div key={s.path}>
                <div className="mb-1 font-mono text-xs text-indigo-300">{s.path}</div>
                <pre className="max-h-60 overflow-auto rounded-lg border border-[var(--color-border)] bg-[#0d0d14] p-3 text-xs text-zinc-200">
                  <code>{s.content}</code>
                </pre>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Pense à rendre les scripts exécutables :{' '}
            <code className="text-zinc-400">chmod +x .claude/hooks/*.sh</code>
          </p>
        </div>
      )}
    </div>
  )
}
