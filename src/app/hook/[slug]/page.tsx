import { CategoryBadge, HookTypeBadge } from '@/components/Badge'
import { HookSelectButton } from '@/components/HookSelectButton'
import { allHooks, getHookBySlug } from '@/lib/hooks'
import { T } from '@/lib/i18n'
import { PROVIDER_LABELS } from '@/types/hook'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

const BASE = 'https://hookstack.vercel.app'

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

  return {
    title: hook.name,
    description: hook.description,
    keywords: hook.tags.join(', '),
    openGraph: {
      title: hook.name,
      description: hook.description,
      url: `${BASE}/hook/${slug}`,
      siteName: 'HookStack',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: hook.name,
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
    keywords: hook.tags.join(', '),
    programmingLanguage: 'JavaScript',
    url: `${BASE}/hook/${hook.slug}`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'HookStack',
      url: BASE,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="size-4" /> {T.backToCatalogue}
        </Link>

        <div className="mb-4 flex items-center gap-2">
          <CategoryBadge category={hook.category} />
          <HookTypeBadge type={hook.hook_type} trigger={hook.trigger} />
        </div>

        <h1 className="mb-3 text-3xl font-bold text-white">{hook.name}</h1>
        <p className="mb-6 text-lg text-zinc-300">{hook.description}</p>

        <HookSelectButton slug={hook.slug} />

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
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
              {T.providersAndTags}
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
            {T.settingsFragment}
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
    </>
  )
}
