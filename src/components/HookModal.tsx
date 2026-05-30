'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Copy, Plus, X } from 'lucide-react'
import type { Hook } from '@/types/hook'
import { PROVIDER_LABELS } from '@/types/hook'
import { useSelection } from '@/store/selection'
import { useLocale, useT } from '@/lib/locale-context'
import { CategoryBadge, HookTypeBadge } from './Badge'

export function HookModal({ hook, onClose }: { hook: Hook; onClose: () => void }) {
  const T = useT()
  const locale = useLocale()
  const selected = useSelection((s) => s.selected.includes(hook.slug))
  const toggle = useSelection((s) => s.toggle)
  const [copied, setCopied] = useState(false)

  const settingsFragment = JSON.stringify(hook.implementation.config, null, 2)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const copyFragment = async () => {
    await navigator.clipboard.writeText(settingsFragment)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      onClick={onClose}
      className="hookit-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={hook.name}
        onClick={(e) => e.stopPropagation()}
        className="hookit-modal relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl shadow-black/60 sm:rounded-2xl"
      >
        <button
          onClick={onClose}
          aria-label={T.close}
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-[var(--color-surface-2)] hover:text-white"
        >
          <X className="size-4" />
        </button>

        <div className="overflow-y-auto p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 pr-8">
            <CategoryBadge category={hook.category} />
            <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
          </div>

          <h2 className="mb-2 text-2xl font-bold text-white">{hook.name}</h2>
          <p className="mb-5 text-zinc-300">{hook.description}</p>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              onClick={() => toggle(hook.slug)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? 'bg-white/10 text-white ring-1 ring-inset ring-white/25'
                  : 'bg-white text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
              {selected ? T.addedToSelection : T.addToMyConfig}
            </button>
            <Link
              href={`/${locale}/hook/${hook.slug}`}
              className="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {T.viewFullPage}
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                {T.useCases}
              </h3>
              <ul className="space-y-1.5 text-sm text-zinc-300">
                {hook.use_cases.map((u) => (
                  <li key={u} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-white/60" />
                    {u}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                {T.providersAndTags}
              </h3>
              <div className="mb-3 flex flex-wrap gap-2">
                {hook.provider.map((p) => (
                  <span
                    key={p}
                    className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-zinc-200 ring-1 ring-inset ring-zinc-600/60"
                  >
                    {PROVIDER_LABELS[p]}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hook.tags.map((t) => (
                  <span key={t} className="text-xs text-zinc-400">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
                {T.settingsFragment}
              </h3>
              <button
                onClick={copyFragment}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-[var(--color-surface-2)]/80"
              >
                {copied ? <Check className="size-3.5 text-zinc-200" /> : <Copy className="size-3.5" />}
                {copied ? T.copied : T.copy}
              </button>
            </div>
            <pre className="max-h-72 overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
              <code>{settingsFragment}</code>
            </pre>
          </div>

          {hook.implementation.code_snippet && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
                Script · {hook.implementation.script_path}
              </h3>
              <pre className="max-h-72 overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
                <code>{hook.implementation.code_snippet}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
