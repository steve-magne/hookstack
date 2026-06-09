import { CatalogueExplorer } from '@/components/CatalogueExplorer'
import { StickyInstallBanner } from '@/components/StickyInstallBanner'
import { HeroRotatingTitle } from '@/components/HeroRotatingTitle'
import { allHooks } from '@/lib/hooks'
import { T, SEO_KEYWORDS } from '@/lib/i18n'
import type { Metadata } from 'next'

const BASE = 'https://hookstack.vercel.app'

export const metadata: Metadata = {
  title: T.metaTitle,
  description: T.metaDescription,
  keywords: SEO_KEYWORDS,
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

  const softwareJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'hookstack-cli',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    description:
      'CLI to install agentic hooks for Claude Code from the HookStack catalogue. Enforce deterministic behavior in your vibe coding workflow in one command.',
    url: 'https://www.npmjs.com/package/hookstack-cli',
    downloadUrl: 'https://www.npmjs.com/package/hookstack-cli',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    keywords: SEO_KEYWORDS.join(', '),
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: T.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {/* HomePage */}
      <div data-component="HomePage" className="mx-auto max-w-6xl px-4">
        {/* HeroSection */}
        <section data-component="HeroSection" className="relative pt-20 pb-12 text-center sm:pt-28">
          {/* Halo d'accent localisé — statique, derrière le titre. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-4 -z-10 h-64 w-[44rem] max-w-full -translate-x-1/2 rounded-full blur-[120px]"
          />

          <HeroRotatingTitle />

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-snug text-zinc-300 sm:text-lg">
            {T.heroSubtitleMain}
          </p>

          <p className="mx-auto mt-8 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {T.howItWorksTitle}
          </p>
        </section>

        {/* StickyInstallBanner — dynamic, reflects live selection */}
        <StickyInstallBanner />

        {/* FineTuneSection */}
        <section data-component="FineTuneSection" className="pt-6">
          {/* Separator "or fine-tune it hook by hook" */}
          <div className="mb-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-sm text-zinc-500">{T.heroSubtitleSub}</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

        </section>

        {/* CatalogueSection */}
        <section data-component="CatalogueSection" id="catalogue" className="scroll-mt-20 pb-24">
          <CatalogueExplorer />
        </section>
      </div>

      {/* FaqSection */}
      <section
        data-component="FaqSection"
        className="mx-auto max-w-3xl px-4 pb-24"
        aria-labelledby="faq-heading"
      >
        <h2
          id="faq-heading"
          className="mb-10 text-xl font-semibold text-white"
        >
          {T.faqTitle}
        </h2>
        <dl className="space-y-0">
          {T.faq.map(({ q, a }) => (
            <div
              key={q}
              className="border-t border-[var(--color-border)] py-6 last:border-b"
            >
              <dt className="mb-2 font-medium text-white">{q}</dt>
              <dd className="text-sm leading-relaxed text-zinc-400">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
