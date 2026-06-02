import { CatalogueExplorer } from '@/components/CatalogueExplorer'
import { SplitFlap } from '@/components/SplitFlap'
import { allHooks } from '@/lib/hooks'
import { T } from '@/lib/i18n'
import { splitFlapHero } from '@/lib/motion'
import type { Metadata } from 'next'

const BASE = 'https://hookstack.vercel.app'

export const metadata: Metadata = {
  title: T.metaTitle,
  description: T.metaDescription,
  openGraph: {
    title: T.metaTitle,
    description: T.metaDescription,
    url: BASE,
    siteName: 'HookStack',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: T.metaTitle,
    description: T.metaDescription,
  },
  alternates: { canonical: BASE },
}

export default function HomePage() {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'HookStack',
    url: BASE,
    description: T.metaDescription,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE}?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: T.catalogueTitle,
    url: BASE,
    numberOfItems: allHooks.length,
    itemListElement: allHooks.map((hook, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: hook.name,
      description: hook.description,
      url: `${BASE}/hook/${hook.slug}`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <div className="mx-auto max-w-6xl px-4">
        <section className="relative pt-20 pb-12 text-center sm:pt-28">
          {/* Halo d'accent localisé — statique, derrière le titre. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-4 -z-10 h-64 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-indigo-600/15 blur-[120px]"
          />

          <h1 className="mx-auto max-w-3xl text-balance text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-6xl">
            <SplitFlap text={T.heroTitleA} eager {...splitFlapHero} />{' '}
            <br className="hidden sm:block" />
            <SplitFlap
              text={T.heroTitleB}
              delay={(T.heroTitleA.length + 1) * splitFlapHero.perChar}
              eager
              innerClassName="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent"
              {...splitFlapHero}
            />
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-zinc-400 sm:text-lg">
            {T.heroSubtitle}
          </p>
        </section>

        <section id="catalogue" className="scroll-mt-20 pb-24">
          <CatalogueExplorer />
        </section>
      </div>
    </>
  )
}
