import { NextRequest, NextResponse } from 'next/server'
// First gate only: checks a session cookie exists. Real role checks run server-side in guard()/requireRole().
export function middleware(req: NextRequest) {
  if (req.cookies.has('sid')) return NextResponse.next()
  if (req.nextUrl.pathname.startsWith('/api/')) return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
  return NextResponse.redirect(new URL('/login', req.url))
}
export const config = { matcher: ['/admin/:path*', '/teacher/:path*', '/student/:path*', '/api/admin/:path*'] }
