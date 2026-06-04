import { type NextRequest, NextResponse } from 'next/server'
import { allHooks } from '@/lib/hooks'

export async function GET(req: NextRequest) {
  const slugs = req.nextUrl.searchParams.get('slugs')?.split(',').filter(Boolean) ?? []

  if (slugs.length === 0) {
    const catalog = allHooks.map(h => ({
      slug: h.slug,
      name: h.name,
      category: h.category,
      benefit: h.benefit ?? null,
    }))
    return NextResponse.json(
      { hooks: catalog },
      { headers: { 'Cache-Control': 'public, max-age=300' } },
    )
  }

  const hooks = allHooks
    .filter(h => slugs.includes(h.slug))
    .map(h => ({
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
    { hooks },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
