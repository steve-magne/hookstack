import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Header } from '@/components/Header'
import { LocaleProvider } from '@/lib/locale-context'
import { getT, type Locale } from '@/lib/i18n'

const VALID_LOCALES: Locale[] = ['fr', 'en']

export function generateStaticParams() {
  return [{ locale: 'fr' }, { locale: 'en' }]
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const T = getT(locale as Locale)
  const url = `https://claudehooks.vercel.app/${locale}`
  return {
    title: T.metaTitle,
    description: T.metaDescription,
    openGraph: {
      title: T.metaTitle,
      description: T.metaDescription,
      url,
      siteName: 'Claude Hooks',
      locale: locale === 'fr' ? 'fr_FR' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: T.metaTitle,
      description: T.metaDescription,
    },
    alternates: {
      canonical: url,
      languages: {
        en: 'https://claudehooks.vercel.app/en',
        fr: 'https://claudehooks.vercel.app/fr',
      },
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!VALID_LOCALES.includes(locale as Locale)) notFound()
  const T = getT(locale as Locale)

  return (
    <LocaleProvider locale={locale as Locale}>
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--color-border)] py-6 text-center text-sm text-zinc-500">
        {T.footerText}
      </footer>
    </LocaleProvider>
  )
}
