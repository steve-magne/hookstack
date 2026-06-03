import Link from 'next/link'

export function Header() {
  return (
    <header data-component="Header" className="border-b border-[var(--color-border)] bg-[#0a0a0a]/80 backdrop-blur">
      <div data-component="HeaderInner" className="mx-auto flex max-w-6xl items-center px-4 py-3">
        <Link data-component="HeaderLogo" href="/" className="inline-flex items-center" aria-label="HookStack — home">
          <span className="text-base font-semibold tracking-tight text-white">
            Hook<span className="text-indigo-400">Stack</span>
          </span>
        </Link>
      </div>
    </header>
  )
}
