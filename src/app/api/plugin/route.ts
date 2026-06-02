import { type NextRequest, NextResponse } from 'next/server'
import { allHooks } from '@/lib/hooks'
import { toPluginFiles } from '@/lib/hookExports'
import { buildZip } from '@/lib/zip'

export async function GET(req: NextRequest) {
  const slugs = req.nextUrl.searchParams.get('hooks')?.split(',').filter(Boolean) ?? []

  if (slugs.length === 0) {
    return NextResponse.json({ error: 'No hooks specified' }, { status: 400 })
  }

  const selected = allHooks.filter(h => slugs.includes(h.slug))

  if (selected.length === 0) {
    return NextResponse.json({ error: 'No matching hooks found' }, { status: 404 })
  }

  const files = toPluginFiles(selected)
  const zip = buildZip(files)

  return new NextResponse(zip.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="hookstack-plugin.zip"',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
