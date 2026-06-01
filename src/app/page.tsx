import { T } from '@/lib/i18n'
import { CatalogueExplorer } from '@/components/CatalogueExplorer'
import { allHooks } from '@/lib/hooks'
import type { Metadata } from 'next'

const BASE = 'https://claudehooks.vercel.app'

export const metadata: Metadata = {
  title: T.metaTitle,
  description: T.metaDescription,
  openGraph: {
    title: T.metaTitle,
    description: T.metaDescription,
    url: BASE,
    siteName: 'Claude Hooks',
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
    name: 'Claude Hooks',
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
        <section className="pt-16 pb-10 text-center">
          <h1 className="mx-auto whitespace-nowrap text-4xl font-bold leading-tight text-white sm:text-5xl">
            {T.heroTitle1}{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              {T.heroHighlight}
            </span>{' '}
            {T.heroTitle2}
          </h1>
        </section>

        <section id="catalogue" className="scroll-mt-20 pb-24">
          <CatalogueExplorer />
        </section>
      </div>
    </>
  )
}
