'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Webhook } from 'lucide-react'
import { useT } from '@/lib/locale-context'

export function Header() {
  const pathname = usePathname()
  const T = useT()

  const linkClass = (path: string) => {
    const active = pathname === path || (path === '/' && pathname === '/')
    return `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? 'bg-[var(--color-surface-2)] text-white'
        : 'text-zinc-400 hover:text-white'
    }`
  }

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Webhook className="size-6 text-white" />
          <span className="hidden text-lg sm:inline">Claude Hooks</span>
        </Link>

        <nav className="ml-2 flex items-center gap-0.5 sm:ml-6 sm:gap-1">
          <Link href="/" className={linkClass('/')}>
            {T.navCatalogue}
          </Link>
          <Link href="/contribute" className={linkClass('/contribute')}>
            {T.navContribute}
          </Link>
        </nav>
      </div>
    </header>
  )
}
