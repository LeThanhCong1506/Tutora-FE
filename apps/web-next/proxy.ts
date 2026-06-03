import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NextJS proxy — pass-through.
 *
 * Auth gating is handled client-side by <ProtectedRoute> in the Vite app
 * (src/components/ProtectedRoute). Edge middleware here cannot read the
 * localStorage-backed TUTORA_user_data, so it is not the right layer to
 * gate portal routes. The previous cookie-based check always failed (no
 * code ever wrote that cookie) and redirected legitimate users to /login.
 *
 * Path rewriting to the Vite app lives in next.config.ts rewrites().
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, sitemap.xml
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
