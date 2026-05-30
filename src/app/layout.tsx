import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/Header'

export const metadata: Metadata = {
  title: 'Hookit — Catalogue de hooks agentiques',
  description: 'Catalogue communautaire de hooks pour Claude Code & GitHub Copilot',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-[var(--color-border)] py-6 text-center text-sm text-zinc-500">
          Hookit — POC v0.1 · Catalogue communautaire de hooks agentiques
        </footer>
      </body>
    </html>
  )
}
