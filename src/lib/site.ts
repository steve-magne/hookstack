// Site-wide entity constants — single source of truth for the brand entity,
// the maintainer (E-E-A-T), external references and a stable content date.
// Imported by schema (JSON-LD), the sitemap, llms.txt and the footer so the
// entity graph stays consistent across every surface.

export const SITE = {
  base: 'https://www.hookstack.app',
  name: 'HookStack',
  github: 'https://github.com/steve-magne/hookstack',
  npm: 'https://www.npmjs.com/package/hookstack-cli',
  // Authoritative Anthropic documentation for the Claude Code hooks lifecycle —
  // cited from hook pages and guides as an external source (GEO trust signal).
  claudeCodeHooksDocs: 'https://docs.claude.com/en/docs/claude-code/hooks',
  foundingDate: '2025',
  // Last meaningful content review. Used for sitemap `lastModified` and the
  // visible "reviewed" dates instead of a build timestamp that churns on every
  // deploy (which search engines learn to distrust).
  contentUpdated: '2026-06-12',
} as const

export const MAINTAINER = {
  name: 'Steve Magné',
  role: 'Creator & maintainer',
  github: 'https://github.com/steve-magne',
  linkedin: 'https://www.linkedin.com/in/steve-magne/',
  url: 'https://github.com/steve-magne',
} as const

// Where to send people. Feedback / ideas → a GitHub issue; reach the maintainer
// directly → LinkedIn.
export const ISSUES_URL = `${SITE.github}/issues`

// `sameAs` links for the Organization entity — strengthens the entity graph that
// AI engines use to recognise and attribute the brand.
export const SAME_AS: string[] = [SITE.github, SITE.npm, MAINTAINER.github, MAINTAINER.linkedin]

// `sameAs` links for the maintainer (Person) entity — used by founder/author schema.
export const PERSON_SAME_AS: string[] = [MAINTAINER.github, MAINTAINER.linkedin]

// Build a GitHub source URL for a hook script path (e.g. ".claude/hooks/x.mjs").
export function hookSourceUrl(scriptPath?: string): string | null {
  if (!scriptPath) return null
  return `${SITE.github}/blob/main/${scriptPath.replace(/^\.?\//, '')}`
}
