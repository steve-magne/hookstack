import type { Metadata } from 'next'
import './globals.css'
import { MotionProvider } from '@/components/MotionProvider'

export const metadata: Metadata = {
  metadataBase: new URL('https://claudehooks.vercel.app'),
  title: {
    template: '%s | Claude Hooks',
    default: 'Claude Hooks',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen flex flex-col" style={{ position: 'relative', zIndex: 1 }}>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  )
}
