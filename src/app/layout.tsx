import type { Metadata } from 'next'
import './globals.css'
import { MotionProvider } from '@/components/MotionProvider'
import { Header } from '@/components/Header'
import { T } from '@/lib/i18n'

export const metadata: Metadata = {
  metadataBase: new URL('https://claudehooks.vercel.app'),
  title: {
    template: '%s | Claude Hooks',
    default: 'Claude Hooks',
  },
  description: T.metaDescription,
  robots: { index: true, follow: true },
  openGraph: {
    siteName: 'Claude Hooks',
    locale: 'en_US',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
        <MotionProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--color-border)] py-6 text-center text-sm text-zinc-500">
            {T.footerText}
          </footer>
        </MotionProvider>
      </body>
    </html>
  )
}
