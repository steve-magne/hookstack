import { describe, it, expect } from 'vitest'
import { SITE, MAINTAINER, SAME_AS, PERSON_SAME_AS, ISSUES_URL, hookSourceUrl } from '@/lib/site'

describe('hookSourceUrl', () => {
  it('returns null when no script path is given', () => {
    expect(hookSourceUrl()).toBeNull()
    expect(hookSourceUrl(undefined)).toBeNull()
  })

  it('builds a GitHub blob URL from a dotted script path', () => {
    expect(hookSourceUrl('.claude/hooks/detect-secrets.mjs')).toBe(
      `${SITE.github}/blob/main/.claude/hooks/detect-secrets.mjs`,
    )
  })

  it('strips a leading "./" or "/" from the path', () => {
    expect(hookSourceUrl('./.claude/hooks/x.mjs')).toBe(`${SITE.github}/blob/main/.claude/hooks/x.mjs`)
    expect(hookSourceUrl('/.claude/hooks/x.mjs')).toBe(`${SITE.github}/blob/main/.claude/hooks/x.mjs`)
  })

  it('handles a path with no leading separator', () => {
    expect(hookSourceUrl('claude/hooks/x.mjs')).toBe(`${SITE.github}/blob/main/claude/hooks/x.mjs`)
  })
})

describe('site constants', () => {
  it('exposes an https base URL', () => {
    expect(SITE.base).toMatch(/^https:\/\//)
  })

  it('lists GitHub and npm in sameAs (entity graph)', () => {
    expect(SAME_AS).toContain(SITE.github)
    expect(SAME_AS).toContain(SITE.npm)
  })

  it('names a maintainer with a profile URL (E-E-A-T)', () => {
    expect(MAINTAINER.name.length).toBeGreaterThan(0)
    expect(MAINTAINER.url).toMatch(/^https:\/\//)
    expect(MAINTAINER.linkedin).toMatch(/^https:\/\/www\.linkedin\.com\//)
  })

  it('includes the maintainer LinkedIn in both entity graphs', () => {
    expect(SAME_AS).toContain(MAINTAINER.linkedin)
    expect(PERSON_SAME_AS).toEqual(expect.arrayContaining([MAINTAINER.github, MAINTAINER.linkedin]))
  })

  it('points feedback to the repo issues', () => {
    expect(ISSUES_URL).toBe(`${SITE.github}/issues`)
  })

  it('uses a stable ISO content date, not a build timestamp', () => {
    expect(SITE.contentUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
