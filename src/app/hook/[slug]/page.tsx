'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { getHookBySlug } from '@/lib/hooks'
import { useSelection } from '@/store/selection'
import { CategoryBadge, HookTypeBadge } from '@/components/Badge'
import { PROVIDER_LABELS } from '@/types/hook'

export default function HookDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const hook = slug ? getHookBySlug(slug) : undefined
  const selected = useSelection((s) => (slug ? s.selected.includes(slug) : false))
  const toggle = useSelection((s) => s.toggle)

  if (!hook) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-400">
        <p>Hook introuvable.</p>
        <Link href="/" className="mt-4 inline-block text-indigo-300 underline">
          Retour au catalogue
        </Link>
      </div>
    )
  }

  const settingsFragment = JSON.stringify(hook.implementation.config, null, 2)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="size-4" /> Catalogue
      </Link>

      <div className="mb-4 flex items-center gap-2">
        <CategoryBadge category={hook.category} />
        <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
      </div>

      <h1 className="mb-3 text-3xl font-bold text-white">{hook.name}</h1>
      <p className="mb-6 text-lg text-zinc-300">{hook.description}</p>

      <button
        onClick={() => toggle(hook.slug)}
        className={`mb-8 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${
          selected
            ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
            : 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-2)]'
        }`}
      >
        {selected ? <Check className="size-4" /> : <Plus className="size-4" />}
        {selected ? 'Ajouté à la sélection' : 'Ajouter à ma config'}
      </button>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Cas d'usage
          </h2>
          <ul className="space-y-1.5 text-sm text-zinc-300">
            {hook.use_cases.map((u) => (
              <li key={u} className="flex items-start gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
                {u}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Providers & tags
          </h2>
          <div className="mb-3 flex flex-wrap gap-2">
            {hook.provider.map((p) => (
              <span
                key={p}
                className="rounded-md bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-zinc-300 ring-1 ring-inset ring-[var(--color-border)]"
              >
                {PROVIDER_LABELS[p]}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hook.tags.map((t) => (
              <span key={t} className="text-xs text-zinc-500">
                #{t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Fragment settings.json
        </h2>
        <pre className="overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
          <code>{settingsFragment}</code>
        </pre>
      </div>

      {hook.implementation.code_snippet && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Script · {hook.implementation.script_path}
          </h2>
          <pre className="overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
            <code>{hook.implementation.code_snippet}</code>
          </pre>
        </div>
      )}
    </div>
  )
}
