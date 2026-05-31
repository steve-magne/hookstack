'use client'

import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-bg)]/80 backdrop-blur">
      <div className="px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-white">
          Claude Hooks
        </Link>
      </div>
    </header>
  )
}
