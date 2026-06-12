import { getGuideBySlug, guides, type GuideBlock } from '@/lib/guides'
import { getHookBySlug } from '@/lib/hooks'
import { SITE, MAINTAINER, PERSON_SAME_AS } from '@/lib/site'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) return {}

  return {
    title: guide.metaTitle,
    description: guide.description,
    openGraph: {
      title: `${guide.title} — HookStack`,
      description: guide.description,
      url: `${SITE.base}/guides/${slug}`,
      siteName: 'HookStack',
      type: 'article',
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
      authors: [MAINTAINER.name],
    },
    twitter: { card: 'summary_large_image', title: guide.title, description: guide.description },
    alternates: { canonical: `${SITE.base}/guides/${slug}` },
  }
}

// Inline `code` spans inside guide prose, kept minimal (no full markdown engine).
function Inline({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/g)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-white/10 px-1 py-0.5 text-[0.85em] text-zinc-200">
            {p}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

function Block({ block }: { block: GuideBlock }) {
  if (typeof block === 'string') {
    return (
      <p className="mb-4 leading-relaxed text-zinc-300">
        <Inline text={block} />
      </p>
    )
  }
  if ('list' in block) {
    return (
      <ul className="mb-4 space-y-2 text-zinc-300">
        {block.list.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--color-brand)]" />
            <span>
              <Inline text={item} />
            </span>
          </li>
        ))}
      </ul>
    )
  }
  return (
    <pre className="mb-4 overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-sm text-zinc-200">
      <code>{block.code}</code>
    </pre>
  )
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuideBySlug(slug)
  if (!guide) notFound()

  const relatedHooks = guide.relatedHookSlugs.flatMap((s) => {
    const h = getHookBySlug(s)
    return h ? [h] : []
  })

  // "Read next" — resolve related guide slugs defensively (slug may not exist yet)
  const readNextGuides = (guide.related ?? []).flatMap((s) => {
    const g = getGuideBySlug(s)
    return g ? [g] : []
  })

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: guide.title,
    description: guide.description,
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    url: `${SITE.base}/guides/${guide.slug}`,
    mainEntityOfPage: `${SITE.base}/guides/${guide.slug}`,
    author: { '@type': 'Person', name: MAINTAINER.name, url: MAINTAINER.url, sameAs: PERSON_SAME_AS },
    publisher: {
      '@type': 'Organization',
      name: 'HookStack',
      url: SITE.base,
      logo: { '@type': 'ImageObject', url: `${SITE.base}/web-app-manifest-512x512.png` },
    },
  }

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: guide.faq.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'HookStack', item: SITE.base },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE.base}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `${SITE.base}/guides/${guide.slug}` },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* GuidePage */}
      <article data-component="GuidePage" className="mx-auto max-w-3xl px-4 py-10">
        <Link href="/guides" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="size-4" /> All guides
        </Link>

        <h1 className="mb-3 text-3xl font-bold text-white">{guide.title}</h1>
        <p className="mb-8 text-xs uppercase tracking-wide text-zinc-500">
          {guide.readingMinutes} min read · Reviewed {guide.dateModified}
        </p>

        {guide.intro.map((p) => (
          <p key={p} className="mb-4 text-lg leading-relaxed text-zinc-300">
            {p}
          </p>
        ))}

        {guide.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="mb-3 text-xl font-semibold text-white">{section.heading}</h2>
            {section.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </section>
        ))}

        {/* GuidePage-faq */}
        <section className="mt-12" aria-labelledby="guide-faq">
          <h2 id="guide-faq" className="mb-5 text-xl font-semibold text-white">
            Frequently asked questions
          </h2>
          <dl className="space-y-0">
            {guide.faq.map(({ q, a }) => (
              <div key={q} className="border-t border-[var(--color-border)] py-5 last:border-b">
                <dt className="mb-2 font-medium text-white">{q}</dt>
                <dd className="text-sm leading-relaxed text-zinc-400">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* GuidePage-related-hooks */}
        {relatedHooks.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">Related hooks</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {relatedHooks.map((hook) => (
                <li key={hook.slug}>
                  <Link
                    href={`/hook/${hook.slug}`}
                    className="block rounded-lg border border-[var(--color-border)] bg-[#0d0d14] p-3 transition-colors hover:border-[var(--color-text-muted)]"
                  >
                    <span className="block text-sm font-medium text-white">{hook.name}</span>
                    {hook.benefit && <span className="block text-xs text-zinc-500">{hook.benefit}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* GuidePage-sources */}
        <section className="mt-12 border-t border-[var(--color-border)] pt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Sources</h2>
          <ul className="space-y-1.5 text-sm">
            {guide.sources.map((src) => (
              <li key={src.url}>
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand)] hover:underline">
                  {src.label}
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* GuidePage-read-next — internal links to related guides */}
        {readNextGuides.length > 0 && (
          <section className="mt-12 border-t border-[var(--color-border)] pt-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">Read next</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {readNextGuides.map((rg) => (
                <li key={rg.slug}>
                  <Link
                    href={`/guides/${rg.slug}`}
                    className="block rounded-lg border border-[var(--color-border)] bg-[#0d0d14] p-3 transition-colors hover:border-[var(--color-text-muted)]"
                  >
                    <span className="block text-sm font-medium text-white">{rg.title}</span>
                    <span className="mt-1 block text-xs leading-snug text-zinc-500">{rg.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </>
  )
}
