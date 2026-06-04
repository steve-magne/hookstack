import { type NextRequest, NextResponse } from 'next/server'
import { allHooks } from '@/lib/hooks'

export async function GET(req: NextRequest) {
  const slugs = req.nextUrl.searchParams.get('slugs')?.split(',').filter(Boolean) ?? []

  // No slugs → serve the default recommended set (the `is_must` hooks). This is
  // what `npx hookstack-cli@latest install` (no --hooks) installs, matching the
  // promise made by the site's install banner.
  const isDefault = slugs.length === 0
  const selected = isDefault
    ? allHooks.filter(h => h.is_must)
    : allHooks.filter(h => slugs.includes(h.slug))

  const hooks = selected.map(h => ({
    slug: h.slug,
    name: h.name,
    category: h.category,
    hook_type: h.hook_type,
    trigger: h.trigger,
    config: (h.implementation.config as { hooks?: unknown }).hooks
      ? { hooks: (h.implementation.config as { hooks: unknown }).hooks }
      : null,
    script_path: h.implementation.script_path ?? null,
    code_snippet: h.implementation.code_snippet ?? null,
    security: h.implementation.security ?? null,
    community_examples: (h.community_examples ?? []).map(c => ({ repo: c.repo })),
  }))

  return NextResponse.json(
    { hooks, default: isDefault },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
