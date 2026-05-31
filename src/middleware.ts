import { NextRequest, NextResponse } from 'next/server'

// Redirect old locale-prefixed URLs to root
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const match = pathname.match(/^\/(fr|en)(\/.*)?$/)
  if (match) {
    const rest = match[2] ?? '/'
    request.nextUrl.pathname = rest
    return NextResponse.redirect(request.nextUrl)
  }
}

export const config = {
  matcher: ['/((?!_next|_vercel|favicon.ico|api/|.*\\..*).*)'],
}
