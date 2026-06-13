import { CatalogueExplorer } from '@/components/CatalogueExplorer'
import { StickyInstallBanner } from '@/components/StickyInstallBanner'
import { HeroRotatingTitle } from '@/components/HeroRotatingTitle'
import { allHooks } from '@/lib/hooks'
import { guides } from '@/lib/guides'
import { T, SEO_KEYWORDS } from '@/lib/i18n'
import { SITE, MAINTAINER, SAME_AS, PERSON_SAME_AS } from '@/lib/site'
import type { Metadata } from 'next'
import Link from 'next/link'

const BASE = 'https://www.hookstack.app'

export const metadata: Metadata = {
  // Use absolute to avoid layout template appending "| HookStack" to a title
  // that already ends with "— HookStack", which would produce a double brand.
  title: { absolute: T.metaTitle },
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

// Live GitHub star count for social proof. Build-time fetch with hourly
// revalidation; never throws — a failed fetch just hides the number.
async function getStars(): Promise<number | null> {
  try {
    const res = await fetch('https://api.github.com/repos/steve-magne/hookstack', {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    const data = (await res.json()) as { stargazers_count?: number }
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : null
  } catch {
    return null
  }
}

export default async function HomePage() {
  const stars = await getStars()
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
      'CLI to install agentic hooks from the HookStack catalogue for Claude Code, OpenAI Codex, and GitHub Copilot. The same hook scripts are portable across agents that share Claude Code lifecycle events (PreToolUse, PostToolUse, SessionStart, Stop) — only the config file differs. Enforce deterministic behavior in your vibe coding workflow in one command.',
    url: 'https://www.npmjs.com/package/hookstack-cli',
    downloadUrl: 'https://www.npmjs.com/package/hookstack-cli',
    softwareRequirements: 'Node.js',
    featureList: [
      'Install hooks for Claude Code (.claude/settings.json)',
      'Install hooks for OpenAI Codex (.codex/hooks.json)',
      'Install hooks for GitHub Copilot',
      'Multi-agent: same hook scripts, portable across agents',
    ],
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

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HookStack',
    url: BASE,
    logo: `${BASE}/web-app-manifest-512x512.png`,
    description: T.metaDescription,
    foundingDate: SITE.foundingDate,
    founder: { '@type': 'Person', name: MAINTAINER.name, url: MAINTAINER.url, sameAs: PERSON_SAME_AS },
    sameAs: SAME_AS,
  }

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: BASE,
    name: T.metaTitle,
    description: T.metaDescription,
    primaryImageOfPage: `${BASE}/opengraph-image`,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['#faq-heading', '[data-component="FaqSection"] dt', '[data-component="FaqSection"] dd'],
    },
  }

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to install Claude Code hooks with HookStack',
    description: T.metaDescription,
    step: T.howItWorksSteps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.title,
      text: s.desc,
      url: `${BASE}/#catalogue`,
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
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

          {/* SocialProof — verifiable trust signals (E-E-A-T) */}
          <ul
            data-component="SocialProof"
            className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-zinc-400"
          >
            <li className="rounded-full border border-[var(--color-border)] px-3 py-1">{allHooks.length} hooks</li>
            {stars !== null && stars >= 100 && (
              <li className="rounded-full border border-[var(--color-border)] px-3 py-1">
                ★ {stars.toLocaleString('en-US')} on GitHub
              </li>
            )}
            <li className="rounded-full border border-[var(--color-border)] px-3 py-1">Open-source · MIT</li>
            <li className="rounded-full border border-[var(--color-border)] px-3 py-1">Hooks unit-tested</li>
            <li className="rounded-full border border-[var(--color-border)] px-3 py-1">Security scanned</li>
          </ul>

          {/* CompatibilityStrip — multi-agent support (Works with). Static, sober. */}
          <div data-component="CompatibilityStrip" className="mx-auto mt-8 max-w-2xl">
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {T.worksWithLabel}
              </span>
              {T.worksWithAgents.map((agent) => (
                <span
                  key={agent}
                  className="rounded-full border border-[var(--color-border)] px-3 py-1 font-medium text-zinc-300"
                >
                  {agent}
                </span>
              ))}
            </div>
            <p className="mt-3 text-pretty text-xs leading-snug text-zinc-500">{T.worksWithCaption}</p>
          </div>

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
          <h2 className="mb-8 text-center text-2xl font-bold text-white">
            Browse the Claude Code hooks catalogue
          </h2>
          <CatalogueExplorer />
        </section>
      </div>

      {/* ComparisonSection — real HTML table for table-snippet eligibility (AEO) */}
      <section
        data-component="ComparisonSection"
        className="mx-auto max-w-3xl px-4 pb-16"
        aria-labelledby="compare-heading"
      >
        <h2 id="compare-heading" className="mb-2 text-xl font-semibold text-white">
          {T.compareTitle}
        </h2>
        <p className="mb-6 text-sm text-zinc-400">{T.compareIntro}</p>
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-white/5">
                {T.compareCols.map((c) => (
                  <th key={c || 'dim-col'} scope="col" className="p-3 font-semibold text-zinc-300">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {T.compareRows.map((row) => (
                <tr key={row.dim} className="border-t border-[var(--color-border)]">
                  <th scope="row" className="p-3 font-medium text-white">
                    {row.dim}
                  </th>
                  <td className="p-3 text-zinc-300">{row.hook}</td>
                  <td className="p-3 text-zinc-400">{row.cmd}</td>
                  <td className="p-3 text-zinc-400">{row.prompt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 text-sm text-zinc-400">
          New to hooks?{' '}
          <Link href="/guides" className="text-[var(--color-brand)] hover:underline">
            {T.guidesLinkText}
          </Link>{' '}
          or{' '}
          <Link href="/about" className="text-[var(--color-brand)] hover:underline">
            learn who builds HookStack
          </Link>
          .
        </p>
      </section>

      {/* GuidesSection — internal links to long-form content (SEO + user education) */}
      <section
        data-component="GuidesSection"
        className="mx-auto max-w-3xl px-4 pb-16"
        aria-labelledby="guides-heading"
      >
        <h2 id="guides-heading" className="mb-6 text-xl font-semibold text-white">
          <Link href="/guides" className="group inline-flex items-center gap-1.5 hover:text-white">
            Learn more about Claude Code hooks
            <span aria-hidden className="text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--color-brand)]">→</span>
          </Link>
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {guides.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="block rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 transition-colors hover:border-[var(--color-text-muted)]"
              >
                <span className="block text-sm font-medium text-white">{g.title}</span>
                <span className="mt-1 block text-xs leading-snug text-zinc-500">{g.description.slice(0, 90)}{g.description.length > 90 ? '…' : ''}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

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
          {T.faq.map((item) => (
            <div
              key={item.q}
              className="border-t border-[var(--color-border)] py-6 last:border-b"
            >
              <dt className="mb-2 font-medium text-white">{item.q}</dt>
              <dd className="text-sm leading-relaxed text-zinc-400">
                {item.a}
                {'guide' in item && item.guide && (
                  <Link
                    href={`/guides/${item.guide}`}
                    className="mt-2 block text-[var(--color-brand)] hover:underline"
                  >
                    Read the full guide →
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  )
}
