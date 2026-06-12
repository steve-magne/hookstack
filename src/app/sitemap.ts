import { allHooks } from '@/lib/hooks'
import type { MetadataRoute } from 'next'

const BASE = 'https://www.hookstack.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE}/contribute`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  const hookPages: MetadataRoute.Sitemap = allHooks.map((hook) => ({
    url: `${BASE}/hook/${hook.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: hook.default_on ? 0.9 : 0.7,
  }))

  return [...staticPages, ...hookPages]
}
