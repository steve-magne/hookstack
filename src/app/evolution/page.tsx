import type { Metadata } from 'next'
import { EvolutionDashboard } from '@/components/EvolutionDashboard'
import { timeline } from '@/lib/timeline'
import { SITE } from '@/lib/site'

const TITLE = 'Evolution — how the HookStack catalogue grows'
const DESCRIPTION =
  `HookStack now ships ${timeline.total} Claude Code hooks, each dogfooded and unit-tested on its own repository. ` +
  'Explore the growth timeline — a contribution-style heatmap and cumulative curve built straight from git history.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: `${TITLE} — HookStack`,
    description: DESCRIPTION,
    url: `${SITE.base}/evolution`,
    siteName: 'HookStack',
    type: 'website',
  },
  alternates: { canonical: `${SITE.base}/evolution` },
}

export default function EvolutionPage() {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'HookStack', item: SITE.base },
      { '@type': 'ListItem', position: 2, name: 'Evolution', item: `${SITE.base}/evolution` },
    ],
  }

  // Dataset schema — signale aux moteurs/IA que la page expose une donnée structurée
  // (croissance du catalogue), renforce le graphe d'entité et l'E-E-A-T.
  const datasetJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'HookStack catalogue growth timeline',
    description: DESCRIPTION,
    url: `${SITE.base}/evolution`,
    creator: { '@type': 'Organization', name: 'HookStack', url: SITE.base },
    temporalCoverage: timeline.firstDate && timeline.lastDate ? `${timeline.firstDate}/${timeline.lastDate}` : undefined,
    variableMeasured: 'Number of Claude Code hooks added to the catalogue over time',
  }

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered JSON-LD from our own data, never user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered JSON-LD from our own data, never user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }} />
      <EvolutionDashboard />
    </>
  )
}
