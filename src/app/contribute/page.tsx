import { T } from '@/lib/i18n'
import { ContributeForm } from '@/components/ContributeForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: T.contributeTitle,
  description: T.contributeSubtitle,
}

export default function ContributePage() {
  return (
    <div data-component="ContributePage" className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-white">{T.contributeTitle}</h1>
      <p className="mb-6 text-zinc-400">{T.contributeSubtitle}</p>

      {/* ContributePage-steps */}
      <ol data-component="ContributePage-steps" className="mb-8 space-y-3">
        {T.contributeSteps.map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-zinc-300">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]/15 text-xs font-semibold text-indigo-300 ring-1 ring-[var(--color-brand)]/30">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      {/* ContributeForm */}
      <ContributeForm />
    </div>
  )
}
