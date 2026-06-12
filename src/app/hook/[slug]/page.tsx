import { CategoryBadge, HookTypeBadge } from '@/components/Badge'
import { HookSelectButton } from '@/components/HookSelectButton'
import { HookDetailTracker } from '@/components/HookDetailTracker'
import { allHooks, getHookBySlug } from '@/lib/hooks'
import { T, SEO_KEYWORDS } from '@/lib/i18n'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

const BASE = 'https://hookstack.app'

export async function generateStaticParams() {
  return allHooks.map((hook) => ({ slug: hook.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const hook = getHookBySlug(slug)
  if (!hook) return {}

  const keywords = [...SEO_KEYWORDS, ...hook.tags]

  return {
    title: hook.name,
    description: hook.description,
    keywords,
    openGraph: {
      title: `${hook.name} — HookStack`,
      description: hook.description,
      url: `${BASE}/hook/${slug}`,
      siteName: 'HookStack',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `${hook.name} — HookStack`,
      description: hook.description,
    },
    alternates: { canonical: `${BASE}/hook/${slug}` },
  }
}

export default async function HookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const hook = getHookBySlug(slug)

  if (!hook) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-zinc-400">
        <p>{T.hookNotFound}</p>
        <Link href="/" className="mt-4 inline-block text-indigo-300 underline">
          {T.backToCatalogue}
        </Link>
      </div>
    )
  }

  const settingsFragment = JSON.stringify(hook.implementation.config, null, 2)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: hook.name,
    description: hook.description,
    keywords: [...SEO_KEYWORDS, ...hook.tags].join(', '),
    programmingLanguage: 'JavaScript',
    url: `${BASE}/hook/${hook.slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'HookStack',
      url: BASE,
    },
  }

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'HookStack', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Hooks', item: `${BASE}/#catalogue` },
      { '@type': 'ListItem', position: 3, name: hook.name, item: `${BASE}/hook/${hook.slug}` },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <HookDetailTracker slug={hook.slug} name={hook.name} category={hook.category} event={hook.hook_type} />
      {/* HookDetailPage */}
      <div data-component="HookDetailPage" className="mx-auto max-w-3xl px-4 py-8">
        {/* HookDetailPage-back */}
        <Link
          data-component="HookDetailPage-back"
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="size-4" /> {T.backToCatalogue}
        </Link>

        {/* HookDetailPage-badges */}
        <div data-component="HookDetailPage-badges" className="mb-4 flex items-center gap-2">
          <CategoryBadge category={hook.category} />
          <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
        </div>

        <h1 className="mb-3 text-3xl font-bold text-white">{hook.name}</h1>
        <p className="mb-6 text-lg text-zinc-300">{hook.description}</p>

        {/* HookSelectButton */}
        <HookSelectButton slug={hook.slug} />

        {/* HookDetailPage-details-grid */}
        <div data-component="HookDetailPage-details-grid" className="grid gap-6 sm:grid-cols-2">
          {/* HookDetailPage-use-cases */}
          <div data-component="HookDetailPage-use-cases">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              {T.useCases}
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
              {T.tags}
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {hook.tags.map((t) => (
                <span key={t} className="text-xs text-zinc-500">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* HookDetailPage-settings-fragment */}
        <div data-component="HookDetailPage-settings-fragment" className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            {T.settingsFragment}
          </h2>
          <pre className="overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
            <code>{settingsFragment}</code>
          </pre>
        </div>

        {/* HookDetailPage-code-snippet */}
        {hook.implementation.code_snippet && (
          <div data-component="HookDetailPage-code-snippet" className="mt-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Script · {hook.implementation.script_path}
            </h2>
            <pre className="overflow-auto rounded-xl border border-[var(--color-border)] bg-[#0d0d14] p-4 text-xs text-zinc-200">
              <code>{hook.implementation.code_snippet}</code>
            </pre>
          </div>
        )}
      </div>
    </>
  )
}
