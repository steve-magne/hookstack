import { type NextRequest, NextResponse } from 'next/server'
import { allHooks } from '@/lib/hooks'

export async function GET(req: NextRequest) {
  const slugs = req.nextUrl.searchParams.get('slugs')?.split(',').filter(Boolean) ?? []

  if (slugs.length === 0) {
    return NextResponse.json({ error: 'No slugs specified' }, { status: 400 })
  }

  const hooks = allHooks
    .filter(h => slugs.includes(h.slug))
    .map(h => ({
      slug: h.slug,
      name: h.name,
      config: (h.implementation.config as { hooks?: unknown }).hooks
        ? { hooks: (h.implementation.config as { hooks: unknown }).hooks }
        : null,
      script_path: h.implementation.script_path ?? null,
      code_snippet: h.implementation.code_snippet ?? null,
    }))

  return NextResponse.json(
    { hooks },
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  )
}
