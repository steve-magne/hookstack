'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Webhook } from 'lucide-react'
import { useSelection } from '@/store/selection'
import { useLocale, useT } from '@/lib/locale-context'
import type { Locale } from '@/lib/i18n'

export function Header() {
  const count = useSelection((s) => s.selected.length)
  const pathname = usePathname()
  const locale = useLocale()
  const T = useT()

  const pathnameWithoutLocale = pathname.replace(/^\/(fr|en)/, '') || '/'

  const linkClass = (path: string) => {
    const fullPath = `/${locale}${path === '/' ? '' : path}`
    const active = pathname === fullPath || (path === '/' && pathname === `/${locale}`)
    return `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-[var(--color-surface-2)] text-white'
        : 'text-zinc-400 hover:text-white'
    }`
  }

  const localeSwitcher = (targetLocale: Locale) => `/${targetLocale}${pathnameWithoutLocale === '/' ? '' : pathnameWithoutLocale}`

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href={`/${locale}`} className="flex items-center gap-2 font-semibold">
          <Webhook className="size-6 text-white" />
          <span className="text-lg">Claude Hooks</span>
        </Link>

        <nav className="ml-6 flex items-center gap-1">
          <Link href={`/${locale}`} className={linkClass('/')}>
            {T.navCatalogue}
          </Link>
          <Link href={`/${locale}/contribute`} className={linkClass('/contribute')}>
            {T.navContribute}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {count > 0 && (
            <a
              href="#config"
              className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white ring-1 ring-white/20"
            >
              {count} {count > 1 ? T.hooksSelectedMany : T.hooksSelectedOne}
            </a>
          )}

          <div className="flex items-center rounded-lg border border-[var(--color-border)] text-xs font-medium overflow-hidden">
            <Link
              href={localeSwitcher('fr')}
              className={`px-2.5 py-1.5 transition-colors ${locale === 'fr' ? 'bg-[var(--color-surface-2)] text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              FR
            </Link>
            <span className="border-r border-[var(--color-border)] h-4" />
            <Link
              href={localeSwitcher('en')}
              className={`px-2.5 py-1.5 transition-colors ${locale === 'en' ? 'bg-[var(--color-surface-2)] text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              EN
            </Link>
          </div>

        </div>
      </div>
    </header>
  )
}
