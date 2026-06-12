import { allHooks } from '@/lib/hooks'
import { guides } from '@/lib/guides'
import { SITE } from '@/lib/site'
import type { MetadataRoute } from 'next'

const BASE = SITE.base

export default function sitemap(): MetadataRoute.Sitemap {
  // Stable content date instead of a build timestamp that churns on every deploy
  // (engines learn to distrust always-fresh lastmod).
  const updated = SITE.contentUpdated

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: updated, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/guides`, lastModified: updated, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/about`, lastModified: updated, changeFrequency: 'yearly', priority: 0.5 },
  ]

  const guidePages: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${BASE}/guides/${g.slug}`,
    lastModified: g.dateModified,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // Deduplicate by slug — guards against any future registry duplication.
  const seenSlugs = new Set<string>()
  const hookPages: MetadataRoute.Sitemap = allHooks
    .filter((hook) => {
      if (seenSlugs.has(hook.slug)) return false
      seenSlugs.add(hook.slug)
      return true
    })
    .map((hook) => ({
      url: `${BASE}/hook/${hook.slug}`,
      lastModified: updated,
      changeFrequency: 'monthly',
      priority: hook.default_on ? 0.9 : 0.7,
    }))

  return [...staticPages, ...guidePages, ...hookPages]
}
