'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, Download, Terminal, Trash2 } from 'lucide-react'
import { useSelection } from '@/store/selection'
import { allHooks, localizeHook } from '@/lib/hooks'
import { collectScripts, generateInstallScript, toSettingsJson } from '@/lib/mergeConfig'
import { useLocale, useT } from '@/lib/locale-context'

export function HookConfigurator() {
  const T = useT()
  const locale = useLocale()
  const selected = useSelection((s) => s.selected)
  const remove = useSelection((s) => s.remove)
  const clear = useSelection((s) => s.clear)
  const [copied, setCopied] = useState(false)
  const [scriptCopied, setScriptCopied] = useState(false)
  const [pluginCopied, setPluginCopied] = useState(false)

  const hooks = useMemo(
    () => allHooks.filter((h) => selected.includes(h.slug)).map((h) => localizeHook(h, locale)),
    [selected, locale]
  )
  const json = useMemo(() => toSettingsJson(hooks), [hooks])
  const scripts = useMemo(() => collectScripts(hooks), [hooks])
  const pluginCmd = `claude --plugin-url https://claudehooks.vercel.app/api/plugin?hooks=${hooks.map(h => h.slug).join(',')}`

  const copy = async () => {
    await navigator.clipboard.writeText(json)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const copyInstallScript = async () => {
    await navigator.clipboard.writeText(generateInstallScript(hooks))
    setScriptCopied(true)
    setTimeout(() => setScriptCopied(false), 1500)
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

  const copyPlugin = async () => {
    await navigator.clipboard.writeText(pluginCmd)
    setPluginCopied(true)
    setTimeout(() => setPluginCopied(false), 1500)
  }

  if (hooks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-zinc-500">
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
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Plugin one-liner — commande principale */}
      <div className="rounded-xl border border-zinc-700 bg-[#0d0d14] px-4 py-3">
        <p className="mb-2 text-xs text-zinc-500">{T.pluginInstallHint}</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate font-mono text-sm text-zinc-100">{pluginCmd}</code>
          <button
            onClick={copyPlugin}
            className="shrink-0 flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors"
          >
            {pluginCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {pluginCopied ? T.copied : T.copy}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-400">
          {T.generatedConfig}
          <span className="ml-2 text-zinc-600">{hooks.length} hook{hooks.length > 1 ? 's' : ''}</span>
        </h3>
        <div className="flex gap-2">
          <button
            onClick={copy}
            className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? T.copied : T.copy}
          </button>
          <button
            onClick={copyInstallScript}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-[var(--color-surface-2)] hover:border-zinc-500 transition-colors"
            title="node install-hooks.mjs"
          >
            {scriptCopied ? <Check className="size-4 text-zinc-200" /> : <Terminal className="size-4" />}
            {scriptCopied ? T.installScriptCopied : T.installScript}
          </button>
          <button
            onClick={download}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-[var(--color-surface-2)] hover:border-zinc-500 transition-colors"
          >
            <Download className="size-4" /> settings.json
          </button>
          <button
            onClick={clear}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:border-white/30 transition-colors"
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
            <span className="text-zinc-500 group-hover:text-zinc-200">✕</span>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1 text-xs uppercase tracking-wide text-zinc-400">
          ~/.claude/settings.json (ou .claude/settings.json du projet)
        </div>
        <pre className="max-h-96 overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs leading-relaxed text-zinc-200">
          <code>{json}</code>
        </pre>
      </div>

      {scripts.length > 0 && (
        <div>
          <div className="mb-2 text-xs uppercase tracking-wide text-zinc-400">
            {T.scriptsToCreate} ({scripts.length})
          </div>
          <div className="space-y-3">
            {scripts.map((s) => (
              <div key={s.path}>
                <div className="mb-1 font-mono text-xs text-zinc-300">{s.path}</div>
                <pre className="max-h-60 overflow-auto rounded-lg border border-[var(--color-border)] bg-[#0d0d14] p-3 text-xs text-zinc-200">
                  <code>{s.content}</code>
                </pre>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {T.makeExecutable}{' '}
            <code className="text-zinc-400">chmod +x .claude/hooks/*.sh</code>
          </p>
        </div>
      )}
    </div>
  )
}
