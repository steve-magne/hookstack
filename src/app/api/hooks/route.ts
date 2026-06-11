import { type NextRequest, NextResponse } from 'next/server'
import { allHooks } from '@/lib/hooks'

export async function GET(req: NextRequest) {
  const slugs = req.nextUrl.searchParams.get('slugs')?.split(',').filter(Boolean) ?? []

  const source = slugs.length === 0
    ? allHooks.filter(h => h.default_on)
    : allHooks.filter(h => slugs.includes(h.slug))

  const hooks = source
    .map(h => ({
      slug: h.slug,
      name: h.name,
      benefit: h.benefit ?? null,
      category: h.category,
      hook_type: h.hook_type,
      trigger: h.trigger,
      config: (h.implementation.config as { hooks?: unknown }).hooks
        ? { hooks: (h.implementation.config as { hooks: unknown }).hooks }
        : null,
      script_path: h.implementation.script_path ?? null,
      code_snippet: h.implementation.code_snippet ?? null,
      test_snippet: h.implementation.test_snippet ?? null,
      security: h.implementation.security ?? null,
    }))

  return NextResponse.json(
    { hooks },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
