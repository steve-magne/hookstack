import Link from 'next/link'
import { ArrowDown, Boxes, GitPullRequest, Wand2 } from 'lucide-react'
import { CatalogueExplorer } from '@/components/CatalogueExplorer'
import { allHooks } from '@/lib/hooks'

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4">
      <section className="pt-16 pb-10 text-center">
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl">
          Implémente tes{' '}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            hooks agentiques
          </span>{' '}
          en 2 minutes
        </h1>
      </section>

      <section id="catalogue" className="scroll-mt-20 pb-24">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Catalogue de hooks</h2>
        </div>
        <CatalogueExplorer />
      </section>
    </div>
  )
}
