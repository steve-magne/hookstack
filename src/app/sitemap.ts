import { allHooks } from '@/lib/hooks'
import type { MetadataRoute } from 'next'

const BASE = 'https://claudehooks.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${BASE}/contribute`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ]

  const hookPages = allHooks.map((hook) => ({
    url: `${BASE}/hook/${hook.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...hookPages]
}
