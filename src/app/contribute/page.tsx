import { ContributeForm } from '@/components/ContributeForm'

export default function ContributePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-white">Contribuer un dépôt</h1>
      <p className="mb-6 text-zinc-400">
        Partage un dépôt GitHub public qui utilise des hooks agentiques. Un
        agent Claude Code l'analyse, détecte les patterns non recensés et ouvre
        une PR pour enrichir le registre.
      </p>

      <ol className="mb-8 space-y-3">
        {[
          "Saisis l'URL de ton dépôt GitHub public.",
          'Une issue de soumission est préparée sur le dépôt du registre.',
          "Une GitHub Action clone le dépôt et lance l'analyse Claude Code.",
          'Les nouveaux hooks détectés arrivent en PR (label auto-generated).',
        ].map((step, i) => (
          <li key={i} className="flex gap-3 text-sm text-zinc-300">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)]/15 text-xs font-semibold text-indigo-300 ring-1 ring-[var(--color-brand)]/30">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <ContributeForm />
    </div>
  )
}
